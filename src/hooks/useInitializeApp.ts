import { useEffect } from 'react';
import { useInitialize } from '../store';

export const useInitializeApp = () => {
  const initialize = useInitialize();

  useEffect(() => {
    const initApp = async () => {
      try {
        await initialize();
      } catch (error) {
        console.error('应用初始化失败:', error);
      }
    };
    
    initApp();
  }, [initialize]);
}; 