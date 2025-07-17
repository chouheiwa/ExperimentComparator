import { useEffect } from 'react';
import { useInitialize } from '../store';

export const useInitializeApp = () => {
  const initialize = useInitialize();

  useEffect(() => {
    initialize();
  }, [initialize]);
}; 