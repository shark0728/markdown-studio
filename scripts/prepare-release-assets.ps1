param(
    [string]$Version = "",
    [string]$OutputDirectory = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot ".." )).Path
$packageJsonPath = Join-Path $projectRoot "package.json"
$package = Get-Content -Raw -LiteralPath $packageJsonPath | ConvertFrom-Json

if ([string]::IsNullOrWhiteSpace($Version)) {
    $Version = [string]$package.version
}

if ($Version -notmatch '^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$') {
    throw "Version must be a semantic version, received: $Version"
}

$bundleRoot = Join-Path $projectRoot "src-tauri\target\release"
$sourceFiles = [ordered]@{
    (Join-Path $bundleRoot "markdown_studio.exe") = "markdown-studio-$Version.exe"
    (Join-Path $bundleRoot "bundle\msi\Markdown Studio_${Version}_x64_en-US.msi") = "markdown-studio-$Version-x64.msi"
    (Join-Path $bundleRoot "bundle\nsis\Markdown Studio_${Version}_x64-setup.exe") = "markdown-studio-$Version-x64-setup.exe"
}

if ([string]::IsNullOrWhiteSpace($OutputDirectory)) {
    $OutputDirectory = Join-Path $bundleRoot "release-assets"
} elseif (-not [System.IO.Path]::IsPathRooted($OutputDirectory)) {
    $OutputDirectory = Join-Path $projectRoot $OutputDirectory
}

$outputPath = [System.IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Path $outputPath -Force | Out-Null

foreach ($source in $sourceFiles.Keys) {
    if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
        throw "Release source file not found: $source"
    }

    $destination = Join-Path $outputPath $sourceFiles[$source]
    Copy-Item -LiteralPath $source -Destination $destination -Force
    $sourceLength = (Get-Item -LiteralPath $source).Length
    $destinationLength = (Get-Item -LiteralPath $destination).Length
    if ($sourceLength -ne $destinationLength) {
        throw "Copied asset size mismatch: $destination"
    }

    $hash = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash
    "{0}`t{1}`t{2}" -f $destination, $destinationLength, $hash
}

"Prepared release assets in: $outputPath"
