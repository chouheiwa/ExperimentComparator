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
  BaseFolderPaths,
  ComparisonResult
} from '../types';

// 缓存目录和文件配置
const CACHE_DIR_NAME = 'experiment_cache_v2';
const CACHE_METADATA_FILE = 'metadata.json';
const GT_INDEX_FILE = 'gt_index.json';

// GT索引结构
interface GTCacheIndex {
  gtPath: string;
  gtHash: string;
  comparisons: {
    comparisonPath: string;
    comparisonHash: string;
    fileName: string;
    lastAccessed: string;
    fileCount: number;
  }[];
  createdAt: string;
  lastAccessed: string;
}

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

// 生成路径哈希
const generatePathHash = (path: string): string => {
  let hash = 0;
  for (let i = 0; i < path.length; i++) {
    const char = path.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
};

// 生成缓存文件名
const generateCacheFileName = (gtPath: string, comparisonPath: string): string => {
  const gtHash = generatePathHash(gtPath);
  const compHash = generatePathHash(comparisonPath);
  return `${gtHash}_${compHash}.json`;
};

// 读取GT索引
const readGTIndex = async (): Promise<Record<string, GTCacheIndex>> => {
  try {
    await ensureCacheDir();
    const indexPath = await join(await getCacheDir(), GT_INDEX_FILE);

    const fileExists = await exists(indexPath);

    
    if (fileExists) {
      const content = await readTextFile(indexPath);
      const parsed = JSON.parse(content);

      return parsed;
    } else {

    }
  } catch (error) {
    console.error('[Cache Debug] 读取GT索引失败:', error);
  }
  
  return {};
};

// 保存GT索引
const saveGTIndex = async (index: Record<string, GTCacheIndex>): Promise<void> => {
  try {
    await ensureCacheDir();
    const indexPath = await join(await getCacheDir(), GT_INDEX_FILE);
    await writeTextFile(indexPath, JSON.stringify(index, null, 2));
  } catch (error) {
    console.error('保存GT索引失败:', error);
  }
};

// 查找缓存文件
export const getCachedSingleComparison = async (
  basePaths: BaseFolderPaths, 
  comparisonPath: string
): Promise<CachedSingleComparison | null> => {
  try {
    await ensureCacheDir();
    
    const gtIndex = await readGTIndex();
    const gtHash = generatePathHash(basePaths.gt);
    
  
    
    // 查找GT条目
    const gtEntry = gtIndex[gtHash];
    if (!gtEntry || gtEntry.gtPath !== basePaths.gt) {
  
      return null;
    }
    
    // 查找对比条目
    const comparisonEntry = gtEntry.comparisons.find(comp => comp.comparisonPath === comparisonPath);
    if (!comparisonEntry) {
  
      return null;
    }
    
    // 读取缓存文件
    const cacheFilePath = await join(await getCacheDir(), comparisonEntry.fileName);
    const fileExists = await exists(cacheFilePath);
    
    if (!fileExists) {
  
      return null;
    }
    
    const cacheData = await readTextFile(cacheFilePath);
    const result: CachedSingleComparison = JSON.parse(cacheData);
    
  
    
    // 更新访问时间
    comparisonEntry.lastAccessed = new Date().toISOString();
    gtEntry.lastAccessed = new Date().toISOString();
    result.lastAccessedAt = new Date().toISOString();
    
    // 保存更新
    await saveGTIndex(gtIndex);
    await writeTextFile(cacheFilePath, JSON.stringify(result, null, 2));
    
    return result;
  } catch (error) {
    console.error('获取缓存失败:', error);
    return null;
  }
};

// 保存缓存
export const saveSingleComparisonCache = async (result: CachedSingleComparison): Promise<void> => {
  try {
    await ensureCacheDir();
    
    const gtIndex = await readGTIndex();
    const gtHash = generatePathHash(result.basePaths.gt);
    const fileName = generateCacheFileName(result.basePaths.gt, result.comparisonPath);
    
    // 更新或创建GT条目
    if (!gtIndex[gtHash]) {
      gtIndex[gtHash] = {
        gtPath: result.basePaths.gt,
        gtHash,
        comparisons: [],
        createdAt: new Date().toISOString(),
        lastAccessed: new Date().toISOString()
      };
    }
    
    const gtEntry = gtIndex[gtHash];
    
    // 更新或添加对比条目
    let comparisonEntry = gtEntry.comparisons.find(comp => comp.comparisonPath === result.comparisonPath);
    if (!comparisonEntry) {
      comparisonEntry = {
        comparisonPath: result.comparisonPath,
        comparisonHash: generatePathHash(result.comparisonPath),
        fileName,
        lastAccessed: new Date().toISOString(),
        fileCount: result.results.length
      };
      gtEntry.comparisons.push(comparisonEntry);
    } else {
      comparisonEntry.lastAccessed = new Date().toISOString();
      comparisonEntry.fileCount = result.results.length;
    }
    
    gtEntry.lastAccessed = new Date().toISOString();
    
    // 保存缓存文件
    const cacheFilePath = await join(await getCacheDir(), fileName);
    await writeTextFile(cacheFilePath, JSON.stringify(result, null, 2));
    
    // 保存索引
    await saveGTIndex(gtIndex);
    
  
  } catch (error) {
    console.error('保存缓存失败:', error);
  }
};

// 创建缓存结果
export const createSingleComparisonCache = (
  basePaths: BaseFolderPaths,
  comparisonName: string,
  comparisonPath: string,
  results: ComparisonResult[]
): CachedSingleComparison => {
  const cacheKey = generateCacheFileName(basePaths.gt, comparisonPath);
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

// 获取指定basePaths的所有缓存
export const getAllCachedComparisons = async (basePaths: BaseFolderPaths): Promise<CachedSingleComparison[]> => {
  try {
    await ensureCacheDir();
    
    const gtIndex = await readGTIndex();
    const gtHash = generatePathHash(basePaths.gt);
    const gtEntry = gtIndex[gtHash];
    
    if (!gtEntry || gtEntry.gtPath !== basePaths.gt) {
      return [];
    }
    
    const results: CachedSingleComparison[] = [];
    
    for (const comparisonEntry of gtEntry.comparisons) {
      try {
        const cacheFilePath = await join(await getCacheDir(), comparisonEntry.fileName);
        const fileExists = await exists(cacheFilePath);
        
        if (fileExists) {
          const content = await readTextFile(cacheFilePath);
          const cacheItem: CachedSingleComparison = JSON.parse(content);
          
          // 检查是否匹配当前的basePaths
          if (cacheItem.basePaths.original === basePaths.original &&
              cacheItem.basePaths.my === basePaths.my) {
            results.push(cacheItem);
          }
        }
      } catch (error) {
        console.error(`读取缓存文件失败: ${comparisonEntry.fileName}`, error);
      }
    }
    
    return results;
  } catch (error) {
    console.error('获取所有缓存对比失败:', error);
    return [];
  }
};

// 获取所有缓存详情
export const getAllCacheDetails = async (): Promise<CachedSingleComparison[]> => {
  try {
    await ensureCacheDir();
  
    
    const gtIndex = await readGTIndex();
  
    const results: CachedSingleComparison[] = [];
    
    for (const gtEntry of Object.values(gtIndex)) {
      for (const comparisonEntry of gtEntry.comparisons) {
        try {
          const cacheFilePath = await join(await getCacheDir(), comparisonEntry.fileName);
          const fileExists = await exists(cacheFilePath);
          
          if (fileExists) {
            const content = await readTextFile(cacheFilePath);
            const cacheItem: CachedSingleComparison = JSON.parse(content);
            results.push(cacheItem);
          }
        } catch (error) {
          console.error(`读取缓存文件失败: ${comparisonEntry.fileName}`, error);
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

// 检查是否有缓存
export const hasCachedComparison = async (basePaths: BaseFolderPaths, comparisonPath: string): Promise<boolean> => {
  const result = await getCachedSingleComparison(basePaths, comparisonPath);
  return result !== null;
};

// 删除特定缓存
export const deleteSingleComparisonCache = async (cacheKey: string): Promise<void> => {
  try {
    await ensureCacheDir();
    
    const gtIndex = await readGTIndex();
    let found = false;
    
    // 从索引中找到并删除条目
    for (const [gtHash, gtEntry] of Object.entries(gtIndex)) {
      const comparisonIndex = gtEntry.comparisons.findIndex(comp => comp.fileName === cacheKey);
      if (comparisonIndex !== -1) {
        // 删除文件
        const cacheFilePath = await join(await getCacheDir(), cacheKey);
        const fileExists = await exists(cacheFilePath);
        if (fileExists) {
          await remove(cacheFilePath);
        }
        
        // 从索引中移除
        gtEntry.comparisons.splice(comparisonIndex, 1);
        
        // 如果GT下没有对比了，删除整个GT条目
        if (gtEntry.comparisons.length === 0) {
          delete gtIndex[gtHash];
        }
        
        found = true;
        break;
      }
    }
    
    if (found) {
      await saveGTIndex(gtIndex);
    }
  } catch (error) {
    console.error('删除缓存失败:', error);
  }
};

// 清空所有缓存
export const clearAllCache = async (): Promise<void> => {
  try {
    await ensureCacheDir();
    
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
  } catch (error) {
    console.error('清空缓存失败:', error);
  }
};

// 获取缓存元数据
export const getCacheMetadata = async (): Promise<CacheMetadata> => {
  try {
    await ensureCacheDir();
  
    
    const gtIndex = await readGTIndex();
  
    let totalSize = 0;
    let count = 0;
    
    // 计算总数和大小
    for (const gtEntry of Object.values(gtIndex)) {
      for (const comparisonEntry of gtEntry.comparisons) {
        count++;
        try {
          const cacheFilePath = await join(await getCacheDir(), comparisonEntry.fileName);
          const fileExists = await exists(cacheFilePath);
          if (fileExists) {
            const content = await readTextFile(cacheFilePath);
            totalSize += new Blob([content]).size;
          }
        } catch (error) {
          console.error(`计算文件大小失败: ${comparisonEntry.fileName}`, error);
        }
      }
    }
    
    const metadataPath = await join(await getCacheDir(), CACHE_METADATA_FILE);
    const fileExists = await exists(metadataPath);
    
    let lastCleanup = new Date().toISOString();
    if (fileExists) {
      try {
        const content = await readTextFile(metadataPath);
        const metadata = JSON.parse(content);
        lastCleanup = metadata.lastCleanup || lastCleanup;
      } catch (error) {
        console.error('读取缓存元数据失败:', error);
      }
    }
    
    const metadata: CacheMetadata = {
      totalSize,
      count,
      lastCleanup
    };
    
    // 保存元数据
    await writeTextFile(metadataPath, JSON.stringify(metadata, null, 2));
    
    return metadata;
  } catch (error) {
    console.error('获取缓存元数据失败:', error);
    return {
      totalSize: 0,
      count: 0,
      lastCleanup: new Date().toISOString()
    };
  }
};

// 清理过期缓存
export const cleanupExpiredCache = async (maxAge: number = 30): Promise<number> => {
  try {
    await ensureCacheDir();
    
    const gtIndex = await readGTIndex();
    const cutoffDate = new Date(Date.now() - maxAge * 24 * 60 * 60 * 1000);
    let deletedCount = 0;
    
    const updatedIndex: Record<string, GTCacheIndex> = {};
    
    for (const [gtHash, gtEntry] of Object.entries(gtIndex)) {
      const updatedComparisons = [];
      
      for (const comparisonEntry of gtEntry.comparisons) {
        const lastAccessed = new Date(comparisonEntry.lastAccessed);
        
        if (lastAccessed < cutoffDate) {
          // 删除过期文件
          try {
            const cacheFilePath = await join(await getCacheDir(), comparisonEntry.fileName);
            const fileExists = await exists(cacheFilePath);
            if (fileExists) {
              await remove(cacheFilePath);
              deletedCount++;
            }
          } catch (error) {
            console.error(`删除过期缓存文件失败: ${comparisonEntry.fileName}`, error);
          }
        } else {
          updatedComparisons.push(comparisonEntry);
        }
      }
      
      // 如果GT还有有效的对比，保留GT条目
      if (updatedComparisons.length > 0) {
        updatedIndex[gtHash] = {
          ...gtEntry,
          comparisons: updatedComparisons
        };
      }
    }
    
    if (deletedCount > 0) {
      await saveGTIndex(updatedIndex);
      
      // 更新清理时间
      const metadata = await getCacheMetadata();
      metadata.lastCleanup = new Date().toISOString();
      const metadataPath = await join(await getCacheDir(), CACHE_METADATA_FILE);
      await writeTextFile(metadataPath, JSON.stringify(metadata, null, 2));
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

// 重新导出兼容函数
export const generateBaseCacheKey = (basePaths: BaseFolderPaths): string => {
  return generatePathHash(basePaths.gt);
};

export const generateSingleComparisonCacheKey = (basePaths: BaseFolderPaths, comparisonPath: string): string => {
  return generateCacheFileName(basePaths.gt, comparisonPath);
};