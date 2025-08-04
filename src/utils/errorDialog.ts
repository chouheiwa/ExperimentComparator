import { invoke } from '@tauri-apps/api/core';

/**
 * 显示错误对话框
 * @param message 错误消息
 * @param title 对话框标题，默认为"错误"
 */
export async function showErrorDialog(message: string, title: string = '错误'): Promise<void> {
  try {
    await invoke('show_error_dialog', { title, message });
  } catch (error) {
    console.error('显示错误对话框失败:', error);
    // 如果 Tauri 对话框失败，回退到浏览器 alert
    alert(`${title}: ${message}`);
  }
}