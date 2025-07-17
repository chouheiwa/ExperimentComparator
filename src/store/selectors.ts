import { useAppStore } from './appStore';

// 状态选择器
export const useCurrentStep = () => useAppStore((state) => state.currentStep);
export const useFolders = () => useAppStore((state) => state.folders);
export const useValidationResult = () => useAppStore((state) => state.validationResult);
export const useComparisonResults = () => useAppStore((state) => state.comparisonResults);
export const useLoading = () => useAppStore((state) => state.loading);
export const useError = () => useAppStore((state) => state.error);
export const useHistoryRecords = () => useAppStore((state) => state.historyRecords);
export const useCacheMetadata = () => useAppStore((state) => state.cacheMetadata);
export const useIsUsingCache = () => useAppStore((state) => state.isUsingCache);
export const useProgressInfo = () => useAppStore((state) => state.progressInfo);

// 文件夹相关动作选择器
export const useSetCurrentStep = () => useAppStore((state) => state.setCurrentStep);
export const useSetFolders = () => useAppStore((state) => state.setFolders);
export const useSetValidationResult = () => useAppStore((state) => state.setValidationResult);
export const useSetComparisonResults = () => useAppStore((state) => state.setComparisonResults);
export const useSetLoading = () => useAppStore((state) => state.setLoading);
export const useSetError = () => useAppStore((state) => state.setError);
export const useResetState = () => useAppStore((state) => state.resetState);

// 进度相关动作选择器
export const useSetProgressInfo = () => useAppStore((state) => state.setProgressInfo);
export const useUpdateProgress = () => useAppStore((state) => state.updateProgress);
export const useResetProgress = () => useAppStore((state) => state.resetProgress);

// 历史记录相关动作选择器
export const useSetHistoryRecords = () => useAppStore((state) => state.setHistoryRecords);
export const useAddHistoryRecord = () => useAppStore((state) => state.addHistoryRecord);
export const useDeleteHistoryRecord = () => useAppStore((state) => state.deleteHistoryRecord);
export const useUpdateHistoryRecord = () => useAppStore((state) => state.updateHistoryRecord);
export const useSetCurrentHistoryRecordId = () => useAppStore((state) => state.setCurrentHistoryRecordId);
export const useLoadHistoryRecord = () => useAppStore((state) => state.loadHistoryRecord);

// 缓存相关动作选择器
export const useSetCacheMetadata = () => useAppStore((state) => state.setCacheMetadata);
export const useSetIsUsingCache = () => useAppStore((state) => state.setIsUsingCache);
export const useLoadFromCacheIncremental = () => useAppStore((state) => state.loadFromCacheIncremental);
export const useSaveToCache = () => useAppStore((state) => state.saveToCache);
export const useClearCache = () => useAppStore((state) => state.clearCache);
export const useCleanupCache = () => useAppStore((state) => state.cleanupCache);
export const useRefreshCacheMetadata = () => useAppStore((state) => state.refreshCacheMetadata);

// 通用动作选择器
export const useInitialize = () => useAppStore((state) => state.initialize); 