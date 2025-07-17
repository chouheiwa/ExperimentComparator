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
      initialize: () => {
        const savedRecords = loadHistoryFromStorage();
        set((state) => {
          state.historyRecords = savedRecords;
          state.cacheMetadata = getCacheMetadata();
        });
      }
    }))
  )
);