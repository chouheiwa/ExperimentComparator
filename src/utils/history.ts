import { HistoryRecord, FolderData } from '../types';

const HISTORY_STORAGE_KEY = 'datachoosing_history';

// 生成唯一ID
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// 生成默认记录名称
export const generateRecordName = (folders: FolderData): string => {
  const originalName = folders.original ? folders.original.split('/').pop() || 'Original' : '';
  const gtName = folders.gt.split('/').pop() || 'GT';
  const myName = folders.my.split('/').pop() || 'My';
  const compCount = folders.comparison.length;
  
  if (originalName) {
    return `${originalName}: ${gtName} vs ${myName} (+${compCount})`;
  } else {
    return `${gtName} vs ${myName} (+${compCount})`;
  }
};

// 从本地存储读取历史记录
export const loadHistoryFromStorage = (): HistoryRecord[] => {
  try {
    const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (stored) {
      const records = JSON.parse(stored);
      // 处理向后兼容性：转换旧格式的comparison数据和添加missing original字段
      return records.map((record: any) => {
        if (record.folders.comparison.length > 0 && typeof record.folders.comparison[0] === 'string') {
          record.folders.comparison = record.folders.comparison.map((path: string, index: number) => ({
            id: generateId(),
            name: `对比数据 ${index + 1}`,
            path: path
          }));
        }
        
        // 为旧记录添加默认的original字段
        if (!record.folders.original) {
          record.folders.original = '';
        }
        
        return record;
      });
    }
  } catch (error) {
    console.error('Failed to load history from storage:', error);
  }
  return [];
};

// 保存历史记录到本地存储
export const saveHistoryToStorage = (records: HistoryRecord[]): void => {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(records));
  } catch (error) {
    console.error('Failed to save history to storage:', error);
  }
};

// 创建新的历史记录
export const createHistoryRecord = (
  folders: FolderData, 
  name?: string, 
  description?: string
): HistoryRecord => {
  return {
    id: generateId(),
    name: name || generateRecordName(folders),
    folders,
    createdAt: new Date().toISOString(),
    description
  };
};

// 导出历史记录为JSON
export const exportHistoryToJson = (records: HistoryRecord[]): string => {
  return JSON.stringify({
    version: '1.0',
    exportedAt: new Date().toISOString(),
    records
  }, null, 2);
};

// 从JSON导入历史记录
export const importHistoryFromJson = (jsonString: string): HistoryRecord[] => {
  try {
    const data = JSON.parse(jsonString);
    
    // 验证数据格式
    if (!data.records || !Array.isArray(data.records)) {
      throw new Error('Invalid format: missing records array');
    }
    
    // 验证每个记录的格式并处理向后兼容性
    const validRecords: HistoryRecord[] = data.records.filter((record: any) => {
      return record.id && 
             record.name && 
             record.folders && 
             record.folders.gt && 
             record.folders.my && 
             Array.isArray(record.folders.comparison) &&
             record.createdAt;
    }).map((record: any) => {
      // 处理旧版本数据结构（comparison是字符串数组）
      if (record.folders.comparison.length > 0 && typeof record.folders.comparison[0] === 'string') {
        record.folders.comparison = record.folders.comparison.map((path: string, index: number) => ({
          id: generateId(),
          name: `对比数据 ${index + 1}`,
          path: path
        }));
      }
      
      // 为旧记录添加默认的original字段
      if (!record.folders.original) {
        record.folders.original = '';
      }
      
      return record;
    });
    
    // 为导入的记录生成新的ID（避免冲突）
    return validRecords.map(record => ({
      ...record,
      id: generateId()
    }));
    
  } catch (error) {
    console.error('Failed to import history from JSON:', error);
    throw new Error('导入失败：JSON格式不正确或数据格式错误');
  }
};

// 检查是否存在相同的文件夹配置
export const isDuplicateFolders = (folders: FolderData, existingRecords: HistoryRecord[]): boolean => {
  return existingRecords.some(record => {
    const recordFolders = record.folders;
    
    // 检查原始图片、GT和我的实验数据路径是否相同
    if (recordFolders.original !== folders.original || 
        recordFolders.gt !== folders.gt || 
        recordFolders.my !== folders.my) {
      return false;
    }
    
    // 检查对比数据数量是否相同
    if (recordFolders.comparison.length !== folders.comparison.length) {
      return false;
    }
    
    // 检查对比数据路径是否完全相同（忽略顺序）
    const recordPaths = recordFolders.comparison.map(c => c.path).sort();
    const folderPaths = folders.comparison.map(c => c.path).sort();
    
    return recordPaths.every((path, index) => path === folderPaths[index]);
  });
};

// 验证文件夹路径是否存在（可选功能，需要后端支持）
export const validateFolderPaths = async (_folders: FolderData): Promise<boolean> => {
  // 这里可以调用后端API来验证路径是否存在
  // 暂时返回true，假设所有路径都有效
  return true;
}; 