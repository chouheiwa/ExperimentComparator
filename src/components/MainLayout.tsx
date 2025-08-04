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
import { exportHistoryToJson, importHistoryFromJson } from '../utils/history';
import { save, open } from '@tauri-apps/plugin-dialog';
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs';
import { showErrorDialog } from '../utils/errorDialog';
import { HistoryRecord } from '../types';

const { Header, Content } = Layout;
const { Title } = Typography;

const MainLayout: React.FC = () => {
  const location = useLocation();
  
  // 抽屉状态
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerType, setDrawerType] = useState<DrawerType>(null);
  
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
    try {
      const jsonString = exportHistoryToJson(historyRecords);
      const defaultFileName = `datachoosing-history-${new Date().toISOString().split('T')[0]}.json`;
      
      // 检查是否在 Tauri 环境中
      if (typeof window !== 'undefined' && (window as any).__TAURI__) {
        const filePath = await save({
          title: '导出历史记录',
          defaultPath: defaultFileName,
          filters: [{
            name: 'JSON 文件',
            extensions: ['json']
          }]
        });

        if (filePath) {
          await writeTextFile(filePath, jsonString);
        }
      } else {
        // 在开发环境中，使用浏览器下载
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = defaultFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('导出历史记录失败:', error);
      showErrorDialog('导出历史记录失败');
    }
  };

  const handleHistoryImport = async () => {
    try {
      // 检查是否在 Tauri 环境中
       if (typeof window !== 'undefined' && (window as any).__TAURI__) {
        const filePath = await open({
          title: '导入历史记录',
          filters: [{
            name: 'JSON 文件',
            extensions: ['json']
          }]
        });

        if (filePath && !Array.isArray(filePath)) {
          const content = await readTextFile(filePath);
          const importedRecords = importHistoryFromJson(content);
          importHistoryRecords(importedRecords);
        }
      } else {
        // 在开发环境中，使用文件输入
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
              try {
                const content = e.target?.result as string;
                const importedRecords = importHistoryFromJson(content);
                importHistoryRecords(importedRecords);
              } catch (error) {
                showErrorDialog('导入历史记录失败：文件格式错误');
              }
            };
            reader.readAsText(file);
          }
        };
        input.click();
      }
    } catch (error) {
      console.error('导入历史记录失败:', error);
      showErrorDialog('导入历史记录失败');
    }
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
    </Layout>
  );
};

export default MainLayout;