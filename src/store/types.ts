import { 
  AppState, 
  FolderData, 
  ValidationResult, 
  ComparisonResult, 
  HistoryRecord,
  CacheMetadata,
  BaseFolderPaths,
  ComparisonFolder,
  ProgressInfo,
  CachedSingleComparison
} from '../types';

// Store接口定义
export interface FolderActions {
  setFolders: (folders: FolderData) => void;
  setValidationResult: (result: ValidationResult | null) => void;
  setComparisonResults: (results: ComparisonResult[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  resetState: () => void;
}

export interface ProgressActions {
  setProgressInfo: (progress: ProgressInfo | null) => void;
  updateProgress: (current: number, total: number, currentFileName?: string) => void;
  resetProgress: () => void;
}

export interface HistoryActions {
  setHistoryRecords: (records: HistoryRecord[]) => void;
  addHistoryRecord: (folders: FolderData, name?: string, description?: string) => HistoryRecord | null;
  deleteHistoryRecord: (id: string) => void;
  updateHistoryRecord: (id: string, name: string, description?: string) => void;
  setCurrentHistoryRecordId: (id: string | null) => void;
  loadHistoryRecord: (record: HistoryRecord) => void;
}

export interface CacheActions {
  setCacheMetadata: (metadata: CacheMetadata | null) => void;
  setIsUsingCache: (isUsingCache: boolean) => void;
  loadFromCacheIncremental: (folders: FolderData) => Promise<{ 
    cachedResults: ComparisonResult[], 
    missingComparisons: ComparisonFolder[] 
  }>;
  saveToCache: (basePaths: BaseFolderPaths, comparisonFolders: ComparisonFolder[], results: ComparisonResult[]) => Promise<void>;
  clearCache: () => Promise<void>;
  cleanupCache: (maxAge?: number) => Promise<number>;
  refreshCacheMetadata: () => Promise<void>;
  getAllCacheDetails: () => Promise<CachedSingleComparison[]>;
}

export interface AppStore extends AppState, FolderActions, ProgressActions, HistoryActions, CacheActions {
  initialize: () => Promise<void>;
}

export const initialState: AppState = {
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
  isUsingCache: false,
  progressInfo: null
}; 