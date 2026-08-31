use std::path::Path;

fn ensure_markdown_path(path: &Path) -> Result<(), String> {
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .map(str::to_ascii_lowercase);
    match extension.as_deref() {
        Some("md" | "markdown") => Ok(()),
        _ => Err("仅支持 .md 和 .markdown 文件".to_string()),
    }
}

#[tauri::command]
fn read_markdown_file(path: String) -> Result<String, String> {
    let path = Path::new(&path);
    ensure_markdown_path(path)?;
    std::fs::read_to_string(path).map_err(|error| format!("读取失败：{error}"))
}

#[tauri::command]
fn write_markdown_file(path: String, content: String) -> Result<(), String> {
    let path = Path::new(&path);
    ensure_markdown_path(path)?;
    std::fs::write(path, content).map_err(|error| format!("写入失败：{error}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![read_markdown_file, write_markdown_file])
        .run(tauri::generate_context!())
        .expect("error while running Markdown Studio");
}

#[cfg(test)]
mod tests {
    use super::ensure_markdown_path;
    use std::path::Path;

    #[test]
    fn accepts_markdown_extensions_case_insensitively() {
        assert!(ensure_markdown_path(Path::new("note.md")).is_ok());
        assert!(ensure_markdown_path(Path::new("NOTE.MARKDOWN")).is_ok());
    }

    #[test]
    fn rejects_non_markdown_extensions() {
        assert!(ensure_markdown_path(Path::new("secrets.txt")).is_err());
        assert!(ensure_markdown_path(Path::new("no-extension")).is_err());
    }
}
