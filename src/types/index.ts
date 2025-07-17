export interface ValidationResult {
  is_valid: boolean;
  common_files: string[];
  missing_files: Record<string, string[]>;
}

export interface ComparisonResult {
  filename: string;
  iou_scores: Record<string, number>;
  accuracy_scores: Record<string, number>;
  paths: Record<string, string>;
}

export interface ComparisonFolder {
  id: string;
  name: string;
  path: string;
}

export interface FolderData {
  original: string;
  gt: string;
  my: string;
  comparison: ComparisonFolder[];
}

// 进度相关类型定义
export interface ProgressInfo {
  current: number;          // 当前已完成的数量
  total: number;           // 总数量
  percentage: number;      // 进度百分比
  currentFileName?: string; // 当前正在处理的文件名
  estimatedTimeRemaining?: number; // 预计剩余时间（秒）
  startTime?: number;      // 开始时间（毫秒时间戳）
  speed?: number;          // 处理速度（个/秒）
}

// 细粒度缓存相关类型定义
export interface BaseFolderPaths {
  original: string;
  gt: string;
  my: string;
}

export interface SingleComparisonCacheKey {
  basePaths: BaseFolderPaths;
  comparisonPath: string;
}

export interface CachedSingleComparison {
  cacheKey: string;
  basePaths: BaseFolderPaths;
  comparisonName: string;
  comparisonPath: string;
  results: ComparisonResult[]; // 这个对比文件夹的所有文件结果
  createdAt: string;
  lastAccessedAt: string;
}

export interface CacheMetadata {
  totalSize: number;
  count: number;
  lastCleanup: string;
}

export type Step = 'folder-selection' | 'validation' | 'comparison';

export interface HistoryRecord {
  id: string;
  name: string;
  folders: FolderData;
  createdAt: string;
  description?: string;
}

export interface AppState {
  currentStep: Step;
  folders: FolderData;
  validationResult: ValidationResult | null;
  comparisonResults: ComparisonResult[];
  loading: boolean;
  error: string | null;
  historyRecords: HistoryRecord[];
  currentHistoryRecordId: string | null; // 当前加载的历史记录ID
  cacheMetadata: CacheMetadata | null; // 缓存元数据
  isUsingCache: boolean; // 当前结果是否来自缓存
  progressInfo: ProgressInfo | null; // 进度信息
} 