import React from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { showErrorDialog } from '../utils/errorDialog';
import { ValidationResult, FolderData } from '../types';
import { 
  useFolders, 
  useLoading,
  useSetFolders,
  useSetValidationResult,
  useSetLoading,
  useSetCurrentHistoryRecordId
} from '../store';
import FolderSelection from '../components/FolderSelection';

const FolderSelectionPage: React.FC = () => {
  const navigate = useNavigate();
  
  // 状态
  const folders = useFolders();
  const loading = useLoading();
  
  // 动作
  const setFolders = useSetFolders();
  const setValidationResult = useSetValidationResult();
  const setLoading = useSetLoading();
  const setCurrentHistoryRecordId = useSetCurrentHistoryRecordId();

  const handleFoldersSelected = async (selectedFolders: FolderData) => {
    setFolders(selectedFolders);
    setLoading(true);
    
    try {
      const comparisonPaths = selectedFolders.comparison.map(f => f.path);
      const allFolders = [selectedFolders.original, selectedFolders.gt, selectedFolders.my, ...comparisonPaths];
      const result = await invoke<ValidationResult>('validate_folders', { folders: allFolders });
      setValidationResult(result);
      navigate('/validation');
    } catch (err) {
      console.error('文件夹验证失败:', err);
      const errorMessage = typeof err === 'string' ? err : '文件夹验证失败，请检查路径是否正确';
      showErrorDialog(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleError = (errorMessage: string) => {
    showErrorDialog(errorMessage);
  };

  return (
    <FolderSelection
      onFoldersSelected={handleFoldersSelected}
      loading={loading}
      folders={folders}
      onMainFoldersChanged={() => setCurrentHistoryRecordId(null)}
      onError={handleError}
    />
  );
};

export default FolderSelectionPage;