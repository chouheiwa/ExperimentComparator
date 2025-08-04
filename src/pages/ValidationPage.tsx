import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { showErrorDialog } from '../utils/errorDialog';
import { ComparisonResult } from '../types';
import { 
  useFolders,
  useValidationResult,
  useLoading,
  useProgressInfo,
  useSetComparisonResults,
  useSetLoading,
  useAddHistoryRecord,
  useLoadFromCacheIncremental,
  useSaveToCache,
  useUpdateProgress,
  useResetProgress,
  useResetState
} from '../store';
import ValidationResults from '../components/ValidationResults';
import ProgressIndicator from '../components/ProgressIndicator';

const ValidationPage: React.FC = () => {
  const navigate = useNavigate();
  
  // 状态
  const folders = useFolders();
  const validationResult = useValidationResult();
  const loading = useLoading();
  const progressInfo = useProgressInfo();
  
  // 动作
  const setComparisonResults = useSetComparisonResults();
  const setLoading = useSetLoading();
  const addHistoryRecord = useAddHistoryRecord();
  const loadFromCacheIncremental = useLoadFromCacheIncremental();
  const saveToCache = useSaveToCache();
  const updateProgress = useUpdateProgress();
  const resetProgress = useResetProgress();
  const resetState = useResetState();

  // 如果没有验证结果，重定向到文件夹选择页面
  useEffect(() => {
    if (!validationResult) {
      navigate('/');
    }
  }, [validationResult, navigate]);

  const handleStartComparison = async () => {
    if (!validationResult) return;
    
    setLoading(true);
    resetProgress(); // 重置进度状态
    
    try {
      console.log('开始增量对比流程...');
      
      // 检查缓存，获取已有结果和需要计算的对比
      console.log('检查缓存...');
      const { cachedResults, missingComparisons } = await loadFromCacheIncremental(folders);
      
      // 如果所有对比都有缓存，直接完成
      if (missingComparisons.length === 0 && cachedResults.length > 0) {
        console.log('所有对比都有缓存，直接使用缓存结果');
        // 设置对比结果到store
        setComparisonResults(cachedResults);
        // 保存历史记录
        addHistoryRecord(folders);
        setLoading(false);
        navigate('/comparison');
        return;
      }
      
      let allResults = [...cachedResults];
      let hasPartialCache = cachedResults.length > 0;
      
      // 只计算缺少缓存的对比
      if (missingComparisons.length > 0) {
        console.log(`需要计算 ${missingComparisons.length} 个对比: ${missingComparisons.map((c: any) => c.name).join(', ')}`);
        
        // 初始化进度信息
        const totalFiles = validationResult.common_files.length;
        updateProgress(0, totalFiles, '开始计算...');
        
        const comparisonData = missingComparisons.map((f: any) => ({
          name: f.name,
          path: f.path
        }));
        
        console.log('调用后端计算API...');
        
        try {
          const newResults = await invoke<ComparisonResult[]>('calculate_comparisons_with_progress', {
            originalFolder: folders.original,
            gtFolder: folders.gt,
            myFolder: folders.my,
            comparisonFolders: comparisonData,
            commonFiles: validationResult.common_files
          });
          
          console.log('新计算完成，合并结果...');
          
          // 合并缓存结果和新计算结果
          if (hasPartialCache) {
            // 需要合并结果
            const fileResultMap = new Map<string, ComparisonResult>();
            
            // 先添加缓存结果
            allResults.forEach(result => {
              fileResultMap.set(result.filename, { ...result });
            });
            
            // 合并新计算的结果
            newResults.forEach(newResult => {
              if (fileResultMap.has(newResult.filename)) {
                const existingResult = fileResultMap.get(newResult.filename)!;
                // 合并IOU和准确率分数以及路径
                Object.assign(existingResult.iou_scores, newResult.iou_scores);
                Object.assign(existingResult.accuracy_scores, newResult.accuracy_scores);
                Object.assign(existingResult.paths, newResult.paths);
              } else {
                fileResultMap.set(newResult.filename, { ...newResult });
              }
            });
            
            allResults = Array.from(fileResultMap.values());
          } else {
            allResults = newResults;
          }
          
          // 保存新计算的结果到缓存
          console.log('保存新结果到缓存...');
          const basePaths = {
            original: folders.original,
            gt: folders.gt,
            my: folders.my
          };
          await saveToCache(basePaths, missingComparisons, newResults);
        } catch (error) {
          throw error;
        }
      }
      
      console.log('设置最终结果...');
      setComparisonResults(allResults);
      
      // 设置缓存状态
      if (hasPartialCache && missingComparisons.length === 0) {
        // 完全使用缓存
        console.log('完全使用缓存结果');
      } else if (hasPartialCache && missingComparisons.length > 0) {
        // 部分使用缓存
        console.log('部分使用缓存，部分新计算');
      } else {
        // 完全新计算
        console.log('完全新计算结果');
      }
      
      console.log('对比流程完成');
      
      // 保存历史记录
      addHistoryRecord(folders);
      
      // 导航到对比页面
      navigate('/comparison');
      
    } catch (err) {
      console.error('对比计算失败:', err);
      const errorMessage = typeof err === 'string' ? err : '对比计算失败，请稍后重试';
      showErrorDialog(errorMessage);
    } finally {
      setLoading(false);
      // 延迟重置进度，让用户看到完成状态
      setTimeout(() => {
        resetProgress();
      }, 2000);
    }
  };

  const handleReset = () => {
    resetState();
    navigate('/');
  };

  if (!validationResult) {
    return null; // 或者显示加载状态
  }

  return (
    <>
      {/* 根据是否有进度信息来决定显示方式 */}
      {progressInfo ? (
        <ProgressIndicator progressInfo={progressInfo} />
      ) : (
        <ValidationResults
          result={validationResult}
          onStartComparison={handleStartComparison}
          onReset={handleReset}
          loading={loading}
        />
      )}
    </>
  );
};

export default ValidationPage;