import { StateCreator } from 'zustand';
import { AppStore, CacheActions } from '../types';
import { 
  FolderData, 
  ComparisonResult, 
  CacheMetadata,
  BaseFolderPaths,
  ComparisonFolder
} from '../../types';
import {
  getCachedSingleComparison,
  saveSingleComparisonCache,
  createSingleComparisonCache,
  clearAllCache,
  getCacheMetadata,
  cleanupExpiredCache
} from '../../utils';

export const createCacheActions: StateCreator<
  AppStore,
  [['zustand/immer', never]],
  [],
  CacheActions
> = (set, get, _api) => ({
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
    
    // 首先检查"我的结果"的缓存
    const myResultsCache = getCachedSingleComparison(basePaths, basePaths.my);
    if (myResultsCache) {
      console.log(`找到缓存: 我的结果`);
      // 更新路径信息
      myResultsCache.results.forEach(result => {
        result.paths['原始图片'] = `${basePaths.original}/${result.filename}`;
        result.paths['GT'] = `${basePaths.gt}/${result.filename}`;
        result.paths['我的结果'] = `${basePaths.my}/${result.filename}`;
      });
      cachedResults.push(...myResultsCache.results);
      hasCache = true;
    }
    
    // 检查每个对比文件夹的缓存
    folders.comparison.forEach(compFolder => {
      const cachedComparison = getCachedSingleComparison(basePaths, compFolder.path);
      
      if (cachedComparison) {
        console.log(`找到缓存: ${compFolder.name}`);
        // 更新缓存结果中的名称映射和路径信息
        cachedComparison.results.forEach(result => {
          // 将缓存中的名称更新为当前名称
          if (result.iou_scores[cachedComparison.comparisonName]) {
            result.iou_scores[compFolder.name] = result.iou_scores[cachedComparison.comparisonName];
            result.accuracy_scores[compFolder.name] = result.accuracy_scores[cachedComparison.comparisonName];
            
            // 重要：根据当前基础路径更新图片路径
            // 只更新基础路径和当前对比文件夹路径，不影响其他对比文件夹的路径
            result.paths['原始图片'] = `${basePaths.original}/${result.filename}`;
            result.paths['GT'] = `${basePaths.gt}/${result.filename}`;
            result.paths['我的结果'] = `${basePaths.my}/${result.filename}`;
            result.paths[compFolder.name] = `${compFolder.path}/${result.filename}`;
            
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
    
    // 同时为"我的结果"创建缓存记录
    const myResultsData = results.map(result => ({
      ...result,
      iou_scores: { '我的结果': result.iou_scores['我的结果'] },
      accuracy_scores: { '我的结果': result.accuracy_scores['我的结果'] },
      paths: { 
        '原始图片': result.paths['原始图片'],
        'GT': result.paths['GT'],
        '我的结果': result.paths['我的结果']
      }
    })).filter(result => 
      result.iou_scores['我的结果'] !== undefined || 
      result.accuracy_scores['我的结果'] !== undefined
    );
    
    if (myResultsData.length > 0) {
      const myResultsCacheResult = createSingleComparisonCache(
        basePaths,
        '我的结果',
        basePaths.my,
        myResultsData
      );
      saveSingleComparisonCache(myResultsCacheResult);
      console.log(`已保存缓存: 我的结果`);
    }
    
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
}); 