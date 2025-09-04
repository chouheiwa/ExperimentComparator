import { invoke } from '@tauri-apps/api/core';

/**
 * 显示对话框
 * @param message 消息内容
 * @param type 对话框类型，可以是 'error' 或 'success'，默认为 'error'
 * @param title 对话框标题，默认根据类型设置
 */
export async function showErrorDialog(message: string, type: 'error' | 'success' = 'error', title?: string): Promise<void> {
  // 根据类型设置默认标题
  const dialogTitle = title || (type === 'success' ? '成功' : '错误');
  
  try {
    // 根据类型调用不同的 Tauri 函数
    if (type === 'success') {
      // 尝试调用成功对话框函数，如果不存在则使用错误对话框函数
      try {
        await invoke('show_success_dialog', { title: dialogTitle, message });
      } catch (e) {
        console.log('成功对话框函数不存在，使用错误对话框函数代替');
        await invoke('show_error_dialog', { title: dialogTitle, message });
      }
    } else {
      await invoke('show_error_dialog', { title: dialogTitle, message });
    }
  } catch (error) {
    console.error('显示对话框失败:', error);
    // 如果 Tauri 对话框失败，回退到浏览器 alert
    alert(`${dialogTitle}: ${message}`);
  }
}