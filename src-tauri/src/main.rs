#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use image::GenericImageView;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use tauri::Emitter;

#[derive(Debug, Serialize, Deserialize)]
struct FolderInfo {
    name: String,
    path: String,
    files: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ComparisonResult {
    filename: String,
    iou_scores: HashMap<String, f64>,
    accuracy_scores: HashMap<String, f64>,
    paths: HashMap<String, String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ValidationResult {
    is_valid: bool,
    common_files: Vec<String>,
    missing_files: HashMap<String, Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct ProgressEvent {
    current: usize,
    total: usize,
    percentage: f64,
    current_file: String,
}

// 获取文件夹中的所有图片文件
fn get_image_files(dir_path: &str) -> Result<Vec<String>, String> {
    let path = Path::new(dir_path);
    if !path.exists() {
        return Err(format!("文件夹不存在: {}", dir_path));
    }

    let mut files = Vec::new();
    let valid_extensions = vec!["jpg", "jpeg", "png", "bmp", "tiff", "webp"];

    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries {
            if let Ok(entry) = entry {
                let path = entry.path();
                if path.is_file() {
                    if let Some(extension) = path.extension() {
                        if let Some(ext_str) = extension.to_str() {
                            if valid_extensions.contains(&ext_str.to_lowercase().as_str()) {
                                if let Some(filename) = path.file_name() {
                                    if let Some(name) = filename.to_str() {
                                        files.push(name.to_string());
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    files.sort();
    Ok(files)
}

// 计算两个图片的IOU
fn calculate_iou(img1_path: &str, img2_path: &str) -> Result<f64, String> {
    let img1 = image::open(img1_path).map_err(|e| format!("无法打开图片1: {}", e))?;
    let img2 = image::open(img2_path).map_err(|e| format!("无法打开图片2: {}", e))?;

    // 这里简化IOU计算，实际应用中需要根据您的具体需求进行调整
    // 假设图片是分割掩码，计算像素级IOU
    let (width1, height1) = img1.dimensions();
    let (width2, height2) = img2.dimensions();

    if width1 != width2 || height1 != height2 {
        return Err(format!(
            "图片尺寸: {}x{} 对 {}x{} 不匹配: {} vs {}",
            width1, height1, width2, height2, img1_path, img2_path
        ));
    }

    let img1_gray = img1.to_luma8();
    let img2_gray = img2.to_luma8();

    let mut intersection = 0u32;
    let mut union = 0u32;

    for y in 0..height1 {
        for x in 0..width1 {
            let pixel1 = img1_gray.get_pixel(x, y)[0] > 128;
            let pixel2 = img2_gray.get_pixel(x, y)[0] > 128;

            if pixel1 && pixel2 {
                intersection += 1;
            }
            if pixel1 || pixel2 {
                union += 1;
            }
        }
    }

    if union == 0 {
        Ok(1.0) // 如果两个图片都是空的，IOU为1
    } else {
        Ok(intersection as f64 / union as f64)
    }
}

// 计算两个图片的准确率
fn calculate_accuracy(img1_path: &str, img2_path: &str) -> Result<f64, String> {
    let img1 = image::open(img1_path).map_err(|e| format!("无法打开图片1: {}", e))?;
    let img2 = image::open(img2_path).map_err(|e| format!("无法打开图片2: {}", e))?;

    let (width1, height1) = img1.dimensions();
    let (width2, height2) = img2.dimensions();

    if width1 != width2 || height1 != height2 {
        return Err("图片尺寸不匹配".to_string());
    }

    let img1_gray = img1.to_luma8();
    let img2_gray = img2.to_luma8();

    let mut correct_pixels = 0u32;
    let total_pixels = (width1 * height1) as u32;

    for y in 0..height1 {
        for x in 0..width1 {
            let pixel1 = img1_gray.get_pixel(x, y)[0] > 128;
            let pixel2 = img2_gray.get_pixel(x, y)[0] > 128;

            // 如果两个像素的分类相同（都是前景或都是背景），则为正确
            if pixel1 == pixel2 {
                correct_pixels += 1;
            }
        }
    }

    Ok(correct_pixels as f64 / total_pixels as f64)
}

#[tauri::command]
async fn select_folder(app_handle: tauri::AppHandle) -> Result<String, String> {
    use tauri_plugin_dialog::DialogExt;
    
    // 创建一个 oneshot channel 来等待结果
    let (tx, rx) = tokio::sync::oneshot::channel();
    
    app_handle
        .dialog()
        .file()
        .set_title("选择文件夹")
        .pick_folder(move |folder_path| {
            let _ = tx.send(folder_path);
        });
    
    // 等待回调完成
    match rx.await {
        Ok(Some(path)) => {
            if let Some(path_str) = path.as_path().and_then(|p| p.to_str()) {
                Ok(path_str.to_string())
            } else {
                Err("无法获取文件夹路径".to_string())
            }
        }
        Ok(None) => Err("用户取消选择".to_string()),
        Err(_) => Err("对话框操作失败".to_string()),
    }
}

#[tauri::command]
async fn is_file(path: String) -> Result<bool, String> {
    let path = Path::new(&path);
    Ok(path.is_file())
}

#[tauri::command]
async fn get_folder_files(path: String) -> Result<Vec<String>, String> {
    get_image_files(&path)
}

#[tauri::command]
async fn validate_folders(folders: Vec<String>) -> Result<ValidationResult, String> {
    if folders.len() < 3 {
        return Err("至少需要选择3个文件夹".to_string());
    }

    let mut folder_files = Vec::new();
    let folder_types = ["原始图片", "GT", "我的实验数据"];

    // 获取每个文件夹的文件列表
    for (index, folder) in folders.iter().enumerate() {
        match get_image_files(folder) {
            Ok(files) => folder_files.push(files),
            Err(_err) => {
                // 根据文件夹位置确定类型
                let folder_type = if index < folder_types.len() {
                    folder_types[index]
                } else {
                    &format!("对照实验 {}", index - 2)
                };
                return Err(format!("\'{}\' 文件夹不存在: {}", folder_type, folder));
            }
        }
    }

    // 找出所有文件夹共有的文件
    let mut common_files = folder_files[0].clone();
    for files in &folder_files[1..] {
        common_files.retain(|f| files.contains(f));
    }

    // 检查缺失的文件
    let mut missing_files = HashMap::new();
    for (i, folder) in folders.iter().enumerate() {
        let folder_name = Path::new(folder)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("未知")
            .to_string();

        let missing: Vec<String> = common_files
            .iter()
            .filter(|f| !folder_files[i].contains(f))
            .cloned()
            .collect();

        if !missing.is_empty() {
            missing_files.insert(folder_name, missing);
        }
    }

    Ok(ValidationResult {
        is_valid: missing_files.is_empty() && !common_files.is_empty(),
        common_files,
        missing_files,
    })
}

#[derive(Debug, Deserialize)]
struct ComparisonFolderData {
    name: String,
    path: String,
}

#[tauri::command]
async fn calculate_comparisons_with_progress(
    window: tauri::Window,
    original_folder: String,
    gt_folder: String,
    my_folder: String,
    comparison_folders: Vec<ComparisonFolderData>,
    common_files: Vec<String>,
) -> Result<Vec<ComparisonResult>, String> {
    let mut results = Vec::new();
    let total_files = common_files.len();

    for (index, filename) in common_files.iter().enumerate() {
        // 发送进度事件
        let progress = ProgressEvent {
            current: index,
            total: total_files,
            percentage: (index as f64 / total_files as f64) * 100.0,
            current_file: filename.clone(),
        };

        if let Err(e) = window.emit("progress_update", progress) {
            eprintln!("发送进度事件失败: {}", e);
        }

        let original_path = format!("{}/{}", original_folder, filename);
        let gt_path = format!("{}/{}", gt_folder, filename);
        let my_path = format!("{}/{}", my_folder, filename);

        let mut iou_scores = HashMap::new();
        let mut accuracy_scores = HashMap::new();
        let mut paths = HashMap::new();

        // 添加原始图片、GT和我的实验数据路径
        paths.insert("原始图片".to_string(), original_path.clone());
        paths.insert("GT".to_string(), gt_path.clone());
        paths.insert("我的结果".to_string(), my_path.clone());

        // 计算我的结果与GT的IOU和准确率
        match calculate_iou(&gt_path, &my_path) {
            Ok(iou) => {
                iou_scores.insert("我的结果".to_string(), iou);
            }
            Err(e) => {
                eprintln!("计算IOU失败: {}", e);
                iou_scores.insert("我的结果".to_string(), 0.0);
            }
        }

        match calculate_accuracy(&gt_path, &my_path) {
            Ok(accuracy) => {
                accuracy_scores.insert("我的结果".to_string(), accuracy);
            }
            Err(e) => {
                eprintln!("计算准确率失败: {}", e);
                accuracy_scores.insert("我的结果".to_string(), 0.0);
            }
        }

        // 计算对比数据与GT的IOU和准确率
        for comp_folder in comparison_folders.iter() {
            let comp_path = format!("{}/{}", comp_folder.path, filename);
            let comp_name = comp_folder.name.clone();

            paths.insert(comp_name.clone(), comp_path.clone());

            // 计算IOU
            match calculate_iou(&gt_path, &comp_path) {
                Ok(iou) => {
                    iou_scores.insert(comp_name.clone(), iou);
                }
                Err(e) => {
                    eprintln!("计算IOU失败: {}", e);
                    iou_scores.insert(comp_name.clone(), 0.0);
                }
            }

            // 计算准确率
            match calculate_accuracy(&gt_path, &comp_path) {
                Ok(accuracy) => {
                    accuracy_scores.insert(comp_name.clone(), accuracy);
                }
                Err(e) => {
                    eprintln!("计算准确率失败: {}", e);
                    accuracy_scores.insert(comp_name.clone(), 0.0);
                }
            }
        }

        results.push(ComparisonResult {
            filename: filename.clone(),
            iou_scores,
            accuracy_scores,
            paths,
        });
    }

    // 发送完成事件
    let final_progress = ProgressEvent {
        current: total_files,
        total: total_files,
        percentage: 100.0,
        current_file: "计算完成".to_string(),
    };

    if let Err(e) = window.emit("progress_update", final_progress) {
        eprintln!("发送完成事件失败: {}", e);
    }

    Ok(results)
}

#[tauri::command]
async fn calculate_comparisons(
    original_folder: String,
    gt_folder: String,
    my_folder: String,
    comparison_folders: Vec<ComparisonFolderData>,
    common_files: Vec<String>,
) -> Result<Vec<ComparisonResult>, String> {
    let mut results = Vec::new();

    for filename in common_files {
        let original_path = format!("{}/{}", original_folder, filename);
        let gt_path = format!("{}/{}", gt_folder, filename);
        let my_path = format!("{}/{}", my_folder, filename);

        let mut iou_scores = HashMap::new();
        let mut accuracy_scores = HashMap::new();
        let mut paths = HashMap::new();

        // 添加原始图片、GT和我的实验数据路径
        paths.insert("原始图片".to_string(), original_path.clone());
        paths.insert("GT".to_string(), gt_path.clone());
        paths.insert("我的结果".to_string(), my_path.clone());

        // 计算我的结果与GT的IOU和准确率
        match calculate_iou(&gt_path, &my_path) {
            Ok(iou) => {
                iou_scores.insert("我的结果".to_string(), iou);
            }
            Err(e) => {
                eprintln!("计算IOU失败: {}", e);
                iou_scores.insert("我的结果".to_string(), 0.0);
            }
        }

        match calculate_accuracy(&gt_path, &my_path) {
            Ok(accuracy) => {
                accuracy_scores.insert("我的结果".to_string(), accuracy);
            }
            Err(e) => {
                eprintln!("计算准确率失败: {}", e);
                accuracy_scores.insert("我的结果".to_string(), 0.0);
            }
        }

        // 计算对比数据与GT的IOU和准确率
        for comp_folder in comparison_folders.iter() {
            let comp_path = format!("{}/{}", comp_folder.path, filename);
            let comp_name = comp_folder.name.clone();

            paths.insert(comp_name.clone(), comp_path.clone());

            // 计算IOU
            match calculate_iou(&gt_path, &comp_path) {
                Ok(iou) => {
                    iou_scores.insert(comp_name.clone(), iou);
                }
                Err(e) => {
                    eprintln!("计算IOU失败: {}", e);
                    iou_scores.insert(comp_name.clone(), 0.0);
                }
            }

            // 计算准确率
            match calculate_accuracy(&gt_path, &comp_path) {
                Ok(accuracy) => {
                    accuracy_scores.insert(comp_name.clone(), accuracy);
                }
                Err(e) => {
                    eprintln!("计算准确率失败: {}", e);
                    accuracy_scores.insert(comp_name.clone(), 0.0);
                }
            }
        }

        results.push(ComparisonResult {
            filename,
            iou_scores,
            accuracy_scores,
            paths,
        });
    }

    Ok(results)
}

#[tauri::command]
async fn show_error_dialog(app_handle: tauri::AppHandle, title: String, message: String) -> Result<(), String> {
    use tauri_plugin_dialog::DialogExt;
    
    // 创建一个 oneshot channel 来等待结果
    let (tx, rx) = tokio::sync::oneshot::channel();
    
    app_handle
        .dialog()
        .message(message)
        .title(title)
        .kind(tauri_plugin_dialog::MessageDialogKind::Error)
        .show(move |_| {
            let _ = tx.send(());
        });
    
    // 等待对话框关闭
    match rx.await {
        Ok(_) => Ok(()),
        Err(_) => Err("对话框操作失败".to_string()),
    }
}

#[tauri::command]
async fn select_export_folder(app_handle: tauri::AppHandle) -> Result<String, String> {
    use tauri_plugin_dialog::DialogExt;
    
    // 创建一个 oneshot channel 来等待结果
    let (tx, rx) = tokio::sync::oneshot::channel();
    
    app_handle
        .dialog()
        .file()
        .set_title("选择导出文件夹")
        .pick_folder(move |folder_path| {
            let _ = tx.send(folder_path);
        });
    
    // 等待回调完成
    match rx.await {
        Ok(Some(path)) => {
            if let Some(path_str) = path.as_path().and_then(|p| p.to_str()) {
                Ok(path_str.to_string())
            } else {
                Err("无法获取导出文件夹路径".to_string())
            }
        }
        Ok(None) => Err("用户取消选择".to_string()),
        Err(_) => Err("对话框操作失败".to_string()),
    }
}

#[derive(Debug, Deserialize)]
struct ExportImageRequest {
    export_folder: String,
    image_files: Vec<ExportImageInfo>,
}

#[derive(Debug, Deserialize)]
struct ExportImageInfo {
    filename: String,
    model_paths: std::collections::HashMap<String, String>, // 模型名称到路径的映射
}

#[tauri::command]
async fn export_selected_images(request: ExportImageRequest) -> Result<String, String> {
    use std::fs;
    use std::path::Path;

    let export_path = Path::new(&request.export_folder);
    if !export_path.exists() {
        return Err("导出文件夹不存在".to_string());
    }

    let mut success_count = 0;
    let mut error_files = Vec::new();
    let total_files = request.image_files.len();

    for image_info in &request.image_files {
        // 为每个图片创建子文件夹
        let image_folder = export_path.join(&image_info.filename.replace(".", "_"));
        if let Err(e) = fs::create_dir_all(&image_folder) {
            error_files.push(format!("创建文件夹失败 {}: {}", image_info.filename, e));
            continue;
        }

        // 复制所有版本的图片到对应子文件夹
        for (model_name, source_path) in &image_info.model_paths {
            let source = Path::new(source_path);
            if !source.exists() {
                error_files.push(format!("源文件不存在: {}", source_path));
                continue;
            }

            // 使用模型名称作为前缀，去除特殊字符
            let safe_model_name = model_name
                .replace("/", "_")
                .replace("\\", "_")
                .replace(":", "_");
            let dest_filename = format!("{}_{}", safe_model_name, image_info.filename);
            let dest_path = image_folder.join(dest_filename);

            if let Err(e) = fs::copy(source, &dest_path) {
                error_files.push(format!(
                    "复制文件失败 {} -> {}: {}",
                    source_path,
                    dest_path.display(),
                    e
                ));
                continue;
            }
        }

        success_count += 1;
    }

    if error_files.is_empty() {
        Ok(format!(
            "成功导出 {} 个图片到 {}",
            success_count, request.export_folder
        ))
    } else {
        let error_msg = format!(
            "部分导出成功 ({}/{}): {}",
            success_count,
            total_files,
            error_files.join("; ")
        );
        if success_count == 0 {
            Err(error_msg)
        } else {
            Ok(error_msg)
        }
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            select_folder,
            is_file,
            get_folder_files,
            validate_folders,
            calculate_comparisons,
            calculate_comparisons_with_progress,
            select_export_folder,
            export_selected_images,
            show_error_dialog
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
