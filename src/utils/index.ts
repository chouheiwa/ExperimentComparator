import { Step, FolderData } from '../types';

export const getIouClass = (iou: number): string => {
  if (iou >= 0.7) return 'iou-high';
  if (iou >= 0.4) return 'iou-medium';
  return 'iou-low';
};

export const formatIou = (iou: number): string => {
  return (iou * 100).toFixed(2) + '%';
};

// 通用的评估指标格式化函数
export const formatMetric = (value: number): string => {
  return (value * 100).toFixed(2) + '%';
};

export const getStepTitle = (step: Step): string => {
  switch (step) {
    case 'folder-selection':
      return '选择文件夹';
    case 'validation':
      return '验证文件';
    case 'comparison':
      return '对比结果';
    default:
      return '';
  }
};

export const getIouStatus = (iou: number): 'success' | 'warning' | 'error' => {
  if (iou >= 0.7) return 'success';
  if (iou >= 0.4) return 'warning';
  return 'error';
};

// 通用的评估指标状态函数
export const getMetricStatus = (value: number): 'success' | 'warning' | 'error' => {
  if (value >= 0.7) return 'success';
  if (value >= 0.4) return 'warning';
  return 'error';
};

// 重新导出优化的文件缓存函数
export {
  generateBaseCacheKey,
  generateSingleComparisonCacheKey,
  getCachedSingleComparison,
  saveSingleComparisonCache,
  createSingleComparisonCache,
  getAllCachedComparisons,
  hasCachedComparison,
  deleteSingleComparisonCache,
  clearAllCache,
  getCacheMetadata,
  cleanupExpiredCache,
  formatCacheSize,
  getAllCacheDetails
} from './optimizedFileCache';

// 导出版本工具函数
export { getAppVersion, DEFAULT_VERSION } from './version';

// 导入函数以便在向后兼容的函数中使用
import { generateBaseCacheKey } from './optimizedFileCache';

// 移除旧的缓存函数（保持向后兼容性）
export const generateCacheKey = (folders: FolderData): string => {
  console.warn('generateCacheKey is deprecated, use generateSingleComparisonCacheKey instead');
  return generateBaseCacheKey({
    original: folders.original,
    gt: folders.gt,
    my: folders.my
  });
};
