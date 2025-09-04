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
  saveSingleComparisonCache,
  createSingleComparisonCache,
  clearAllCache,
  getCacheMetadata,
  cleanupExpiredCache,
  getAllCacheDetails,
  getCachedSingleComparison
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
  
  loadFromCacheIncremental: async (folders: FolderData) => {
    try {
      const basePaths: BaseFolderPaths = {
        original: folders.original,
        gt: folders.gt,
        my: folders.my
      };

    
      
      const cachedResults: ComparisonResult[] = [];
      const missingComparisons: ComparisonFolder[] = [];

      // 检查"我的结果"缓存
      const myResultsCache = await getCachedSingleComparison(basePaths, folders.my);
      let hasMyResults = false;
      if (myResultsCache) {
  
        cachedResults.push(...myResultsCache.results);
        hasMyResults = true;
      } else {
  
      }
      
      // 检查每个对比文件夹的缓存
      for (const compFolder of folders.comparison) {
        const comparisonCache = await getCachedSingleComparison(basePaths, compFolder.path);
        if (comparisonCache) {
  
          // 合并缓存结果到已有结果中
          for (const cachedResult of comparisonCache.results) {
            const existingResult = cachedResults.find(r => r.filename === cachedResult.filename);
            if (existingResult) {
              // 合并IOU和准确率分数
              existingResult.iou_scores = { ...existingResult.iou_scores, ...cachedResult.iou_scores };
              existingResult.accuracy_scores = { ...existingResult.accuracy_scores, ...cachedResult.accuracy_scores };
              existingResult.paths = { ...existingResult.paths, ...cachedResult.paths };
            } else {
              cachedResults.push(cachedResult);
            }
          }
        } else {
  
          missingComparisons.push(compFolder);
        }
      }

      // 如果没有"我的结果"缓存，添加到需要计算的列表
      if (!hasMyResults) {
        missingComparisons.unshift({
          id: 'my-results',
          name: '我的结果',
          path: folders.my
        });
      }

    
      
      return { cachedResults, missingComparisons };
    } catch (error) {
      console.error('缓存检查失败:', error);
      // 如果缓存检查失败，返回所有需要计算的对比
      const missingComparisons: ComparisonFolder[] = [
        {
          id: 'my-results',
          name: '我的结果',
          path: folders.my
        },
        ...folders.comparison
      ];
      return { cachedResults: [], missingComparisons };
    }
  },
  
  saveToCache: async (basePaths: BaseFolderPaths, comparisonFolders: ComparisonFolder[], results: ComparisonResult[]) => {
    try {
      // 为每个对比文件夹单独保存缓存
      for (const compFolder of comparisonFolders) {
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
          await saveSingleComparisonCache(cacheResult);
    
        }
      }
      
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
        await saveSingleComparisonCache(myResultsCacheResult);
  
      }
      
      // 刷新缓存元数据
      await get().refreshCacheMetadata();
    } catch (error) {
      console.error('保存缓存失败:', error);
    }
  },
  
  clearCache: async () => {
    try {
      await clearAllCache();
      const metadata = await getCacheMetadata();
      set((state) => {
        state.cacheMetadata = metadata;
        state.isUsingCache = false;
      });
    } catch (error) {
      console.error('清空缓存失败:', error);
    }
  },
  
  cleanupCache: async (maxAge: number = 30): Promise<number> => {
    try {
      const deletedCount = await cleanupExpiredCache(maxAge);
      
      // 刷新缓存元数据
      await get().refreshCacheMetadata();
      
      return deletedCount;
    } catch (error) {
      console.error('清理缓存失败:', error);
      return 0;
    }
  },
  
  refreshCacheMetadata: async () => {
    try {
      const metadata = await getCacheMetadata();
      set((state) => {
        state.cacheMetadata = metadata;
      });
      return metadata;
    } catch (error) {
      console.error('刷新缓存元数据失败:', error);
      return null;
    }
  },

  getAllCacheDetails: async () => {
    try {
      return await getAllCacheDetails();
    } catch (error) {
      console.error('获取缓存详情失败:', error);
      return [];
    }
  }
});