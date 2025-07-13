import React from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { Layout, Steps, Alert, Spin, Typography, Row, Col } from 'antd';
import { FolderOutlined, CheckCircleOutlined, BarChartOutlined, DatabaseOutlined } from '@ant-design/icons';
import { ValidationResult, ComparisonResult, FolderData } from './types';
import { useAppState } from './hooks/useAppState';
import { getStepTitle } from './utils';
import FolderSelection from './components/FolderSelection';
import ValidationResults from './components/ValidationResults';
import ComparisonView from './components/ComparisonView';
import HistoryPanel from './components/HistoryPanel';

const { Header, Content } = Layout;
const { Title, Paragraph } = Typography;

const App: React.FC = () => {
  const {
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
  } = useAppState();

  const handleFoldersSelected = async (selectedFolders: FolderData) => {
    setFolders(selectedFolders);
    setLoading(true);
    setError(null);
    
    try {
      const comparisonPaths = selectedFolders.comparison.map(f => f.path);
      const allFolders = [selectedFolders.gt, selectedFolders.my, ...comparisonPaths];
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
    if (!state.validationResult) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const comparisonData = state.folders.comparison.map(f => ({
        name: f.name,
        path: f.path
      }));
      
      const results = await invoke<ComparisonResult[]>('calculate_comparisons', {
        gtFolder: state.folders.gt,
        myFolder: state.folders.my,
        comparisonFolders: comparisonData,
        commonFiles: state.validationResult.common_files
      });
      setComparisonResults(results);
      setCurrentStep('comparison');
      
      // 保存历史记录
      addHistoryRecord(state.folders);
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
    switch (state.currentStep) {
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
            数据选择对比工具
          </Title>
        </div>
      </Header>
      
      <Content style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
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

        {state.error && (
          <Alert
            message="错误"
            description={state.error}
            type="error"
            closable
            onClose={() => setError(null)}
            style={{ marginBottom: '24px' }}
          />
        )}

        <Spin spinning={state.loading} tip="处理中...">
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
              {getStepTitle(state.currentStep)}
            </div>

            {state.currentStep === 'folder-selection' && (
              <Row gutter={[24, 24]}>
                <Col xs={24} lg={16}>
                  <FolderSelection
                    onFoldersSelected={handleFoldersSelected}
                    loading={state.loading}
                    folders={state.folders}
                  />
                </Col>
                <Col xs={24} lg={8}>
                  <HistoryPanel
                    records={state.historyRecords}
                    onLoadRecord={loadHistoryRecord}
                    onDeleteRecord={deleteHistoryRecord}
                    onImportRecords={(records) => {
                      setHistoryRecords([...records, ...state.historyRecords]);
                    }}
                    loading={state.loading}
                  />
                </Col>
              </Row>
            )}

            {state.currentStep === 'validation' && state.validationResult && (
              <ValidationResults
                result={state.validationResult}
                onStartComparison={handleStartComparison}
                onReset={handleReset}
                loading={state.loading}
              />
            )}

            {state.currentStep === 'comparison' && state.comparisonResults.length > 0 && (
              <ComparisonView
                results={state.comparisonResults}
                onReset={handleReset}
              />
            )}
          </div>
        </Spin>
      </Content>
    </Layout>
  );
};

export default App; 