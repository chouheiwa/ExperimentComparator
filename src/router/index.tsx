import { createBrowserRouter, Navigate } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import { FolderSelectionPage, ValidationPage, ComparisonPage } from '../pages';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <FolderSelectionPage />,
      },
      {
        path: 'validation',
        element: <ValidationPage />,
      },
      {
        path: 'comparison',
        element: <ComparisonPage />,
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
]); 