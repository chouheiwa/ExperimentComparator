import React from 'react';
import { Drawer } from 'antd';
import HistoryManagement from './HistoryManagement';
import CacheManagement from './CacheManagement';
import { HistoryRecord, CacheMetadata, CachedSingleComparison } from '../types';

export type DrawerType = 'history' | 'cache' | null;

interface SideDrawerProps {
  open: boolean;
  type: DrawerType;
  onClose: () => void;
  
  // 历史记录相关
  historyRecords: HistoryRecord[];
  onHistoryExport?: () => Promise<void>;
  onHistoryImport?: () => Promise<void>;
  onHistoryEdit?: (id: string, newName: string, newDescription?: string) => Promise<void>;
  onHistoryDelete?: (id: string) => Promise<void>;
  onHistoryView?: (record: HistoryRecord) => void;
  
  // 缓存管理相关
  onClearCache?: () => Promise<void>;
  onCleanupCache?: (maxAge?: number) => Promise<number>;
  cacheMetadata?: CacheMetadata | null;
  onRefreshCache?: () => Promise<void>;
  onGetAllCacheDetails?: () => Promise<CachedSingleComparison[]>;
}

const SideDrawer: React.FC<SideDrawerProps> = ({
  open,
  type,
  onClose,
  historyRecords,
  onHistoryExport,
  onHistoryImport,
  onHistoryEdit,
  onHistoryDelete,
  onHistoryView,
  onClearCache,
  onCleanupCache,
  cacheMetadata,
  onRefreshCache,
  onGetAllCacheDetails
}) => {
  const getTitle = () => {
    switch (type) {
      case 'history':
        return '历史记录管理';
      case 'cache':
        return '缓存管理';
      default:
        return '';
    }
  };

  const renderContent = () => {
    switch (type) {
      case 'history':
        return (
          <HistoryManagement
            historyRecords={historyRecords}
            onExport={onHistoryExport}
            onImport={onHistoryImport}
            onEdit={onHistoryEdit}
            onDelete={onHistoryDelete}
            onView={onHistoryView}
          />
        );
      case 'cache':
        return (
          <CacheManagement
            onClearCache={onClearCache}
            onCleanupCache={onCleanupCache}
            cacheMetadata={cacheMetadata}
            onRefreshCache={onRefreshCache}
            onGetAllCacheDetails={onGetAllCacheDetails}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Drawer
      title={getTitle()}
      placement="right"
      onClose={onClose}
      open={open}
      width={480}
      styles={{ body: { padding: '16px' } }}
      destroyOnClose
    >
      {renderContent()}
    </Drawer>
  );
};

export default SideDrawer;