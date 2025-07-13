import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';

import { 
  AppState, 
  Step, 
  FolderData, 
  ValidationResult, 
  ComparisonResult, 
  HistoryRecord 
} from '../types';
import { 
  loadHistoryFromStorage, 
  saveHistoryToStorage, 
  createHistoryRecord,
  isDuplicateFolders 
} from '../utils/history';

interface AppStore extends AppState {
  // Actions
  setCurrentStep: (step: Step) => void;
  setFolders: (folders: FolderData) => void;
  setValidationResult: (result: ValidationResult | null) => void;
  setComparisonResults: (results: ComparisonResult[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setHistoryRecords: (records: HistoryRecord[]) => void;
  addHistoryRecord: (folders: FolderData, name?: string, description?: string) => HistoryRecord | null;
  deleteHistoryRecord: (id: string) => void;
  loadHistoryRecord: (record: HistoryRecord) => void;
  resetState: () => void;
  initialize: () => void;
}

const initialState: AppState = {
  currentStep: 'folder-selection',
  folders: {
    gt: '',
    my: '',
    comparison: []
  },
  validationResult: null,
  comparisonResults: [],
  loading: false,
  error: null,
  historyRecords: []
};

export const useAppStore = create<AppStore>()(
  subscribeWithSelector(
    immer((set, get) => ({
      ...initialState,
      
      setCurrentStep: (step: Step) => {
        set((state) => {
          state.currentStep = step;
        });
      },
      
      setFolders: (folders: FolderData) => {
        set((state) => {
          state.folders = folders;
        });
      },
      
      setValidationResult: (result: ValidationResult | null) => {
        set((state) => {
          state.validationResult = result;
        });
      },
      
      setComparisonResults: (results: ComparisonResult[]) => {
        set((state) => {
          state.comparisonResults = results;
        });
      },
      
      setLoading: (loading: boolean) => {
        set((state) => {
          state.loading = loading;
        });
      },
      
      setError: (error: string | null) => {
        set((state) => {
          state.error = error;
        });
      },
      
      setHistoryRecords: (records: HistoryRecord[]) => {
        set((state) => {
          state.historyRecords = records;
        });
        saveHistoryToStorage(records);
      },
      
      addHistoryRecord: (folders: FolderData, name?: string, description?: string) => {
        const currentRecords = get().historyRecords;
        
        // 检查是否已存在相同的配置
        if (isDuplicateFolders(folders, currentRecords)) {
          return null;
        }
        
        const newRecord = createHistoryRecord(folders, name, description);
        set((state) => {
          state.historyRecords.unshift(newRecord);
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
          
          state.folders = folders;
          state.error = null;
          state.currentStep = 'folder-selection';
        });
      },
      
      resetState: () => {
        set((state) => {
          state.currentStep = 'folder-selection';
          state.folders = {
            gt: '',
            my: '',
            comparison: []
          };
          state.validationResult = null;
          state.comparisonResults = [];
          state.loading = false;
          state.error = null;
        });
      },
      
      initialize: () => {
        const savedRecords = loadHistoryFromStorage();
        set((state) => {
          state.historyRecords = savedRecords;
        });
      }
    }))
  )
);

// 选择器，用于获取特定的状态片段
export const useCurrentStep = () => useAppStore((state) => state.currentStep);
export const useFolders = () => useAppStore((state) => state.folders);
export const useValidationResult = () => useAppStore((state) => state.validationResult);
export const useComparisonResults = () => useAppStore((state) => state.comparisonResults);
export const useLoading = () => useAppStore((state) => state.loading);
export const useError = () => useAppStore((state) => state.error);
export const useHistoryRecords = () => useAppStore((state) => state.historyRecords);

// 单独的动作选择器 - 避免对象重新创建
export const useSetCurrentStep = () => useAppStore((state) => state.setCurrentStep);
export const useSetFolders = () => useAppStore((state) => state.setFolders);
export const useSetValidationResult = () => useAppStore((state) => state.setValidationResult);
export const useSetComparisonResults = () => useAppStore((state) => state.setComparisonResults);
export const useSetLoading = () => useAppStore((state) => state.setLoading);
export const useSetError = () => useAppStore((state) => state.setError);
export const useSetHistoryRecords = () => useAppStore((state) => state.setHistoryRecords);
export const useAddHistoryRecord = () => useAppStore((state) => state.addHistoryRecord);
export const useDeleteHistoryRecord = () => useAppStore((state) => state.deleteHistoryRecord);
export const useLoadHistoryRecord = () => useAppStore((state) => state.loadHistoryRecord);
export const useResetState = () => useAppStore((state) => state.resetState);
export const useInitialize = () => useAppStore((state) => state.initialize);

 