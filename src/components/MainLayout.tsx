import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { listen } from '@tauri-apps/api/event';
import { Layout, Steps, Alert, Spin, Typography, Row, Col, Space } from 'antd';
import { FolderOutlined, CheckCircleOutlined, BarChartOutlined, DatabaseOutlined } from '@ant-design/icons';
import { 
  useLoading, 
  useError,
  useHistoryRecords,
  useCacheMetadata,
  useIsUsingCache,
  useProgressInfo,
  useSetError,
  useDeleteHistoryRecord,
  useUpdateHistoryRecord,
  useLoadHistoryRecord,
  useImportHistoryRecords,
  useClearCache,
  useCleanupCache,
  useRefreshCacheMetadata,
  useUpdateProgress,
  useGetAllCacheDetails
} from '../store';
import HistoryPanel from './HistoryPanel';

const { Header, Content } = Layout;
const { Title } = Typography;

const MainLayout: React.FC = () => {
  const location = useLocation();
  
  // 状态
  const loading = useLoading();
  const error = useError();
  const historyRecords = useHistoryRecords();
  const cacheMetadata = useCacheMetadata();
  const isUsingCache = useIsUsingCache();
  const progressInfo = useProgressInfo();
  
  // 动作
  const setError = useSetError();
  const deleteHistoryRecord = useDeleteHistoryRecord();
  const updateHistoryRecord = useUpdateHistoryRecord();
  const loadHistoryRecord = useLoadHistoryRecord();
  const importHistoryRecords = useImportHistoryRecords();
  const clearCache = useClearCache();
  const cleanupCache = useCleanupCache();
  const refreshCacheMetadata = useRefreshCacheMetadata();
  const updateProgress = useUpdateProgress();
  const getAllCacheDetails = useGetAllCacheDetails();

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

  const getCurrentStepIndex = () => {
    switch (location.pathname) {
      case '/':
        return 0;
      case '/validation':
        return 1;
      case '/comparison':
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

  // 在验证页面时隐藏历史记录面板
  const showHistoryPanel = location.pathname !== '/validation';

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
            {location.pathname === '/comparison' && isUsingCache && (
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
            <Col span={showHistoryPanel ? 18 : 24}>
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

                <Spin spinning={loading && !progressInfo} tip="处理中...">
                  <Outlet />
                </Spin>
              </div>
            </Col>
            
            {/* 只在非验证步骤时显示历史记录面板 */}
            {showHistoryPanel && (
              <Col span={6}>
                <HistoryPanel
                  records={historyRecords}
                  onLoadRecord={loadHistoryRecord}
                  onDeleteRecord={deleteHistoryRecord}
                  onUpdateRecord={updateHistoryRecord}
                  onImportRecords={importHistoryRecords}
                  onClearCache={clearCache}
                  onCleanupCache={cleanupCache}
                  cacheMetadata={cacheMetadata}
                  onRefreshCache={refreshCacheMetadata}
                  onGetAllCacheDetails={getAllCacheDetails}
                />
              </Col>
            )}
          </Row>
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout; 