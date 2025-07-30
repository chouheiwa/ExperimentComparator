import React, { useState } from 'react';
import { 
  Card, 
  List, 
  Button, 
  Typography, 
  Space, 
  Popconfirm, 
  Modal, 
  Input, 
  message,
  Tooltip,
  Empty,
  Statistic,
  Alert,
  Collapse,
  Tag
} from 'antd';
import { save, open } from '@tauri-apps/plugin-dialog';
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs';
import { 
  HistoryOutlined, 
  DeleteOutlined, 
  DownloadOutlined, 
  UploadOutlined, 
  PlayCircleOutlined,
  EditOutlined,
  CalendarOutlined,
  DatabaseOutlined,
  ClearOutlined,
  ReloadOutlined,
  FolderOpenOutlined
} from '@ant-design/icons';
import { HistoryRecord, CacheMetadata, CachedSingleComparison } from '../types';
import { exportHistoryToJson, importHistoryFromJson } from '../utils/history';
import { formatCacheSize } from '../utils';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

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

interface HistoryPanelProps {
  records: HistoryRecord[];
  onLoadRecord: (record: HistoryRecord) => void;
  onDeleteRecord: (id: string) => void;
  onUpdateRecord: (id: string, name: string, description?: string) => void;
  onImportRecords?: (records: HistoryRecord[]) => void;
  loading?: boolean;
  // 缓存管理相关
  onClearCache?: () => Promise<void>;
  onCleanupCache?: (maxAge?: number) => Promise<number>;
  cacheMetadata?: CacheMetadata | null;
  onRefreshCache?: () => Promise<void>;
  onGetAllCacheDetails?: () => Promise<CachedSingleComparison[]>;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({
  records,
  onLoadRecord,
  onDeleteRecord,
  onUpdateRecord,
  onImportRecords,
  loading = false,
  onClearCache,
  onCleanupCache,
  cacheMetadata,
  onRefreshCache,
  onGetAllCacheDetails
}) => {
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<HistoryRecord | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const handleExport = async () => {
    try {
      const jsonString = exportHistoryToJson(records);
      const defaultFileName = `datachoosing-history-${new Date().toISOString().split('T')[0]}.json`;
      
      // 弹出文件保存对话框让用户选择保存位置
      const filePath = await save({
        title: '导出历史记录',
        defaultPath: defaultFileName,
        filters: [{
          name: 'JSON 文件',
          extensions: ['json']
        }]
      });
      
      // 用户取消了对话框
      if (!filePath) {
        return;
      }
      
      // 写入文件
      await writeTextFile(filePath, jsonString);
      message.success(`历史记录导出成功！保存至：${filePath}`);
    } catch (error) {
      message.error('导出失败：' + error);
    }
  };

  const handleImport = async () => {
    if (!onImportRecords) return;
    
    try {
      // 弹出文件选择对话框
      const filePath = await open({
        title: '导入历史记录',
        filters: [{
          name: 'JSON 文件',
          extensions: ['json']
        }]
      });
      
      // 用户取消了对话框
      if (!filePath || Array.isArray(filePath)) {
        return;
      }
      
      // 读取文件内容
      const content = await readTextFile(filePath);
      const importedRecords = importHistoryFromJson(content);
      onImportRecords(importedRecords);
      message.success(`成功导入 ${importedRecords.length} 条历史记录！`);
    } catch (error) {
      message.error('导入失败：' + error);
    }
  };

  const handleEdit = (record: HistoryRecord) => {
    setEditingRecord(record);
    setEditName(record.name);
    setEditDescription(record.description || '');
    setEditModalVisible(true);
  };

  const handleEditSave = () => {
    if (!editingRecord || !editName.trim()) return;
    
    // 调用更新记录的函数
    onUpdateRecord(editingRecord.id, editName.trim(), editDescription);
    
    setEditModalVisible(false);
    setEditingRecord(null);
    setEditName('');
    setEditDescription('');
    message.success('记录更新成功！');
  };

    const handleClearCache = async () => {
    if (onClearCache) {
      try {
        await onClearCache();
        message.success('缓存已清空！');
      } catch (error) {
        message.error('清空缓存失败');
      }
    }
  };
  
  const handleCleanupCache = async () => {
    if (onCleanupCache) {
      try {
        const deletedCount = await onCleanupCache(30); // 清理30天前的缓存
        if (deletedCount > 0) {
          message.success(`已清理 ${deletedCount} 个过期缓存项！`);
        } else {
          message.info('没有发现过期的缓存项');
        }
      } catch (error) {
        message.error('清理缓存失败');
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const formatPath = (path: string, maxLength = 50) => {
    if (path.length <= maxLength) return path;
    const parts = path.split('/');
    const fileName = parts[parts.length - 1];
    if (fileName.length >= maxLength - 5) {
      return `...${fileName.slice(-(maxLength - 5))}`;
    }
    // 显示开头和结尾
    const start = path.slice(0, Math.floor((maxLength - 5) / 2));
    const end = path.slice(-Math.floor((maxLength - 5) / 2));
    return `${start}...${end}`;
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      {/* 历史记录卡片 */}
      <Card 
        title={
          <Space>
            <HistoryOutlined />
            历史记录
            <Text type="secondary">({records.length})</Text>
          </Space>
        }
        extra={
          <Space size={4}>
            {onImportRecords && (
              <Tooltip title="导入历史记录">
                <Button 
                  icon={<UploadOutlined />} 
                  onClick={handleImport}
                  size="small"
                  type="text"
                  style={{ padding: '2px 6px', minWidth: 'auto' }}
                />
              </Tooltip>
            )}
            <Tooltip title="导出历史记录">
              <Button 
                icon={<DownloadOutlined />} 
                onClick={handleExport}
                disabled={records.length === 0}
                size="small"
                type="text"
                style={{ padding: '2px 6px', minWidth: 'auto' }}
              />
            </Tooltip>
          </Space>
        }
        bodyStyle={{ padding: '16px' }}
      >
        {records.length === 0 ? (
          <Empty 
            description="暂无历史记录" 
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <List
            dataSource={records}
            renderItem={(record) => (
              <List.Item
                style={{ 
                  position: 'relative', 
                  paddingBottom: '40px',
                  paddingTop: '16px',
                  borderBottom: '1px solid #f0f0f0'
                }}
              >
                <List.Item.Meta
                  title={
                    <div style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                        <Text strong style={{ fontSize: '16px', maxWidth: '70%', wordBreak: 'break-word' }}>
                          {record.name}
                        </Text>
                        <Text type="secondary" style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                          <CalendarOutlined style={{ marginRight: '4px' }} />
                          {formatDate(record.createdAt)}
                        </Text>
                      </div>
                      {/* 显示主要路径信息作为副标题 */}
                      <div style={{ marginTop: '6px' }}>
                        <Space direction="vertical" size={2}>
                          <div>
                            <Text style={{ fontSize: '12px', color: '#8c8c8c' }}>GT标准:</Text>
                            <Text code style={{ fontSize: '11px', marginLeft: '8px' }}>
                              {formatPath(record.folders.gt, 80)}
                            </Text>
                          </div>
                          <div>
                            <Text style={{ fontSize: '12px', color: '#8c8c8c' }}>我的结果:</Text>
                            <Text code style={{ fontSize: '11px', marginLeft: '8px' }}>
                              {formatPath(record.folders.my, 80)}
                            </Text>
                          </div>
                        </Space>
                      </div>
                    </div>
                  }
                  description={
                    <div style={{ marginTop: '8px' }}>
                      {record.description && (
                        <Paragraph 
                          style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#666' }}
                        >
                          {record.description}
                        </Paragraph>
                      )}
                      <Space direction="vertical" size={4} style={{ width: '100%' }}>
                        {record.folders.original && (
                          <div>
                            <Text style={{ fontSize: '12px', color: '#8c8c8c' }}>原始图片:</Text>
                            <Text code style={{ fontSize: '11px', marginLeft: '8px' }}>
                              {formatPath(record.folders.original, 80)}
                            </Text>
                          </div>
                        )}
                        <div>
                          <Text style={{ fontSize: '12px', color: '#8c8c8c' }}>对比数据:</Text>
                          <Text style={{ fontSize: '11px', marginLeft: '8px' }}>
                            {record.folders.comparison.map(comp => comp.name).join(', ')} 
                            <Text type="secondary" style={{ marginLeft: '4px' }}>
                              ({record.folders.comparison.length} 个文件夹)
                            </Text>
                          </Text>
                        </div>
                      </Space>
                    </div>
                  }
                />
                
                {/* 右下角操作按钮 */}
                <div style={{
                  position: 'absolute',
                  bottom: '8px',
                  right: '8px',
                  display: 'flex',
                  gap: '4px'
                }}>
                  <Tooltip title="加载配置">
                    <Button
                      type="text"
                      icon={<PlayCircleOutlined />}
                      onClick={() => onLoadRecord(record)}
                      disabled={loading}
                      size="small"
                      style={{ 
                        padding: '2px 4px', 
                        minWidth: 'auto',
                        opacity: 0.6,
                        transition: 'opacity 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                    />
                  </Tooltip>
                  <Tooltip title="编辑">
                    <Button
                      type="text"
                      icon={<EditOutlined />}
                      onClick={() => handleEdit(record)}
                      size="small"
                      style={{ 
                        padding: '2px 4px', 
                        minWidth: 'auto',
                        opacity: 0.6,
                        transition: 'opacity 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                    />
                  </Tooltip>
                  <Popconfirm
                    title="确认删除"
                    description="确定要删除这条历史记录吗？"
                    onConfirm={() => onDeleteRecord(record.id)}
                    okText="删除"
                    cancelText="取消"
                    okType="danger"
                  >
                    <Tooltip title="删除">
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        size="small"
                        style={{ 
                          padding: '2px 4px', 
                          minWidth: 'auto',
                          opacity: 0.6,
                          transition: 'opacity 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                      />
                    </Tooltip>
                  </Popconfirm>
                </div>
              </List.Item>
            )}
          />
        )}
      </Card>

      {/* 缓存管理卡片 */}
      {(onClearCache || onCleanupCache || cacheMetadata) && (
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
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Statistic
                  title="缓存项数"
                  value={cacheMetadata.count}
                  suffix="个"
                  valueStyle={{ fontSize: '16px' }}
                />
                <Statistic
                  title="占用空间"
                  value={formatCacheSize(cacheMetadata.totalSize)}
                  valueStyle={{ fontSize: '16px' }}
                />
              </div>
              
              {cacheMetadata.count > 0 && (
                <>
                  <Alert
                    message="缓存说明"
                    description="缓存可以加速重复计算，但会占用存储空间。建议定期清理过期缓存。"
                    type="info"
                    showIcon
                    style={{ fontSize: '12px' }}
                  />
                  
                                    {/* 缓存详情展开 */}
                  {onGetAllCacheDetails && (
                    <CacheDetailsCollapse onGetAllCacheDetails={onGetAllCacheDetails} />
                  )}
                </>
              )}
              
              <Space style={{ width: '100%', justifyContent: 'center' }}>
                {onCleanupCache && (
                  <Tooltip title="清理30天前的过期缓存">
                    <Button
                      icon={<ClearOutlined />}
                      onClick={handleCleanupCache}
                      disabled={cacheMetadata.count === 0}
                    >
                      清理过期
                    </Button>
                  </Tooltip>
                )}
                
                {onClearCache && (
                  <Popconfirm
                    title="确认清空所有缓存"
                    description="这将删除所有缓存数据，无法恢复。确定继续吗？"
                    onConfirm={handleClearCache}
                    okText="确定"
                    cancelText="取消"
                    okType="danger"
                  >
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      disabled={cacheMetadata.count === 0}
                    >
                      清空全部
                    </Button>
                  </Popconfirm>
                )}
              </Space>
            </Space>
          )}
          
          {!cacheMetadata && (
            <Empty 
              description="缓存信息不可用" 
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </Card>
      )}

      {/* 编辑模态框 */}
      <Modal
        title="编辑历史记录"
        open={editModalVisible}
        onOk={handleEditSave}
        onCancel={() => setEditModalVisible(false)}
        okText="保存"
        cancelText="取消"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong>记录名称：</Text>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="请输入记录名称"
              style={{ marginTop: '4px' }}
            />
          </div>
          <div>
            <Text strong>描述：</Text>
            <TextArea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="请输入描述（可选）"
              rows={3}
              style={{ marginTop: '4px' }}
            />
          </div>
        </Space>
      </Modal>
    </Space>
  );
};

export default HistoryPanel; 