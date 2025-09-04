import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { listen } from '@tauri-apps/api/event';
import { Layout, Steps, Alert, Spin, Typography, Space, Button, Tooltip } from 'antd';
import { FolderOutlined, CheckCircleOutlined, BarChartOutlined, DatabaseOutlined, HistoryOutlined } from '@ant-design/icons';
import { 
  useLoading,
  useHistoryRecords,
  useCacheMetadata,
  useIsUsingCache,
  useProgressInfo,
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
import SideDrawer, { DrawerType } from './SideDrawer';
import HistoryJsonModal from './HistoryJsonModal';
import { HistoryRecord } from '../types';

const { Header, Content } = Layout;
const { Title } = Typography;

const MainLayout: React.FC = () => {
  const location = useLocation();
  
  // 抽屉状态
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerType, setDrawerType] = useState<DrawerType>(null);
  
  // JSON弹窗状态
  const [jsonModalVisible, setJsonModalVisible] = useState(false);
  const [jsonModalMode, setJsonModalMode] = useState<'export' | 'import'>('export');
  
  // 状态
  const loading = useLoading();
  const historyRecords = useHistoryRecords();
  const cacheMetadata = useCacheMetadata();
  const isUsingCache = useIsUsingCache();
  const progressInfo = useProgressInfo();
  
  // 动作
  const deleteHistoryRecord = useDeleteHistoryRecord();
  const updateHistoryRecord = useUpdateHistoryRecord();
  const loadHistoryRecord = useLoadHistoryRecord();
  const importHistoryRecords = useImportHistoryRecords();
  const clearCache = useClearCache();
  const cleanupCache = useCleanupCache();
  const refreshCacheMetadata = useRefreshCacheMetadata();
  const updateProgress = useUpdateProgress();
  const getAllCacheDetails = useGetAllCacheDetails();

  // 抽屉处理函数
  const openDrawer = (type: DrawerType) => {
    setDrawerType(type);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setDrawerType(null);
  };

  // 历史记录处理函数
  const handleHistoryExport = async () => {
    setJsonModalMode('export');
    setJsonModalVisible(true);
  };

  const handleHistoryImport = async () => {
    setJsonModalMode('import');
    setJsonModalVisible(true);
  };

  const handleJsonModalImport = async (records: HistoryRecord[]) => {
    importHistoryRecords(records);
  };

  // 包装函数以匹配异步签名
  const handleHistoryEdit = async (id: string, newName: string, newDescription?: string) => {
    updateHistoryRecord(id, newName, newDescription);
  };

  const handleHistoryDelete = async (id: string) => {
    deleteHistoryRecord(id);
  };

  const handleHistoryView = (record: HistoryRecord) => {
    loadHistoryRecord(record);
  };

  // 监听来自 Rust 后端的进度事件
  useEffect(() => {
    // 检查是否在 Tauri 环境中
    if (typeof window === 'undefined' || !(window as any).__TAURI__) {
      return;
    }

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
            
            <Space>
              <Tooltip title="历史记录管理">
                <Button
                  icon={<HistoryOutlined />}
                  onClick={() => openDrawer('history')}
                  type="text"
                  style={{ color: '#1890ff' }}
                >
                  历史记录
                </Button>
              </Tooltip>
              
              <Tooltip title="缓存管理">
                <Button
                  icon={<DatabaseOutlined />}
                  onClick={() => openDrawer('cache')}
                  type="text"
                  style={{ color: '#1890ff' }}
                >
                  缓存管理
                </Button>
              </Tooltip>
            </Space>
          </div>
        </div>
      </Header>

      <Layout>
        <Content style={{ padding: '24px' }}>
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', marginBottom: '24px' }}>
            <Steps
              current={getCurrentStepIndex()}
              items={steps}
              style={{ marginBottom: '32px' }}
            />

            <Spin spinning={loading && !progressInfo} tip="处理中...">
              <Outlet />
            </Spin>
          </div>
        </Content>
      </Layout>

      {/* 右侧抽屉 */}
      <SideDrawer
        open={drawerOpen}
        type={drawerType}
        onClose={closeDrawer}
        historyRecords={historyRecords}
        onHistoryExport={handleHistoryExport}
        onHistoryImport={handleHistoryImport}
        onHistoryEdit={handleHistoryEdit}
        onHistoryDelete={handleHistoryDelete}
        onHistoryView={handleHistoryView}
        onClearCache={clearCache}
        onCleanupCache={cleanupCache}
        cacheMetadata={cacheMetadata}
        onRefreshCache={refreshCacheMetadata}
        onGetAllCacheDetails={getAllCacheDetails}
      />
      
      {/* JSON编辑弹窗 */}
      <HistoryJsonModal
        visible={jsonModalVisible}
        onClose={() => setJsonModalVisible(false)}
        mode={jsonModalMode}
        historyRecords={historyRecords}
        onImport={handleJsonModalImport}
      />
    </Layout>
  );
};

export default MainLayout;