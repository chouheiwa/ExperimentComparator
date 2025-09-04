import { StateCreator } from 'zustand';
import { AppStore, HistoryActions } from '../types';
import { FolderData, HistoryRecord } from '../../types';
import { 
  saveHistoryToStorage, 
  createHistoryRecord,
  isDuplicateFolders 
} from '../../utils/history';

export const createHistoryActions: StateCreator<
  AppStore,
  [['zustand/immer', never]],
  [],
  HistoryActions
> = (set, get, _api) => ({
  setHistoryRecords: (records: HistoryRecord[]) => {
    set((state) => {
      state.historyRecords = records;
    });
    saveHistoryToStorage(records);
  },
  
  addHistoryRecord: (folders: FolderData, name?: string, description?: string) => {
    const currentRecords = get().historyRecords;
    const currentHistoryRecordId = get().currentHistoryRecordId;
    
    // 如果当前有加载的历史记录ID，更新该记录而不是新增
    if (currentHistoryRecordId) {
      const recordIndex = currentRecords.findIndex(record => record.id === currentHistoryRecordId);
  
      if (recordIndex !== -1) {
        const updatedRecord = {
          ...currentRecords[recordIndex],
          folders,
          name: name || currentRecords[recordIndex].name,
          description: description !== undefined ? description : currentRecords[recordIndex].description
        };
        
        set((state) => {
          state.historyRecords[recordIndex] = updatedRecord;
        });
        
        const newRecords = get().historyRecords;
        saveHistoryToStorage(newRecords);
        return updatedRecord;
      }
    }
    
    // 检查是否已存在相同的配置
    if (isDuplicateFolders(folders, currentRecords)) {
      return null;
    }
    
    const newRecord = createHistoryRecord(folders, name, description);
    set((state) => {
      state.historyRecords.unshift(newRecord);
      // 设置新记录为当前记录
      state.currentHistoryRecordId = newRecord.id;
    });
    
    const newRecords = get().historyRecords;
    saveHistoryToStorage(newRecords);
    return newRecord;
  },
  
  deleteHistoryRecord: (id: string) => {
    set((state) => {
      state.historyRecords = state.historyRecords.filter(record => record.id !== id);
    });
    
    const newRecords = get().historyRecords;
    saveHistoryToStorage(newRecords);
  },
  
  updateHistoryRecord: (id: string, name: string, description?: string) => {
    set((state) => {
      const recordIndex = state.historyRecords.findIndex(record => record.id === id);
      if (recordIndex !== -1) {
        state.historyRecords[recordIndex].name = name;
        if (description !== undefined) {
          state.historyRecords[recordIndex].description = description;
        }
      }
    });
    
    const newRecords = get().historyRecords;
    saveHistoryToStorage(newRecords);
  },
  
  setCurrentHistoryRecordId: (id: string | null) => {
    set((state) => {
      state.currentHistoryRecordId = id;
    });
  },
  
  loadHistoryRecord: (record: HistoryRecord) => {
    set((state) => {
      // 处理向后兼容性：如果comparison是字符串数组，转换为ComparisonFolder数组
      let folders = record.folders;
      if (folders.comparison.length > 0 && typeof folders.comparison[0] === 'string') {
        folders = {
          ...folders,
          comparison: (folders.comparison as any as string[]).map((path: string, index: number) => ({
            id: `comp-${Date.now()}-${index}`,
            name: `对比数据 ${index + 1}`,
            path: path
          }))
        };
      }
      
      // 处理向后兼容性：为旧记录添加默认的original字段
      if (!folders.original) {
        folders = {
          ...folders,
          original: ''
        };
      }
      
      state.folders = folders;
      state.error = null;
      // 设置当前加载的历史记录ID
      state.currentHistoryRecordId = record.id;
      // 重置缓存状态
      state.isUsingCache = false;
    });
  },

  importHistoryRecords: (records: HistoryRecord[]) => {
    const currentRecords = get().historyRecords;
    
    // 过滤掉已存在的记录（基于ID），保留新的记录
    const newRecords = records.filter(record => 
      !currentRecords.find(existing => existing.id === record.id)
    );
    
    if (newRecords.length > 0) {
      set((state) => {
        // 将新记录添加到现有记录的开头
        state.historyRecords = [...newRecords, ...state.historyRecords];
      });
      
      const allRecords = get().historyRecords;
      saveHistoryToStorage(allRecords);
    }
  }
});