import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';
import { Layout, Steps, Alert, Spin, Typography, Row, Col, Switch, Space } from 'antd';
import { FolderOutlined, CheckCircleOutlined, BarChartOutlined, DatabaseOutlined, EyeOutlined, TableOutlined } from '@ant-design/icons';
import { ValidationResult, ComparisonResult, FolderData } from './types';
import { 
  useCurrentStep, 
  useFolders, 
  useValidationResult, 
  useComparisonResults, 
  useLoading, 
  useError,
  useHistoryRecords,
  useCacheMetadata,
  useIsUsingCache,
  useProgressInfo,
  useSetCurrentStep,
  useSetFolders,
  useSetValidationResult,
  useSetComparisonResults,
  useSetLoading,
  useSetError,
  useAddHistoryRecord,
  useDeleteHistoryRecord,
  useUpdateHistoryRecord,
  useSetCurrentHistoryRecordId,
  useLoadHistoryRecord,
  useResetState,
  useLoadFromCacheIncremental,
  useSaveToCache,
  useClearCache,
  useCleanupCache,
  useRefreshCacheMetadata,
  useSetProgressInfo,
  useUpdateProgress,
  useResetProgress
} from './store';
import { useInitializeApp } from './hooks/useInitializeApp';
import FolderSelection from './components/FolderSelection';
import ValidationResults from './components/ValidationResults';
import ComparisonView from './components/ComparisonView';
import AnalysisView from './components/AnalysisView';
import HistoryPanel from './components/HistoryPanel';
import ProgressIndicator from './components/ProgressIndicator';

const { Header, Content } = Layout;
const { Title } = Typography;

const App: React.FC = () => {
  // 初始化应用
  useInitializeApp();
  
  // 本地状态
  const [useAnalysisView, setUseAnalysisView] = useState(true);
  
  // 状态
  const currentStep = useCurrentStep();
  const folders = useFolders();
  const validationResult = useValidationResult();
  const comparisonResults = useComparisonResults();
  const loading = useLoading();
  const error = useError();
  const historyRecords = useHistoryRecords();
  const cacheMetadata = useCacheMetadata();
  const isUsingCache = useIsUsingCache();
  const progressInfo = useProgressInfo();
  
  // 动作
  const setCurrentStep = useSetCurrentStep();
  const setFolders = useSetFolders();
  const setValidationResult = useSetValidationResult();
  const setComparisonResults = useSetComparisonResults();
  const setLoading = useSetLoading();
  const setError = useSetError();
  const addHistoryRecord = useAddHistoryRecord();
  const deleteHistoryRecord = useDeleteHistoryRecord();
  const updateHistoryRecord = useUpdateHistoryRecord();
  const setCurrentHistoryRecordId = useSetCurrentHistoryRecordId();
  const loadHistoryRecord = useLoadHistoryRecord();
  const resetState = useResetState();
  const loadFromCacheIncremental = useLoadFromCacheIncremental();
  const saveToCache = useSaveToCache();
  const clearCache = useClearCache();
  const cleanupCache = useCleanupCache();
  const refreshCacheMetadata = useRefreshCacheMetadata();
  const setProgressInfo = useSetProgressInfo();
  const updateProgress = useUpdateProgress();
  const resetProgress = useResetProgress();

  // 监听来自 Rust 后端的进度事件
  useEffect(() => {
    const unlisten = listen('progress_update', (event) => {
      const progressData = event.payload as {
        current: number;
        total: number;
        percentage: number;
        current_file: string;
      };
      
      updateProgress(progressData.current, progressData.total, progressData.current_file);
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, [updateProgress]);

  const handleFoldersSelected = async (selectedFolders: FolderData) => {
    setFolders(selectedFolders);
    setLoading(true);
    setError(null);
    
    try {
      const comparisonPaths = selectedFolders.comparison.map(f => f.path);
      const allFolders = [selectedFolders.original, selectedFolders.gt, selectedFolders.my, ...comparisonPaths];
      const result = await invoke<ValidationResult>('validate_folders', { folders: allFolders });
      setValidationResult(result);
      setCurrentStep('validation');
    } catch (err) {
      console.error('文件夹验证失败:', err);
      setError(typeof err === 'string' ? err : '文件夹验证失败，请检查路径是否正确');
    } finally {
      setLoading(false);
    }
  };

  const handleStartComparison = async () => {
    if (!validationResult) return;
    
    setLoading(true);
    setError(null);
    resetProgress(); // 重置进度状态
    
    try {
      console.log('开始增量对比流程...');
      
      // 检查缓存，获取已有结果和需要计算的对比
      console.log('检查缓存...');
      const { cachedResults, missingComparisons } = loadFromCacheIncremental(folders);
      
      // 如果所有对比都有缓存，直接完成
      if (missingComparisons.length === 0 && cachedResults.length > 0) {
        console.log('所有对比都有缓存，直接使用缓存结果');
        // 保存历史记录
        addHistoryRecord(folders);
        setLoading(false);
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
          saveToCache(basePaths, missingComparisons, newResults);
        } catch (error) {
          throw error;
        }
      }
      
      console.log('设置最终结果...');
      setComparisonResults(allResults);
      setCurrentStep('comparison');
      
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
      
    } catch (err) {
      console.error('对比计算失败:', err);
      setError(typeof err === 'string' ? err : '对比计算失败，请稍后重试');
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
  };

  const getCurrentStepIndex = () => {
    switch (currentStep) {
      case 'folder-selection':
        return 0;
      case 'validation':
        return 1;
      case 'comparison':
        return 2;
      default:
        return 0;
    }
  };

  const steps = [
    {
      title: '选择文件夹',
      icon: <FolderOutlined />,
      description: '选择需要对比的文件夹',
    },
    {
      title: '验证文件',
      icon: <CheckCircleOutlined />,
      description: '验证文件一致性',
    },
    {
      title: '对比结果',
      icon: <BarChartOutlined />,
      description: '查看对比分析结果',
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Header style={{ backgroundColor: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          height: '100%' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
              实验结果对比工具
            </Title>
            {currentStep === 'comparison' && isUsingCache && (
              <Alert
                message="已使用缓存结果"
                description="当前显示的是之前计算过的缓存结果"
                type="info"
                showIcon
                style={{ marginLeft: '16px' }}
              />
            )}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {currentStep === 'comparison' && (
              <Space>
                <Switch
                  checked={useAnalysisView}
                  onChange={setUseAnalysisView}
                  checkedChildren={<TableOutlined />}
                  unCheckedChildren={<EyeOutlined />}
                />
                <span style={{ color: '#666' }}>
                  {useAnalysisView ? '分析视图' : '对比视图'}
                </span>
              </Space>
            )}
            
            {cacheMetadata && (
              <Space>
                <DatabaseOutlined style={{ color: '#1890ff' }} />
                <span style={{ color: '#666' }}>
                  缓存: {cacheMetadata.count} 项
                </span>
              </Space>
            )}
          </div>
        </div>
      </Header>

      <Layout>
        <Content style={{ padding: '24px' }}>
          <Row gutter={24}>
            <Col span={currentStep === 'validation' ? 24 : 18}>
              <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', marginBottom: '24px' }}>
                <Steps
                  current={getCurrentStepIndex()}
                  items={steps}
                  style={{ marginBottom: '32px' }}
                />

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

                {/* 根据是否有进度信息来决定显示方式 */}
                {progressInfo ? (
                  <div>
                    <ProgressIndicator progressInfo={progressInfo} />
                    {/* 进度条显示时不显示其他内容 */}
                  </div>
                ) : (
                  <Spin spinning={loading} tip="处理中...">
                    {currentStep === 'folder-selection' && (
                      <FolderSelection
                        onFoldersSelected={handleFoldersSelected}
                        loading={loading}
                        folders={folders}
                        onMainFoldersChanged={() => setCurrentHistoryRecordId(null)}
                      />
                    )}

                    {currentStep === 'validation' && validationResult && (
                      <ValidationResults
                        result={validationResult}
                        onStartComparison={handleStartComparison}
                        onReset={handleReset}
                        loading={loading}
                      />
                    )}

                    {currentStep === 'comparison' && comparisonResults.length > 0 && (
                      <>
                        {useAnalysisView ? (
                          <AnalysisView results={comparisonResults} onReset={handleReset} />
                        ) : (
                          <ComparisonView results={comparisonResults} onReset={handleReset} />
                        )}
                      </>
                    )}
                  </Spin>
                )}
              </div>
            </Col>
            
            {/* 只在非验证步骤时显示历史记录面板 */}
            {currentStep !== 'validation' && (
              <Col span={6}>
                <HistoryPanel
                  records={historyRecords}
                  onLoadRecord={loadHistoryRecord}
                  onDeleteRecord={deleteHistoryRecord}
                  onUpdateRecord={updateHistoryRecord}
                  onClearCache={clearCache}
                  onCleanupCache={cleanupCache}
                  cacheMetadata={cacheMetadata}
                  onRefreshCache={refreshCacheMetadata}
                />
              </Col>
            )}
          </Row>
        </Content>
      </Layout>
    </Layout>
  );
};

export default App; 