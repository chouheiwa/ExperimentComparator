import { StateCreator } from 'zustand';
import { AppStore, ProgressActions } from '../types';
import { ProgressInfo } from '../../types';

export const createProgressActions: StateCreator<
  AppStore,
  [["zustand/immer", never]],
  [],
  ProgressActions
> = (set, get) => ({
  setProgressInfo: (progress: ProgressInfo | null) => {
    set((state) => {
      state.progressInfo = progress;
    });
  },

  updateProgress: (current: number, total: number, currentFileName?: string) => {
    set((state) => {
      const now = Date.now();
      const percentage = Math.round((current / total) * 100);
      
      // 计算预计剩余时间
      let estimatedTimeRemaining: number | undefined;
      let speed: number | undefined;
      
      if (state.progressInfo && state.progressInfo.startTime) {
        const elapsedTime = (now - state.progressInfo.startTime) / 1000; // 转换为秒
        if (current > 0 && elapsedTime > 0) {
          speed = current / elapsedTime; // 个/秒
          const remaining = total - current;
          estimatedTimeRemaining = remaining / speed;
        }
      }
      
      state.progressInfo = {
        current,
        total,
        percentage,
        currentFileName,
        estimatedTimeRemaining,
        startTime: state.progressInfo?.startTime || now,
        speed
      };
    });
  },

  resetProgress: () => {
    set((state) => {
      state.progressInfo = null;
    });
  }
}); 