import React from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { Alert } from 'antd';
import { ValidationResult, FolderData } from '../types';
import { 
  useFolders, 
  useLoading, 
  useError,
  useSetFolders,
  useSetValidationResult,
  useSetLoading,
  useSetError,
  useSetCurrentHistoryRecordId
} from '../store';
import FolderSelection from '../components/FolderSelection';

const FolderSelectionPage: React.FC = () => {
  const navigate = useNavigate();
  
  // 状态
  const folders = useFolders();
  const loading = useLoading();
  const error = useError();
  
  // 动作
  const setFolders = useSetFolders();
  const setValidationResult = useSetValidationResult();
  const setLoading = useSetLoading();
  const setError = useSetError();
  const setCurrentHistoryRecordId = useSetCurrentHistoryRecordId();

  const handleFoldersSelected = async (selectedFolders: FolderData) => {
    setFolders(selectedFolders);
    setLoading(true);
    setError(null);
    
    try {
      const comparisonPaths = selectedFolders.comparison.map(f => f.path);
      const allFolders = [selectedFolders.original, selectedFolders.gt, selectedFolders.my, ...comparisonPaths];
      const result = await invoke<ValidationResult>('validate_folders', { folders: allFolders });
      setValidationResult(result);
      navigate('/validation');
    } catch (err) {
      console.error('文件夹验证失败:', err);
      setError(typeof err === 'string' ? err : '文件夹验证失败，请检查路径是否正确');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {error && (
        <Alert
          message="操作失败"
          description={error}
          type="error"
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: '24px' }}
        />
      )}
      
      <FolderSelection
        onFoldersSelected={handleFoldersSelected}
        loading={loading}
        folders={folders}
        onMainFoldersChanged={() => setCurrentHistoryRecordId(null)}
      />
    </>
  );
};

export default FolderSelectionPage; 