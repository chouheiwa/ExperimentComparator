import { useState, useEffect } from 'react';
import { AppState, Step, FolderData, ValidationResult, ComparisonResult, HistoryRecord } from '../types';
import { 
  loadHistoryFromStorage, 
  saveHistoryToStorage, 
  createHistoryRecord,
  isDuplicateFolders 
} from '../utils/history';

export const useAppState = () => {
  const [state, setState] = useState<AppState>({
    currentStep: 'folder-selection',
    folders: {
      gt: '',
      my: '',
      comparison: []
    },
    validationResult: null,
    comparisonResults: [],
    loading: false,
    error: null,
    historyRecords: []
  });

  const setCurrentStep = (step: Step) => {
    setState(prev => ({ ...prev, currentStep: step }));
  };

  const setFolders = (folders: FolderData) => {
    setState(prev => ({ ...prev, folders }));
  };

  const setValidationResult = (result: ValidationResult | null) => {
    setState(prev => ({ ...prev, validationResult: result }));
  };

  const setComparisonResults = (results: ComparisonResult[]) => {
    setState(prev => ({ ...prev, comparisonResults: results }));
  };

  const setLoading = (loading: boolean) => {
    setState(prev => ({ ...prev, loading }));
  };

  const setError = (error: string | null) => {
    setState(prev => ({ ...prev, error }));
  };

  const setHistoryRecords = (records: HistoryRecord[]) => {
    setState(prev => ({ ...prev, historyRecords: records }));
    saveHistoryToStorage(records);
  };

  const addHistoryRecord = (folders: FolderData, name?: string, description?: string) => {
    // 检查是否已存在相同的配置
    if (isDuplicateFolders(folders, state.historyRecords)) {
      return null; // 返回null表示没有添加新记录
    }
    
    const newRecord = createHistoryRecord(folders, name, description);
    setState(prev => {
      const newRecords = [newRecord, ...prev.historyRecords];
      saveHistoryToStorage(newRecords);
      return { ...prev, historyRecords: newRecords };
    });
    return newRecord;
  };

  const deleteHistoryRecord = (id: string) => {
    setState(prev => {
      const newRecords = prev.historyRecords.filter(record => record.id !== id);
      saveHistoryToStorage(newRecords);
      return { ...prev, historyRecords: newRecords };
    });
  };

  const loadHistoryRecord = (record: HistoryRecord) => {
    // 处理向后兼容性：如果comparison是字符串数组，转换为ComparisonFolder数组
    let folders = record.folders;
    if (folders.comparison.length > 0 && typeof folders.comparison[0] === 'string') {
      folders = {
        ...folders,
        comparison: (folders.comparison as any as string[]).map((path: string, index: number) => ({
          id: `comp-${Date.now()}-${index}`,
          name: `对比数据 ${index + 1}`,
          path: path
        }))
      };
    }
    
    setFolders(folders);
    setError(null);
    
    // 重置到文件夹选择步骤
    setCurrentStep('folder-selection');
  };

  const resetState = () => {
    setState(prev => ({
      ...prev,
      currentStep: 'folder-selection',
      folders: {
        gt: '',
        my: '',
        comparison: []
      },
      validationResult: null,
      comparisonResults: [],
      loading: false,
      error: null
    }));
  };

  // 加载历史记录
  useEffect(() => {
    const savedRecords = loadHistoryFromStorage();
    setState(prev => ({ ...prev, historyRecords: savedRecords }));
  }, []);

  return {
    state,
    setCurrentStep,
    setFolders,
    setValidationResult,
    setComparisonResults,
    setLoading,
    setError,
    setHistoryRecords,
    addHistoryRecord,
    deleteHistoryRecord,
    loadHistoryRecord,
    resetState
  };
}; 