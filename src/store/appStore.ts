import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';

import { 
  AppState, 
  Step, 
  FolderData, 
  ValidationResult, 
  ComparisonResult, 
  HistoryRecord,
  CacheMetadata,
  CachedSingleComparison,
  BaseFolderPaths,
  ComparisonFolder
} from '../types';
import { 
  loadHistoryFromStorage, 
  saveHistoryToStorage, 
  createHistoryRecord,
  isDuplicateFolders 
} from '../utils/history';
import {
  getCachedSingleComparison,
  saveSingleComparisonCache,
  createSingleComparisonCache,
  hasCachedComparison,
  deleteSingleComparisonCache,
  clearAllCache,
  getCacheMetadata,
  cleanupExpiredCache,
  getAllCachedComparisons
} from '../utils';

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
  updateHistoryRecord: (id: string, name: string, description?: string) => void;
  setCurrentHistoryRecordId: (id: string | null) => void;
  loadHistoryRecord: (record: HistoryRecord) => void;
  resetState: () => void;
  initialize: () => void;
  
  // 缓存相关动作
  setCacheMetadata: (metadata: CacheMetadata | null) => void;
  setIsUsingCache: (isUsingCache: boolean) => void;
  loadFromCacheIncremental: (folders: FolderData) => { 
    cachedResults: ComparisonResult[], 
    missingComparisons: ComparisonFolder[] 
  }; // 增量加载缓存
  saveToCache: (basePaths: BaseFolderPaths, comparisonFolders: ComparisonFolder[], results: ComparisonResult[]) => void;
  clearCache: () => void;
  cleanupCache: (maxAge?: number) => number;
  refreshCacheMetadata: () => void;
}

const initialState: AppState = {
  currentStep: 'folder-selection',
  folders: {
    original: '',
    gt: '',
    my: '',
    comparison: []
  },
  validationResult: null,
  comparisonResults: [],
  loading: false,
  error: null,
  historyRecords: [],
  currentHistoryRecordId: null,
  cacheMetadata: null,
  isUsingCache: false
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
        const currentHistoryRecordId = get().currentHistoryRecordId;
        
        // 如果当前有加载的历史记录ID，更新该记录而不是新增
        if (currentHistoryRecordId) {
          const recordIndex = currentRecords.findIndex(record => record.id === currentHistoryRecordId);
          console.log('recordIndex', recordIndex);
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
          state.currentStep = 'folder-selection';
          // 设置当前加载的历史记录ID
          state.currentHistoryRecordId = record.id;
          // 重置缓存状态
          state.isUsingCache = false;
        });
      },
      
      resetState: () => {
        set((state) => {
          state.currentStep = 'folder-selection';
          state.folders = {
            original: '',
            gt: '',
            my: '',
            comparison: []
          };
          state.validationResult = null;
          state.comparisonResults = [];
          state.loading = false;
          state.error = null;
          state.currentHistoryRecordId = null;
          state.isUsingCache = false;
        });
      },
      
      initialize: () => {
        const savedRecords = loadHistoryFromStorage();
        set((state) => {
          state.historyRecords = savedRecords;
          state.cacheMetadata = getCacheMetadata();
        });
      },
      
      // 缓存相关动作实现
      setCacheMetadata: (metadata: CacheMetadata | null) => {
        set((state) => {
          state.cacheMetadata = metadata;
        });
      },
      
      setIsUsingCache: (isUsingCache: boolean) => {
        set((state) => {
          state.isUsingCache = isUsingCache;
        });
      },
      
      loadFromCacheIncremental: (folders: FolderData) => {
        const basePaths: BaseFolderPaths = {
          original: folders.original,
          gt: folders.gt,
          my: folders.my
        };
        
        const cachedResults: ComparisonResult[] = [];
        const missingComparisons: ComparisonFolder[] = [];
        let hasCache = false;
        
        // 检查每个对比文件夹的缓存
        folders.comparison.forEach(compFolder => {
          const cachedComparison = getCachedSingleComparison(basePaths, compFolder.path);
          
          if (cachedComparison) {
            console.log(`找到缓存: ${compFolder.name}`);
            // 更新缓存结果中的名称映射
            cachedComparison.results.forEach(result => {
              // 将缓存中的名称更新为当前名称
              if (result.iou_scores[cachedComparison.comparisonName]) {
                result.iou_scores[compFolder.name] = result.iou_scores[cachedComparison.comparisonName];
                result.accuracy_scores[compFolder.name] = result.accuracy_scores[cachedComparison.comparisonName];
                result.paths[compFolder.name] = result.paths[cachedComparison.comparisonName];
                
                // 如果名称不同，删除旧的映射
                if (cachedComparison.comparisonName !== compFolder.name) {
                  delete result.iou_scores[cachedComparison.comparisonName];
                  delete result.accuracy_scores[cachedComparison.comparisonName];
                  delete result.paths[cachedComparison.comparisonName];
                }
              }
            });
            
            cachedResults.push(...cachedComparison.results);
            hasCache = true;
          } else {
            console.log(`缺少缓存: ${compFolder.name}`);
            missingComparisons.push(compFolder);
          }
        });
        
        // 如果有缓存结果，需要合并相同文件名的结果
        if (hasCache) {
          const mergedResults: ComparisonResult[] = [];
          const fileResultMap = new Map<string, ComparisonResult>();
          
          cachedResults.forEach(result => {
            if (fileResultMap.has(result.filename)) {
              const existingResult = fileResultMap.get(result.filename)!;
              // 合并IOU和准确率分数
              Object.assign(existingResult.iou_scores, result.iou_scores);
              Object.assign(existingResult.accuracy_scores, result.accuracy_scores);
              Object.assign(existingResult.paths, result.paths);
            } else {
              fileResultMap.set(result.filename, { ...result });
            }
          });
          
          mergedResults.push(...fileResultMap.values());
          
          // 如果所有对比都有缓存，直接设置结果
          if (missingComparisons.length === 0) {
            set((state) => {
              state.comparisonResults = mergedResults;
              state.currentStep = 'comparison';
              state.isUsingCache = true;
              state.error = null;
            });
            
            get().refreshCacheMetadata();
          }
          
          return { cachedResults: mergedResults, missingComparisons };
        }
        
        return { cachedResults: [], missingComparisons: folders.comparison };
      },
      
      saveToCache: (basePaths: BaseFolderPaths, comparisonFolders: ComparisonFolder[], results: ComparisonResult[]) => {
        // 为每个对比文件夹单独保存缓存
        comparisonFolders.forEach(compFolder => {
          // 提取这个对比文件夹的结果
          const folderResults = results.map(result => ({
            ...result,
            iou_scores: { [compFolder.name]: result.iou_scores[compFolder.name] },
            accuracy_scores: { [compFolder.name]: result.accuracy_scores[compFolder.name] },
            paths: { 
              '原始图片': result.paths['原始图片'],
              'GT': result.paths['GT'],
              '我的结果': result.paths['我的结果'],
              [compFolder.name]: result.paths[compFolder.name]
            }
          })).filter(result => 
            result.iou_scores[compFolder.name] !== undefined || 
            result.accuracy_scores[compFolder.name] !== undefined
          );
          
          if (folderResults.length > 0) {
            const cacheResult = createSingleComparisonCache(
              basePaths,
              compFolder.name,
              compFolder.path,
              folderResults
            );
            saveSingleComparisonCache(cacheResult);
            console.log(`已保存缓存: ${compFolder.name}`);
          }
        });
        
        // 刷新缓存元数据
        get().refreshCacheMetadata();
      },
      
      clearCache: () => {
        clearAllCache();
        set((state) => {
          state.cacheMetadata = getCacheMetadata();
          state.isUsingCache = false;
        });
      },
      
      cleanupCache: (maxAge: number = 30): number => {
        const deletedCount = cleanupExpiredCache(maxAge);
        
        // 刷新缓存元数据
        get().refreshCacheMetadata();
        
        return deletedCount;
      },
      
      refreshCacheMetadata: () => {
        set((state) => {
          state.cacheMetadata = getCacheMetadata();
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
export const useCacheMetadata = () => useAppStore((state) => state.cacheMetadata);
export const useIsUsingCache = () => useAppStore((state) => state.isUsingCache);

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
export const useUpdateHistoryRecord = () => useAppStore((state) => state.updateHistoryRecord);
export const useSetCurrentHistoryRecordId = () => useAppStore((state) => state.setCurrentHistoryRecordId);
export const useLoadHistoryRecord = () => useAppStore((state) => state.loadHistoryRecord);
export const useResetState = () => useAppStore((state) => state.resetState);
export const useInitialize = () => useAppStore((state) => state.initialize);

// 缓存相关动作选择器
export const useSetCacheMetadata = () => useAppStore((state) => state.setCacheMetadata);
export const useSetIsUsingCache = () => useAppStore((state) => state.setIsUsingCache);
export const useLoadFromCacheIncremental = () => useAppStore((state) => state.loadFromCacheIncremental);
export const useSaveToCache = () => useAppStore((state) => state.saveToCache);
export const useClearCache = () => useAppStore((state) => state.clearCache);
export const useCleanupCache = () => useAppStore((state) => state.cleanupCache);
export const useRefreshCacheMetadata = () => useAppStore((state) => state.refreshCacheMetadata);

 