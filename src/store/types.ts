import { 
  AppState, 
  Step, 
  FolderData, 
  ValidationResult, 
  ComparisonResult, 
  HistoryRecord,
  CacheMetadata,
  BaseFolderPaths,
  ComparisonFolder
} from '../types';

// Store接口定义
export interface FolderActions {
  setCurrentStep: (step: Step) => void;
  setFolders: (folders: FolderData) => void;
  setValidationResult: (result: ValidationResult | null) => void;
  setComparisonResults: (results: ComparisonResult[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  resetState: () => void;
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
  loadFromCacheIncremental: (folders: FolderData) => { 
    cachedResults: ComparisonResult[], 
    missingComparisons: ComparisonFolder[] 
  };
  saveToCache: (basePaths: BaseFolderPaths, comparisonFolders: ComparisonFolder[], results: ComparisonResult[]) => void;
  clearCache: () => void;
  cleanupCache: (maxAge?: number) => number;
  refreshCacheMetadata: () => void;
}

export interface AppStore extends AppState, FolderActions, HistoryActions, CacheActions {
  initialize: () => void;
}

export const initialState: AppState = {
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