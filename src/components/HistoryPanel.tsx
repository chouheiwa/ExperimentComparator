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
  Divider,
  Statistic,
  Alert
} from 'antd';
import { save, open } from '@tauri-apps/api/dialog';
import { writeTextFile, readTextFile } from '@tauri-apps/api/fs';
import { 
  HistoryOutlined, 
  DeleteOutlined, 
  DownloadOutlined, 
  UploadOutlined, 
  PlayCircleOutlined,
  EditOutlined,
  FolderOutlined,
  CalendarOutlined,
  DatabaseOutlined,
  ClearOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { HistoryRecord, CacheMetadata } from '../types';
import { exportHistoryToJson, importHistoryFromJson } from '../utils/history';
import { formatCacheSize } from '../utils';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

interface HistoryPanelProps {
  records: HistoryRecord[];
  onLoadRecord: (record: HistoryRecord) => void;
  onDeleteRecord: (id: string) => void;
  onUpdateRecord: (id: string, name: string, description?: string) => void;
  onImportRecords?: (records: HistoryRecord[]) => void;
  loading?: boolean;
  // 缓存管理相关
  onClearCache?: () => void;
  onCleanupCache?: (maxAge?: number) => number;
  cacheMetadata?: CacheMetadata | null;
  onRefreshCache?: () => void;
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
  onRefreshCache
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

  const handleClearCache = () => {
    if (onClearCache) {
      onClearCache();
      message.success('缓存已清空！');
    }
  };

  const handleCleanupCache = () => {
    if (onCleanupCache) {
      const deletedCount = onCleanupCache(30); // 清理30天前的缓存
      if (deletedCount > 0) {
        message.success(`已清理 ${deletedCount} 个过期缓存项！`);
      } else {
        message.info('没有发现过期的缓存项');
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const formatPath = (path: string) => {
    const parts = path.split('/');
    return parts[parts.length - 1] || path;
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
                style={{ position: 'relative', paddingBottom: '32px' }}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <Text strong>{record.name}</Text>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        <CalendarOutlined style={{ marginRight: '4px' }} />
                        {formatDate(record.createdAt)}
                      </Text>
                    </Space>
                  }
                  description={
                    <div>
                      {record.description && (
                        <Paragraph 
                          style={{ margin: '4px 0', fontSize: '12px' }}
                          type="secondary"
                        >
                          {record.description}
                        </Paragraph>
                      )}
                      <Space direction="vertical" size={2} style={{ width: '100%' }}>
                        {record.folders.original && (
                          <Space size={4}>
                            <Text style={{ fontSize: '12px' }}>原始:</Text>
                            <Text code style={{ fontSize: '11px' }}>
                              <FolderOutlined style={{ marginRight: '2px' }} />
                              {formatPath(record.folders.original)}
                            </Text>
                          </Space>
                        )}
                        <Space size={4}>
                          <Text style={{ fontSize: '12px' }}>GT:</Text>
                          <Text code style={{ fontSize: '11px' }}>
                            <FolderOutlined style={{ marginRight: '2px' }} />
                            {formatPath(record.folders.gt)}
                          </Text>
                        </Space>
                        <Space size={4}>
                          <Text style={{ fontSize: '12px' }}>我的:</Text>
                          <Text code style={{ fontSize: '11px' }}>
                            <FolderOutlined style={{ marginRight: '2px' }} />
                            {formatPath(record.folders.my)}
                          </Text>
                        </Space>
                        <Space size={4}>
                          <Text style={{ fontSize: '12px' }}>对比:</Text>
                          <Text style={{ fontSize: '11px' }}>
                            {record.folders.comparison.map(comp => comp.name).join(', ')} ({record.folders.comparison.length} 个)
                          </Text>
                        </Space>
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
                <Alert
                  message="缓存说明"
                  description="缓存可以加速重复计算，但会占用存储空间。建议定期清理过期缓存。"
                  type="info"
                  showIcon
                  style={{ fontSize: '12px' }}
                />
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