import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
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
  useSetCurrentStep,
  useSetFolders,
  useSetValidationResult,
  useSetComparisonResults,
  useSetLoading,
  useSetError,
  useSetHistoryRecords,
  useAddHistoryRecord,
  useDeleteHistoryRecord,
  useUpdateHistoryRecord,
  useSetCurrentHistoryRecordId,
  useLoadHistoryRecord,
  useResetState
} from './store/appStore';
import { useInitializeApp } from './hooks/useInitializeApp';
import { getStepTitle } from './utils';
import FolderSelection from './components/FolderSelection';
import ValidationResults from './components/ValidationResults';
import ComparisonView from './components/ComparisonView';
import AnalysisView from './components/AnalysisView';
import HistoryPanel from './components/HistoryPanel';

const { Header, Content } = Layout;
const { Title, Paragraph } = Typography;

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
  
  // 动作
  const setCurrentStep = useSetCurrentStep();
  const setFolders = useSetFolders();
  const setValidationResult = useSetValidationResult();
  const setComparisonResults = useSetComparisonResults();
  const setLoading = useSetLoading();
  const setError = useSetError();
  const setHistoryRecords = useSetHistoryRecords();
  const addHistoryRecord = useAddHistoryRecord();
  const deleteHistoryRecord = useDeleteHistoryRecord();
  const updateHistoryRecord = useUpdateHistoryRecord();
  const setCurrentHistoryRecordId = useSetCurrentHistoryRecordId();
  const loadHistoryRecord = useLoadHistoryRecord();
  const resetState = useResetState();

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
      setError(err as string);
    } finally {
      setLoading(false);
    }
  };

  const handleStartComparison = async () => {
    if (!validationResult) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const comparisonData = folders.comparison.map(f => ({
        name: f.name,
        path: f.path
      }));
      
      const results = await invoke<ComparisonResult[]>('calculate_comparisons', {
        originalFolder: folders.original,
        gtFolder: folders.gt,
        myFolder: folders.my,
        comparisonFolders: comparisonData,
        commonFiles: validationResult.common_files
      });
      setComparisonResults(results);
      setCurrentStep('comparison');
      
      // 保存历史记录
      addHistoryRecord(folders);
    } catch (err) {
      setError(err as string);
    } finally {
      setLoading(false);
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
          justifyContent: 'center',
          height: '100%'
        }}>
          <DatabaseOutlined style={{ fontSize: '32px', color: '#1890ff', marginRight: '16px' }} />
          <Title level={2} style={{ margin: 0, color: '#333' }}>
            ExperimentComparator
          </Title>
        </div>
      </Header>
      
      <Content style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Paragraph style={{ fontSize: '16px', color: '#666' }}>
            模型实验结果对比分析工具
          </Paragraph>
        </div>

        <Steps 
          current={getCurrentStepIndex()} 
          items={steps}
          style={{ marginBottom: '32px' }}
        />

        {error && (
          <Alert
            message="错误"
            description={error}
            type="error"
            closable
            onClose={() => setError(null)}
            style={{ marginBottom: '24px' }}
          />
        )}

        <Spin spinning={loading} tip="处理中...">
          <div style={{ 
            backgroundColor: '#fff', 
            borderRadius: '8px', 
            padding: '32px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{ 
              fontSize: '20px', 
              fontWeight: 'bold', 
              marginBottom: '24px',
              color: '#333',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              {steps[getCurrentStepIndex()].icon}
              {getStepTitle(currentStep)}
            </div>

            {currentStep === 'folder-selection' && (
              <Row gutter={[24, 24]}>
                <Col xs={24} md={24} lg={16} xl={18}>
                  <FolderSelection
                    onFoldersSelected={handleFoldersSelected}
                    loading={loading}
                    folders={folders}
                    onMainFoldersChanged={() => setCurrentHistoryRecordId(null)}
                  />
                </Col>
                <Col xs={24} md={24} lg={8} xl={6}>
                  <HistoryPanel
                    records={historyRecords}
                    onLoadRecord={loadHistoryRecord}
                    onDeleteRecord={deleteHistoryRecord}
                    onUpdateRecord={updateHistoryRecord}
                    onImportRecords={(records) => {
                      setHistoryRecords([...records, ...historyRecords]);
                    }}
                    loading={loading}
                  />
                </Col>
              </Row>
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
              <div>
                <div style={{ marginBottom: '16px', textAlign: 'center' }}>
                  <Space align="center">
                    <EyeOutlined />
                    <span>浏览模式</span>
                    <Switch
                      checked={useAnalysisView}
                      onChange={setUseAnalysisView}
                      checkedChildren="分析"
                      unCheckedChildren="详细"
                    />
                    <TableOutlined />
                    <span>分析模式</span>
                  </Space>
                </div>
                {useAnalysisView ? (
                  <AnalysisView
                    results={comparisonResults}
                    onReset={handleReset}
                  />
                ) : (
                  <ComparisonView
                    results={comparisonResults}
                    onReset={handleReset}
                  />
                )}
              </div>
            )}
          </div>
        </Spin>
      </Content>
    </Layout>
  );
};

export default App; 