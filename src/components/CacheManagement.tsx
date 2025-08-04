import React, { useState } from 'react';
import { 
  Card, 
  List, 
  Button, 
  Space, 
  Statistic, 
  Alert, 
  Collapse, 
  Tag,
  Tooltip,
  Popconfirm
} from 'antd';
import { 
  DatabaseOutlined, 
  ClearOutlined, 
  ReloadOutlined, 
  FolderOpenOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { CacheMetadata, CachedSingleComparison } from '../types';
import { formatCacheSize } from '../utils';
import { showErrorDialog } from '../utils/errorDialog';

// 缓存详情展开组件
interface CacheDetailsCollapseProps {
  onGetAllCacheDetails: () => Promise<CachedSingleComparison[]>;
}

const CacheDetailsCollapse: React.FC<CacheDetailsCollapseProps> = ({ onGetAllCacheDetails }) => {
  const [cacheDetails, setCacheDetails] = useState<CachedSingleComparison[]>([]);
  const [loading, setLoading] = useState(false);

  const loadCacheDetails = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      const details = await onGetAllCacheDetails();
      setCacheDetails(details);
    } catch (error) {
      console.error('加载缓存详情失败:', error);
      setCacheDetails([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Collapse
      size="small"
      ghost
      onChange={(keys) => {
        if (keys.length > 0) {
          loadCacheDetails();
        }
      }}
      items={[
        {
          key: 'cache-details',
          label: (
            <Space>
              <FolderOpenOutlined />
              <span>查看缓存详情</span>
            </Space>
          ),
          children: loading ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <Space>
                <span>加载中...</span>
              </Space>
            </div>
          ) : (
            <List
              size="small"
              dataSource={cacheDetails}
              renderItem={(item) => (
                <List.Item style={{ padding: '8px 0' }}>
                  <List.Item.Meta
                    avatar={<FolderOpenOutlined style={{ color: '#1890ff', fontSize: '16px' }} />}
                    title={
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 500 }}>{item.comparisonName}</span>
                        <Tag color="blue" style={{ fontSize: '10px', padding: '0 4px', height: '18px', lineHeight: '16px' }}>
                          {item.results.length} 文件
                        </Tag>
                      </div>
                    }
                    description={
                      <div style={{ fontSize: '11px', color: '#666', lineHeight: '1.4' }}>
                        <div>
                          <strong>GT:</strong> {item.basePaths.gt}
                        </div>
                        <div>
                          <strong>对比:</strong> {item.comparisonPath}
                        </div>
                        <div>
                          <strong>最后访问:</strong> {new Date(item.lastAccessedAt).toLocaleString()}
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              )}
              style={{ maxHeight: '200px', overflow: 'auto' }}
            />
          )
        }
      ]}
    />
  );
};

interface CacheManagementProps {
  onClearCache?: () => Promise<void>;
  onCleanupCache?: (maxAge?: number) => Promise<number>;
  cacheMetadata?: CacheMetadata | null;
  onRefreshCache?: () => Promise<void>;
  onGetAllCacheDetails?: () => Promise<CachedSingleComparison[]>;
}

const CacheManagement: React.FC<CacheManagementProps> = ({
  onClearCache,
  onCleanupCache,
  cacheMetadata,
  onRefreshCache,
  onGetAllCacheDetails
}) => {
  const handleClearCache = async () => {
    if (onClearCache) {
      try {
        await onClearCache();
        // message.success('缓存已清空！');
      } catch (error) {
        showErrorDialog('清空缓存失败');
      }
    }
  };
  
  const handleCleanupCache = async () => {
    if (onCleanupCache) {
      try {
        const deletedCount = await onCleanupCache(30); // 清理30天前的缓存
        if (deletedCount > 0) {
          // message.success(`已清理 ${deletedCount} 个过期缓存项！`);
        } else {
          // message.info('没有发现过期的缓存项');
        }
      } catch (error) {
        showErrorDialog('清理缓存失败');
      }
    }
  };

  return (
    <Card
      title={
        <Space>
          <DatabaseOutlined />
          缓存管理
        </Space>
      }
      extra={
        onRefreshCache && (
          <Tooltip title="刷新缓存信息">
            <Button
              icon={<ReloadOutlined />}
              onClick={onRefreshCache}
              size="small"
              type="text"
              style={{ padding: '2px 6px', minWidth: 'auto' }}
            />
          </Tooltip>
        )
      }
      bodyStyle={{ padding: '16px' }}
    >
      {cacheMetadata && (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {/* 缓存统计信息 */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '12px',
            padding: '12px',
            backgroundColor: '#f8f9fa',
            borderRadius: '6px'
          }}>
            <Statistic
              title="缓存项数量"
              value={cacheMetadata.count}
              suffix="项"
              valueStyle={{ fontSize: '18px', color: '#1890ff' }}
            />
            <Statistic
              title="占用空间"
              value={formatCacheSize(cacheMetadata.totalSize)}
              valueStyle={{ fontSize: '18px', color: '#52c41a' }}
            />
          </div>

          {/* 缓存状态提示 */}
          {cacheMetadata.count > 0 ? (
            <Alert
              message="缓存状态良好"
              description={`当前有 ${cacheMetadata.count} 个缓存项，可以加速重复计算`}
              type="success"
              showIcon
              style={{ fontSize: '12px' }}
            />
          ) : (
            <Alert
              message="暂无缓存"
              description="进行对比计算后会自动生成缓存"
              type="info"
              showIcon
              style={{ fontSize: '12px' }}
            />
          )}

          {/* 缓存详情 */}
          {onGetAllCacheDetails && cacheMetadata.count > 0 && (
            <CacheDetailsCollapse onGetAllCacheDetails={onGetAllCacheDetails} />
          )}

          {/* 缓存操作按钮 */}
          <Space style={{ width: '100%', justifyContent: 'center' }}>
            {onCleanupCache && (
              <Popconfirm
                title="清理过期缓存"
                description="将清理30天前的缓存项，确定继续吗？"
                onConfirm={handleCleanupCache}
                okText="确定"
                cancelText="取消"
              >
                <Button 
                  icon={<DeleteOutlined />} 
                  size="small"
                  disabled={!cacheMetadata || cacheMetadata.count === 0}
                >
                  清理过期
                </Button>
              </Popconfirm>
            )}
            
            {onClearCache && (
              <Popconfirm
                title="清空所有缓存"
                description="这将删除所有缓存数据，确定继续吗？"
                onConfirm={handleClearCache}
                okText="确定"
                cancelText="取消"
                okType="danger"
              >
                <Button 
                  icon={<ClearOutlined />} 
                  danger 
                  size="small"
                  disabled={!cacheMetadata || cacheMetadata.count === 0}
                >
                  清空缓存
                </Button>
              </Popconfirm>
            )}
          </Space>
        </Space>
      )}
    </Card>
  );
};

export default CacheManagement;