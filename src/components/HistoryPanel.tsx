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
  Empty
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
  CalendarOutlined
} from '@ant-design/icons';
import { HistoryRecord } from '../types';
import { exportHistoryToJson, importHistoryFromJson } from '../utils/history';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

interface HistoryPanelProps {
  records: HistoryRecord[];
  onLoadRecord: (record: HistoryRecord) => void;
  onDeleteRecord: (id: string) => void;
  onUpdateRecord: (id: string, name: string, description?: string) => void;
  onImportRecords: (records: HistoryRecord[]) => void;
  loading?: boolean;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({
  records,
  onLoadRecord,
  onDeleteRecord,
  onUpdateRecord,
  onImportRecords,
  loading = false
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const formatPath = (path: string) => {
    const parts = path.split('/');
    return parts[parts.length - 1] || path;
  };

  return (
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
          <Tooltip title="导入历史记录">
            <Button 
              icon={<UploadOutlined />} 
              onClick={handleImport}
              size="small"
              type="text"
              style={{ padding: '2px 6px', minWidth: 'auto' }}
            />
          </Tooltip>
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
    </Card>
  );
};

export default HistoryPanel; 