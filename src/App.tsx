import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { useInitializeApp } from './hooks/useInitializeApp';

const App: React.FC = () => {
  // 初始化应用
  useInitializeApp();

  return <RouterProvider router={router} />;
};

export default App; 