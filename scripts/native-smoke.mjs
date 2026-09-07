/* global process, console, setTimeout, fetch, window */
import assert from "node:assert/strict"
import { spawn, execFileSync } from "node:child_process"
import { once } from "node:events"
import { copyFile, readFile, mkdir } from "node:fs/promises"
import { fileURLToPath, URL } from "node:url"
import path from "node:path"
import { chromium } from "@playwright/test"

const root = fileURLToPath(new URL("../", import.meta.url))
assert.equal(process.platform, "win32", "Native smoke test requires Windows")
const running = execFileSync("powershell.exe", ["-NoProfile", "-Command", "@(Get-Process -Name markdown_studio,markdown-studio-* -ErrorAction SilentlyContinue).Count"], { encoding: "utf8", windowsHide: true }).trim()
assert.equal(Number(running), 0, "Close existing Markdown Studio windows before running native QA")
const target = path.join(root, "src-tauri", "target")
const qaDir = path.join(target, "native-qa")
const port = Number(process.env.MD_QA_PORT ?? 9222)
const endpoint = "http://127.0.0.1:" + port
const storePath = path.join(process.env.APPDATA, "com.markdownstudio.desktop", "preferences.json")
const backup = path.join(qaDir, "preferences-before.json")
await mkdir(qaDir, { recursive: true })
// This smoke test runs only against its own built process and temporary document.
try {
  await fetch(endpoint + "/json/version")
  throw new Error("QA debugging port is already in use; select another MD_QA_PORT")
} catch (error) {
  if (error.message.startsWith("QA debugging")) throw error
}
const originalStore = await readFile(storePath)
await copyFile(storePath, backup)
const app = spawn(path.join(target, "release", "markdown_studio.exe"), [], {
  cwd: root, windowsHide: true,
  env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: "--remote-debugging-port=" + port + " --remote-debugging-address=127.0.0.1" },
  stdio: ["ignore", "pipe", "pipe"],
})
let appLog = ""
app.stdout.on("data", (data) => { appLog += data })
app.stderr.on("data", (data) => { appLog += data })
let browser
try {
  let connected = false
  for (let attempt = 0; attempt < 100; attempt++) {
    if (app.exitCode !== null) throw new Error("QA process exited: " + appLog)
    try { await fetch(endpoint + "/json/version"); connected = true; break } catch { await new Promise((resolve) => setTimeout(resolve, 100)) }
  }
  assert.ok(connected, "WebView2 debugging endpoint must be reachable")
  browser = await chromium.connectOverCDP(endpoint)
  const context = browser.contexts()[0]
  const page = context.pages()[0] ?? await context.waitForEvent("page")
  page.setDefaultTimeout(10000)
  await page.getByRole("button", { name: "新建文档", exact: true }).waitFor()
  const file = path.join(qaDir, "document-" + Date.now() + ".md")
  const firstFile = file.replace(/\.md$/, "-first.md")
  await page.evaluate(async ({ file, firstFile }) => {
    const invoke = window.__TAURI_INTERNALS__.invoke
    const longBody = "\r\n\r\nParagraph ".repeat(200)
    await invoke("write_markdown_file", { path: firstFile, content: "# First document" + longBody })
    await invoke("write_markdown_file", { path: file, content: "# Original" + longBody })
    const rid = await invoke("plugin:store|load", { path: "preferences.json", options: { autoSave: false } })
    const [preferences] = await invoke("plugin:store|get", { rid, key: "preferences" })
    await invoke("plugin:store|set", { rid, key: "preferences", value: { ...preferences, viewMode: "split", recentFiles: [firstFile, file] } })
    await invoke("plugin:store|save", { rid })
  }, { file, firstFile })
  await page.reload()
  await page.getByRole("button", { name: "最近文件", exact: true }).click()
  await page.getByTitle(firstFile, { exact: true }).click()
  await page.getByRole("heading", { name: "First document", exact: true }).waitFor()
  await page.locator(".markdown-preview").evaluate((element) => { element.scrollTop = 1200 })
  assert.equal(await page.locator(".markdown-preview").evaluate((element) => element.scrollTop), 1200)
  await page.getByRole("button", { name: "最近文件", exact: true }).click()
  await page.getByTitle(file, { exact: true }).click()
  await page.getByRole("heading", { name: "Original", exact: true }).waitFor()
  assert.equal(await page.locator(".markdown-preview").evaluate((element) => element.scrollTop), 0)
  const expected = "# Native QA\n\nUTF-8 中文测试"
  await page.locator(".cm-content").fill(expected)
  const nativeClose = () => page.evaluate(() => window.__TAURI_INTERNALS__.invoke("plugin:window|close", { label: window.__TAURI_INTERNALS__.metadata.currentWindow.label }))
  await nativeClose()
  await page.getByRole("alertdialog").waitFor()
  await page.getByRole("button", { name: "取消", exact: true }).click()
  assert.equal((await page.locator(".cm-content .cm-line").allTextContents()).join("\n"), expected)
  await nativeClose()
  await page.getByRole("alertdialog").waitFor()
  const exited = once(app, "exit")
  await page.getByRole("button", { name: "保存", exact: true }).click()
  const [exitCode] = await Promise.race([exited, new Promise((_, reject) => {
    const timeout = setTimeout(() => reject(new Error("Native close timed out")), 10000)
    timeout.unref()
  })])
  assert.equal(exitCode, 0)
  assert.equal(await readFile(file, "utf8"), expected.replaceAll("\n", "\r\n"))
  console.log("PASS: native file switching resets preview scroll; close -> cancel retains content; save -> UTF-8/CRLF disk write -> process exits with code 0")
  console.log("Verified file: " + file)
} finally {
  if (app.exitCode === null) {
    const exited = once(app, "exit")
    app.kill()
    await exited
  }
  if (browser?.isConnected()) await browser.close().catch(() => undefined)
  await copyFile(backup, storePath)
  assert.deepEqual(await readFile(storePath), originalStore)
  console.log("Application preferences restored byte-for-byte")
}
