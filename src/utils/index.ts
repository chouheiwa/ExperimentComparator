import { Step, FolderData, CachedSingleComparison, ComparisonResult, CacheMetadata, BaseFolderPaths } from '../types';

export const getIouClass = (iou: number): string => {
  if (iou >= 0.7) return 'iou-high';
  if (iou >= 0.4) return 'iou-medium';
  return 'iou-low';
};

export const formatIou = (iou: number): string => {
  return (iou * 100).toFixed(2) + '%';
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

// 生成基础路径的缓存键部分
export const generateBaseCacheKey = (basePaths: BaseFolderPaths): string => {
  const keyData = {
    original: basePaths.original,
    gt: basePaths.gt,
    my: basePaths.my
  };
  
  const keyString = JSON.stringify(keyData);
  
  // 简单的字符串哈希函数，支持Unicode字符
  let hash = 0;
  for (let i = 0; i < keyString.length; i++) {
    const char = keyString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  
  return Math.abs(hash).toString(36);
};

// 生成单个对比的完整缓存键
export const generateSingleComparisonCacheKey = (basePaths: BaseFolderPaths, comparisonPath: string): string => {
  const baseKey = generateBaseCacheKey(basePaths);
  
  // 为对比路径生成哈希
  let compHash = 0;
  for (let i = 0; i < comparisonPath.length; i++) {
    const char = comparisonPath.charCodeAt(i);
    compHash = ((compHash << 5) - compHash) + char;
    compHash = compHash & compHash;
  }
  
  return `${baseKey}_${Math.abs(compHash).toString(36)}`;
};

// 本地存储键名  
const SINGLE_CACHE_STORAGE_KEY = 'experiment_single_comparison_cache';
const CACHE_METADATA_KEY = 'experiment_comparison_cache_metadata';

// 从本地存储获取单个对比的缓存
export const getCachedSingleComparison = (basePaths: BaseFolderPaths, comparisonPath: string): CachedSingleComparison | null => {
  try {
    const cacheKey = generateSingleComparisonCacheKey(basePaths, comparisonPath);
    console.log('尝试获取单个对比缓存，key:', cacheKey);
    
    const cacheData = localStorage.getItem(SINGLE_CACHE_STORAGE_KEY);
    if (!cacheData) {
      console.log('没有找到缓存数据');
      return null;
    }
    
    const cache: Record<string, CachedSingleComparison> = JSON.parse(cacheData);
    const result = cache[cacheKey];
    
    if (result) {
      console.log('找到单个对比缓存结果');
      // 更新最后访问时间
      result.lastAccessedAt = new Date().toISOString();
      saveSingleComparisonCache(result);
      return result;
    }
    
    console.log('缓存中没有对应的结果');
    return null;
  } catch (error) {
    console.error('获取单个对比缓存失败:', error);
    return null;
  }
};

// 保存单个对比缓存
export const saveSingleComparisonCache = (result: CachedSingleComparison): void => {
  try {
    const cacheData = localStorage.getItem(SINGLE_CACHE_STORAGE_KEY);
    const cache: Record<string, CachedSingleComparison> = cacheData ? JSON.parse(cacheData) : {};
    
    cache[result.cacheKey] = result;
    localStorage.setItem(SINGLE_CACHE_STORAGE_KEY, JSON.stringify(cache));
    
    // 更新缓存元数据
    updateCacheMetadata();
  } catch (error) {
    console.error('保存单个对比缓存失败:', error);
  }
};

// 创建单个对比缓存结果
export const createSingleComparisonCache = (
  basePaths: BaseFolderPaths,
  comparisonName: string,
  comparisonPath: string,
  results: ComparisonResult[]
): CachedSingleComparison => {
  const cacheKey = generateSingleComparisonCacheKey(basePaths, comparisonPath);
  const now = new Date().toISOString();
  
  return {
    cacheKey,
    basePaths,
    comparisonName,
    comparisonPath,
    results,
    createdAt: now,
    lastAccessedAt: now
  };
};

// 获取所有已缓存的对比组合
export const getAllCachedComparisons = (basePaths: BaseFolderPaths): CachedSingleComparison[] => {
  try {
    const cacheData = localStorage.getItem(SINGLE_CACHE_STORAGE_KEY);
    if (!cacheData) return [];
    
    const cache: Record<string, CachedSingleComparison> = JSON.parse(cacheData);
    
    return Object.values(cache).filter(item => 
      item.basePaths.original === basePaths.original &&
      item.basePaths.gt === basePaths.gt &&
      item.basePaths.my === basePaths.my
    );
  } catch (error) {
    console.error('获取所有缓存对比失败:', error);
    return [];
  }
};

// 检查特定对比是否有缓存
export const hasCachedComparison = (basePaths: BaseFolderPaths, comparisonPath: string): boolean => {
  return getCachedSingleComparison(basePaths, comparisonPath) !== null;
};

// 删除特定缓存
export const deleteSingleComparisonCache = (cacheKey: string): void => {
  try {
    const cacheData = localStorage.getItem(SINGLE_CACHE_STORAGE_KEY);
    if (!cacheData) return;
    
    const cache: Record<string, CachedSingleComparison> = JSON.parse(cacheData);
    delete cache[cacheKey];
    localStorage.setItem(SINGLE_CACHE_STORAGE_KEY, JSON.stringify(cache));
    
    updateCacheMetadata();
  } catch (error) {
    console.error('删除单个对比缓存失败:', error);
  }
};

// 清空所有缓存
export const clearAllCache = (): void => {
  try {
    localStorage.removeItem(SINGLE_CACHE_STORAGE_KEY);
    localStorage.removeItem(CACHE_METADATA_KEY);
  } catch (error) {
    console.error('清空缓存失败:', error);
  }
};

// 获取缓存元数据
export const getCacheMetadata = (): CacheMetadata => {
  try {
    const metadataData = localStorage.getItem(CACHE_METADATA_KEY);
    if (metadataData) {
      return JSON.parse(metadataData);
    }
  } catch (error) {
    console.error('获取缓存元数据失败:', error);
  }
  
  return {
    totalSize: 0,
    count: 0,
    lastCleanup: new Date().toISOString()
  };
};

// 更新缓存元数据
const updateCacheMetadata = (): void => {
  try {
    const cacheData = localStorage.getItem(SINGLE_CACHE_STORAGE_KEY);
    if (!cacheData) {
      const metadata: CacheMetadata = {
        totalSize: 0,
        count: 0,
        lastCleanup: new Date().toISOString()
      };
      localStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(metadata));
      return;
    }
    
    const cache: Record<string, CachedSingleComparison> = JSON.parse(cacheData);
    const count = Object.keys(cache).length;
    const totalSize = new Blob([cacheData]).size;
    
    const metadata: CacheMetadata = {
      totalSize,
      count,
      lastCleanup: getCacheMetadata().lastCleanup
    };
    
    localStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(metadata));
  } catch (error) {
    console.error('更新缓存元数据失败:', error);
  }
};

// 清理过期缓存
export const cleanupExpiredCache = (maxAge: number = 30): number => {
  try {
    const cacheData = localStorage.getItem(SINGLE_CACHE_STORAGE_KEY);
    if (!cacheData) return 0;
    
    const cache: Record<string, CachedSingleComparison> = JSON.parse(cacheData);
    const cutoffDate = new Date(Date.now() - maxAge * 24 * 60 * 60 * 1000);
    
    let deletedCount = 0;
    Object.keys(cache).forEach(key => {
      const result = cache[key];
      const lastAccessed = new Date(result.lastAccessedAt);
      
      if (lastAccessed < cutoffDate) {
        delete cache[key];
        deletedCount++;
      }
    });
    
    if (deletedCount > 0) {
      localStorage.setItem(SINGLE_CACHE_STORAGE_KEY, JSON.stringify(cache));
      updateCacheMetadata();
      
      const metadata = getCacheMetadata();
      metadata.lastCleanup = new Date().toISOString();
      localStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(metadata));
    }
    
    return deletedCount;
  } catch (error) {
    console.error('清理过期缓存失败:', error);
    return 0;
  }
};

// 格式化缓存大小
export const formatCacheSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 移除旧的缓存函数（保持向后兼容性）
export const generateCacheKey = (folders: FolderData): string => {
  console.warn('generateCacheKey is deprecated, use generateSingleComparisonCacheKey instead');
  return generateBaseCacheKey({
    original: folders.original,
    gt: folders.gt,
    my: folders.my
  });
};

// 以下函数已废弃，已移除 