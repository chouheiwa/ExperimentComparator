import { 
  readTextFile, 
  writeTextFile, 
  exists, 
  mkdir, 
  readDir,
  remove
} from '@tauri-apps/plugin-fs';
import { appDataDir, join } from '@tauri-apps/api/path';
import { 
  CachedSingleComparison, 
  CacheMetadata, 
  BaseFolderPaths 
} from '../types';

// 缓存目录和文件配置
const CACHE_DIR_NAME = 'experiment_cache';
const CACHE_METADATA_FILE = 'metadata.json';

// 获取缓存目录路径
export const getCacheDir = async (): Promise<string> => {
  const appDir = await appDataDir();
  return await join(appDir, CACHE_DIR_NAME);
};

// 确保缓存目录存在
export const ensureCacheDir = async (): Promise<void> => {
  const cacheDir = await getCacheDir();
  const dirExists = await exists(cacheDir);
  if (!dirExists) {
    await mkdir(cacheDir, { recursive: true });
  }
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

// 获取缓存文件路径
const getCacheFilePath = async (cacheKey: string): Promise<string> => {
  const cacheDir = await getCacheDir();
  return await join(cacheDir, `${cacheKey}.json`);
};

// 获取缓存元数据文件路径
const getCacheMetadataPath = async (): Promise<string> => {
  const cacheDir = await getCacheDir();
  return await join(cacheDir, CACHE_METADATA_FILE);
};

// 从文件获取单个对比的缓存
export const getCachedSingleComparison = async (
  basePaths: BaseFolderPaths, 
  comparisonPath: string
): Promise<CachedSingleComparison | null> => {
  try {
    await ensureCacheDir();
    
    const cacheKey = generateSingleComparisonCacheKey(basePaths, comparisonPath);
    const cacheFilePath = await getCacheFilePath(cacheKey);
    
    console.log('尝试获取单个对比缓存，key:', cacheKey);
    
    const fileExists = await exists(cacheFilePath);
    if (!fileExists) {
      console.log('缓存文件不存在');
      return null;
    }
    
    const cacheData = await readTextFile(cacheFilePath);
    const result: CachedSingleComparison = JSON.parse(cacheData);
    
    console.log('找到单个对比缓存结果');
    
    // 更新最后访问时间
    result.lastAccessedAt = new Date().toISOString();
    await saveSingleComparisonCache(result);
    
    return result;
  } catch (error) {
    console.error('获取单个对比缓存失败:', error);
    return null;
  }
};

// 保存单个对比缓存到文件
export const saveSingleComparisonCache = async (result: CachedSingleComparison): Promise<void> => {
  try {
    await ensureCacheDir();
    
    const cacheFilePath = await getCacheFilePath(result.cacheKey);
    await writeTextFile(cacheFilePath, JSON.stringify(result, null, 2));
    
    // 更新缓存元数据
    await updateCacheMetadata();
  } catch (error) {
    console.error('保存单个对比缓存失败:', error);
  }
};

// 创建单个对比缓存结果
export const createSingleComparisonCache = (
  basePaths: BaseFolderPaths,
  comparisonName: string,
  comparisonPath: string,
  results: any[]
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
export const getAllCachedComparisons = async (basePaths: BaseFolderPaths): Promise<CachedSingleComparison[]> => {
  try {
    await ensureCacheDir();
    
    const cacheDir = await getCacheDir();
    const dirExists = await exists(cacheDir);
    if (!dirExists) return [];
    
    const entries = await readDir(cacheDir);
    const results: CachedSingleComparison[] = [];
    
    for (const entry of entries) {
      if (entry.name && entry.name.endsWith('.json') && entry.name !== CACHE_METADATA_FILE) {
        try {
          const filePath = await join(cacheDir, entry.name);
          const content = await readTextFile(filePath);
          const cacheItem: CachedSingleComparison = JSON.parse(content);
          
          // 检查是否匹配基础路径
          if (cacheItem.basePaths.original === basePaths.original &&
              cacheItem.basePaths.gt === basePaths.gt &&
              cacheItem.basePaths.my === basePaths.my) {
            results.push(cacheItem);
          }
        } catch (error) {
          console.error(`读取缓存文件失败: ${entry.name}`, error);
        }
      }
    }
    
    return results;
  } catch (error) {
    console.error('获取所有缓存对比失败:', error);
    return [];
  }
};

// 获取所有缓存项的详细信息
export const getAllCacheDetails = async (): Promise<CachedSingleComparison[]> => {
  try {
    await ensureCacheDir();
    
    const cacheDir = await getCacheDir();
    const dirExists = await exists(cacheDir);
    if (!dirExists) return [];
    
    const entries = await readDir(cacheDir);
    const results: CachedSingleComparison[] = [];
    
    for (const entry of entries) {
      if (entry.name && entry.name.endsWith('.json') && entry.name !== CACHE_METADATA_FILE) {
        try {
          const filePath = await join(cacheDir, entry.name);
          const content = await readTextFile(filePath);
          const cacheItem: CachedSingleComparison = JSON.parse(content);
          results.push(cacheItem);
        } catch (error) {
          console.error(`读取缓存文件失败: ${entry.name}`, error);
        }
      }
    }
    
    // 按最后访问时间倒序排列
    return results.sort((a, b) => 
      new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime()
    );
  } catch (error) {
    console.error('获取缓存详细信息失败:', error);
    return [];
  }
};

// 检查特定对比是否有缓存
export const hasCachedComparison = async (basePaths: BaseFolderPaths, comparisonPath: string): Promise<boolean> => {
  const result = await getCachedSingleComparison(basePaths, comparisonPath);
  return result !== null;
};

// 删除特定缓存
export const deleteSingleComparisonCache = async (cacheKey: string): Promise<void> => {
  try {
    const cacheFilePath = await getCacheFilePath(cacheKey);
    const fileExists = await exists(cacheFilePath);
    
    if (fileExists) {
      await remove(cacheFilePath);
      await updateCacheMetadata();
    }
  } catch (error) {
    console.error('删除单个对比缓存失败:', error);
  }
};

// 清空所有缓存
export const clearAllCache = async (): Promise<void> => {
  try {
    const cacheDir = await getCacheDir();
    const dirExists = await exists(cacheDir);
    if (!dirExists) return;
    
    const entries = await readDir(cacheDir);
    
    for (const entry of entries) {
      if (entry.name && entry.name.endsWith('.json')) {
        try {
          const filePath = await join(cacheDir, entry.name);
          await remove(filePath);
        } catch (error) {
          console.error(`删除缓存文件失败: ${entry.name}`, error);
        }
      }
    }
    
    await updateCacheMetadata();
  } catch (error) {
    console.error('清空缓存失败:', error);
  }
};

// 获取缓存元数据
export const getCacheMetadata = async (): Promise<CacheMetadata> => {
  try {
    await ensureCacheDir();
    
    const metadataPath = await getCacheMetadataPath();
    const fileExists = await exists(metadataPath);
    
    if (fileExists) {
      const content = await readTextFile(metadataPath);
      return JSON.parse(content);
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
const updateCacheMetadata = async (): Promise<void> => {
  try {
    await ensureCacheDir();
    
    const cacheDir = await getCacheDir();
    const dirExists = await exists(cacheDir);
    
    if (!dirExists) {
      const metadata: CacheMetadata = {
        totalSize: 0,
        count: 0,
        lastCleanup: new Date().toISOString()
      };
      
      const metadataPath = await getCacheMetadataPath();
      await writeTextFile(metadataPath, JSON.stringify(metadata, null, 2));
      return;
    }
    
    const entries = await readDir(cacheDir);
    let totalSize = 0;
    let count = 0;
    
    for (const entry of entries) {
      if (entry.name && entry.name.endsWith('.json') && entry.name !== CACHE_METADATA_FILE) {
        count++;
        // 简单的大小估算
        try {
          const filePath = await join(cacheDir, entry.name);
          const content = await readTextFile(filePath);
          totalSize += new Blob([content]).size;
        } catch (error) {
          console.error(`计算文件大小失败: ${entry.name}`, error);
        }
      }
    }
    
    const currentMetadata = await getCacheMetadata();
    const metadata: CacheMetadata = {
      totalSize,
      count,
      lastCleanup: currentMetadata.lastCleanup
    };
    
    const metadataPath = await getCacheMetadataPath();
    await writeTextFile(metadataPath, JSON.stringify(metadata, null, 2));
  } catch (error) {
    console.error('更新缓存元数据失败:', error);
  }
};

// 清理过期缓存
export const cleanupExpiredCache = async (maxAge: number = 30): Promise<number> => {
  try {
    await ensureCacheDir();
    
    const cacheDir = await getCacheDir();
    const dirExists = await exists(cacheDir);
    if (!dirExists) return 0;
    
    const entries = await readDir(cacheDir);
    const cutoffDate = new Date(Date.now() - maxAge * 24 * 60 * 60 * 1000);
    
    let deletedCount = 0;
    
    for (const entry of entries) {
      if (entry.name && entry.name.endsWith('.json') && entry.name !== CACHE_METADATA_FILE) {
        try {
          const filePath = await join(cacheDir, entry.name);
          const content = await readTextFile(filePath);
          const cacheItem: CachedSingleComparison = JSON.parse(content);
          
          const lastAccessed = new Date(cacheItem.lastAccessedAt);
          if (lastAccessed < cutoffDate) {
            await remove(filePath);
            deletedCount++;
          }
        } catch (error) {
          console.error(`处理缓存文件失败: ${entry.name}`, error);
        }
      }
    }
    
    if (deletedCount > 0) {
      await updateCacheMetadata();
      
      const metadata = await getCacheMetadata();
      const updatedMetadata: CacheMetadata = {
        ...metadata,
        lastCleanup: new Date().toISOString()
      };
      
      const metadataPath = await getCacheMetadataPath();
      await writeTextFile(metadataPath, JSON.stringify(updatedMetadata, null, 2));
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