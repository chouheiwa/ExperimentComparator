import React, { useState } from 'react';
import { 
  Card, 
  List, 
  Button, 
  Typography, 
  Space, 
  Modal, 
  Input, 
  Popconfirm,
  Empty,
  Tag,
  Tooltip
} from 'antd';
import { 
  HistoryOutlined, 
  ExportOutlined, 
  ImportOutlined, 
  EditOutlined, 
  DeleteOutlined,
  EyeOutlined,
  SaveOutlined,
  CloseOutlined
} from '@ant-design/icons';
import { HistoryRecord } from '../types';
import { showErrorDialog } from '../utils/errorDialog';

const { Text } = Typography;
const { TextArea } = Input;

interface HistoryManagementProps {
  historyRecords: HistoryRecord[];
  onExport?: () => Promise<void>;
  onImport?: () => Promise<void>;
  onEdit?: (id: string, newName: string, newDescription?: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onView?: (record: HistoryRecord) => void;
}

const HistoryManagement: React.FC<HistoryManagementProps> = ({
  historyRecords,
  onExport,
  onImport,
  onEdit,
  onDelete,
  onView
}) => {
  const [editingRecord, setEditingRecord] = useState<HistoryRecord | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const handleExport = async () => {
    console.log('HistoryManagement: 导出按钮被点击');
    console.log('HistoryManagement: onExport 函数是否存在:', !!onExport);
    console.log('HistoryManagement: 历史记录数量:', historyRecords.length);
    
    if (onExport) {
      try {
        console.log('HistoryManagement: 调用父组件的 onExport 函数');
        await onExport();
        console.log('HistoryManagement: onExport 函数调用成功');
      } catch (error: any) {
        console.error('HistoryManagement: onExport 函数调用失败:', error);
        showErrorDialog('导出历史记录失败', 'error');
      }
    } else {
      console.error('HistoryManagement: onExport 函数未定义');
      showErrorDialog('导出功能未实现', 'error');
    }
  };



  const handleEditSave = async () => {
    if (editingRecord && onEdit) {
      try {
        await onEdit(editingRecord.id, editName, editDescription);
        setEditingRecord(null);
        // message.success('历史记录更新成功！');
      } catch (error: any) {
        showErrorDialog('更新历史记录失败', 'error');
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (onDelete) {
      try {
        await onDelete(id);
        // message.success('历史记录删除成功！');
      } catch (error: any) {
        showErrorDialog('删除历史记录失败', 'error');
      }
    }
  };

  const startEdit = (record: HistoryRecord) => {
    setEditingRecord(record);
    setEditName(record.name);
    setEditDescription(record.description || '');
  };

  const cancelEdit = () => {
    setEditingRecord(null);
    setEditName('');
    setEditDescription('');
  };

  return (
    <Card
      title={
        <Space>
          <HistoryOutlined />
          历史记录
        </Space>
      }
      extra={
        <Space>
          {onImport && (
            <Tooltip title="导入历史记录">
              <Button
                icon={<ImportOutlined />}
                onClick={onImport}
                size="small"
                type="text"
              >
                导入
              </Button>
            </Tooltip>
          )}
          {onExport && (
            <Tooltip title="导出历史记录">
              <Button
                icon={<ExportOutlined />}
                onClick={handleExport}
                size="small"
                type="text"
                disabled={historyRecords.length === 0}
              >
                导出
              </Button>
            </Tooltip>
          )}
        </Space>
      }
      bodyStyle={{ padding: '16px' }}
    >
      {historyRecords.length === 0 ? (
        <Empty
          description="暂无历史记录"
          style={{ margin: '20px 0' }}
        />
      ) : (
        <List
          dataSource={historyRecords}
          renderItem={(record) => (
            <List.Item
              style={{ padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}
              actions={[
                onView && (
                  <Tooltip title="查看详情">
                    <Button
                      icon={<EyeOutlined />}
                      onClick={() => onView(record)}
                      size="small"
                      type="text"
                    />
                  </Tooltip>
                ),
                onEdit && (
                  <Tooltip title="编辑">
                    <Button
                      icon={<EditOutlined />}
                      onClick={() => startEdit(record)}
                      size="small"
                      type="text"
                    />
                  </Tooltip>
                ),
                onDelete && (
                  <Popconfirm
                    title="删除历史记录"
                    description="确定要删除这条历史记录吗？"
                    onConfirm={() => handleDelete(record.id)}
                    okText="确定"
                    cancelText="取消"
                    okType="danger"
                  >
                    <Tooltip title="删除">
                      <Button
                        icon={<DeleteOutlined />}
                        size="small"
                        type="text"
                        danger
                      />
                    </Tooltip>
                  </Popconfirm>
                )
              ].filter(Boolean)}
            >
              <List.Item.Meta
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Text strong style={{ fontSize: '14px' }}>{record.name}</Text>
                    <Tag color="blue" style={{ fontSize: '10px' }}>
                      历史记录
                    </Tag>
                  </div>
                }
                description={
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {record.description && (
                      <div style={{ marginBottom: '4px' }}>{record.description}</div>
                    )}
                    <div>创建时间: {new Date(record.createdAt).toLocaleString()}</div>
                    <div>GT路径: {record.folders.gt}</div>
                    <div>我的结果: {record.folders.my}</div>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}

      {/* 编辑对话框 */}
      <Modal
        title="编辑历史记录"
        open={!!editingRecord}
        onCancel={cancelEdit}
        footer={[
          <Button key="cancel" onClick={cancelEdit} icon={<CloseOutlined />}>
            取消
          </Button>,
          <Button key="save" type="primary" onClick={handleEditSave} icon={<SaveOutlined />}>
            保存
          </Button>
        ]}
        width={500}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text strong>记录名称</Text>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="请输入记录名称"
              style={{ marginTop: '8px' }}
            />
          </div>
          <div>
            <Text strong>描述信息</Text>
            <TextArea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="请输入描述信息（可选）"
              rows={3}
              style={{ marginTop: '8px' }}
            />
          </div>
        </Space>
      </Modal>
    </Card>
  );
};

export default HistoryManagement;