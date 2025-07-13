import { useEffect } from 'react';
import { useInitialize } from '../store/appStore';

export const useInitializeApp = () => {
  const initialize = useInitialize();

  useEffect(() => {
    initialize();
  }, [initialize]);
}; 