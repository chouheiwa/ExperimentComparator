import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';

import { AppStore, initialState } from './types';
import { createFolderActions } from './actions/folderActions';
import { createHistoryActions } from './actions/historyActions';
import { createCacheActions } from './actions/cacheActions';
import { createProgressActions } from './actions/progressActions';
import { loadHistoryFromStorage } from '../utils/history';
import { getCacheMetadata } from '../utils';
import { getAppVersion } from '../utils/version';

export const useAppStore = create<AppStore>()(
  subscribeWithSelector(
    immer((set, get, api) => ({
      ...initialState,
      
      // 合并所有action creators
      ...createFolderActions(set, get, api),
      ...createProgressActions(set, get, api),
      ...createHistoryActions(set, get, api),
      ...createCacheActions(set, get, api),
      
      // 应用初始化
      initialize: async () => {
        const savedRecords = loadHistoryFromStorage();
        
        // 检查版本号，如果不匹配则清空缓存
        try {
          const currentVersion = getAppVersion();
          const cacheMetadata = await getCacheMetadata();
          
          if (cacheMetadata && cacheMetadata.version !== currentVersion) {
            console.log(`版本号不匹配 (缓存: ${cacheMetadata.version}, 当前: ${currentVersion})，清空缓存`);
            await get().clearCache();
          } else {
            console.log('版本号匹配，保留缓存');
          }
        } catch (error) {
          console.error('版本检查或缓存操作失败:', error);
        }
        
        const finalCacheMetadata = await getCacheMetadata();
        set((state) => {
          state.historyRecords = savedRecords;
          state.cacheMetadata = finalCacheMetadata;
        });
      }
    }))
  )
);