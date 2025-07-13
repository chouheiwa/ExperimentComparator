import React, { useState, useCallback, useEffect } from 'react';
import { Card, Button, Space, Tag, Alert, Row, Col, Typography, Input } from 'antd';
import { DeleteOutlined, PlusOutlined, InboxOutlined, EditOutlined } from '@ant-design/icons';
import { listen } from '@tauri-apps/api/event';
import { dirname } from '@tauri-apps/api/path';
import { invoke } from '@tauri-apps/api/tauri';
import { FolderData, ComparisonFolder } from '../types';
import FolderDropzone from './FolderDropzone';

const { Text } = Typography;

interface FolderSelectionProps {
  onFoldersSelected: (folders: FolderData) => void;
  loading: boolean;
  folders?: FolderData;
}

// 生成唯一ID
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// 生成默认名称
const generateDefaultName = (index: number): string => {
  return `对比数据 ${index + 1}`;
};

const FolderSelection: React.FC<FolderSelectionProps> = ({ onFoldersSelected, loading, folders }) => {
  const [gtFolder, setGtFolder] = useState('');
  const [myFolder, setMyFolder] = useState('');
  const [comparisonFolders, setComparisonFolders] = useState<ComparisonFolder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // 监听外部folders属性变化，同步更新本地状态
  useEffect(() => {
    if (folders) {
      setGtFolder(folders.gt);
      setMyFolder(folders.my);
      setComparisonFolders(folders.comparison);
      setError(null);
    }
  }, [folders]);

  // 统一的拖放处理函数 - 按顺序填入
  const handleFolderDrop = useCallback(async (paths: string[]) => {
    if (paths.length === 0) return;
    
    try {
      setError(null);
      
      // 维护本地状态来跟踪填入进度
      let currentGtFolder = gtFolder;
      let currentMyFolder = myFolder;
      let currentComparisonFolders = [...comparisonFolders];
      
      for (const path of paths) {
        // 检查是否为文件，如果是则获取其父目录
        const isFile = await invoke<boolean>('is_file', { path });
        const finalPath = isFile ? await dirname(path) : path;

        // 按顺序填入：GT -> 我的实验数据 -> 对比数据
        if (!currentGtFolder) {
          currentGtFolder = finalPath;
          setGtFolder(finalPath);
        } else if (!currentMyFolder) {
          currentMyFolder = finalPath;
          setMyFolder(finalPath);
        } else {
          // 添加到对比数据（避免重复）
          const existingPaths = currentComparisonFolders.map(f => f.path);
          if (!existingPaths.includes(finalPath)) {
            const newFolder: ComparisonFolder = {
              id: generateId(),
              name: generateDefaultName(currentComparisonFolders.length),
              path: finalPath
            };
            currentComparisonFolders.push(newFolder);
            setComparisonFolders([...currentComparisonFolders]);
          }
        }
      }
    } catch (err) {
      setError('处理拖放文件时出错: ' + err);
    }
  }, [gtFolder, myFolder, comparisonFolders]);

  // 监听全局拖放事件
  useEffect(() => {
    if (loading) return;

    let unlistenDrop: (() => void) | undefined;
    let unlistenDragOver: (() => void) | undefined;
    let unlistenDragLeave: (() => void) | undefined;

    const setupListeners = async () => {
      // 监听拖放事件
      unlistenDrop = await listen('tauri://file-drop', (event) => {
        setIsDragging(false);
        const paths = event.payload as string[];
        handleFolderDrop(paths);
      });

      // 监听拖拽悬停事件
      unlistenDragOver = await listen('tauri://file-drop-hover', () => {
        setIsDragging(true);
      });

      // 监听拖拽离开事件
      unlistenDragLeave = await listen('tauri://file-drop-cancelled', () => {
        setIsDragging(false);
      });
    };

    setupListeners();

    return () => {
      if (unlistenDrop) unlistenDrop();
      if (unlistenDragOver) unlistenDragOver();
      if (unlistenDragLeave) unlistenDragLeave();
    };
  }, [loading, handleFolderDrop]);

  const handleGtFolderChange = (path: string) => {
    setGtFolder(path);
    setError(null);
  };

  const handleMyFolderChange = (path: string) => {
    setMyFolder(path);
    setError(null);
  };

  const handleComparisonFolderAdd = (path: string) => {
    if (path) {
      const existingPaths = comparisonFolders.map(f => f.path);
      if (!existingPaths.includes(path)) {
        const newFolder: ComparisonFolder = {
          id: generateId(),
          name: generateDefaultName(comparisonFolders.length),
          path: path
        };
        setComparisonFolders([...comparisonFolders, newFolder]);
        setError(null);
      }
    }
  };

  const removeComparisonFolder = (id: string) => {
    setComparisonFolders(comparisonFolders.filter(f => f.id !== id));
  };

  const startEditing = (folder: ComparisonFolder) => {
    setEditingId(folder.id);
    setEditingName(folder.name);
  };

  const saveEditing = () => {
    if (editingId && editingName.trim()) {
      setComparisonFolders(
        comparisonFolders.map(f => 
          f.id === editingId ? { ...f, name: editingName.trim() } : f
        )
      );
    }
    setEditingId(null);
    setEditingName('');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleSubmit = () => {
    if (!gtFolder || !myFolder || comparisonFolders.length === 0) {
      setError('请至少选择GT文件夹、实验数据文件夹和一个对比文件夹');
      return;
    }
    
    onFoldersSelected({
      gt: gtFolder,
      my: myFolder,
      comparison: comparisonFolders
    });
  };

  const canSubmit = gtFolder && myFolder && comparisonFolders.length > 0;

  return (
    <div style={{ 
      border: isDragging ? '2px dashed #1890ff' : '2px dashed transparent',
      borderRadius: '8px',
      padding: isDragging ? '16px' : '0',
      backgroundColor: isDragging ? '#e6f7ff' : 'transparent',
      transition: 'all 0.3s ease',
      position: 'relative'
    }}>
      {/* 全局拖放提示 */}
      {isDragging && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1000,
          textAlign: 'center',
          pointerEvents: 'none'
        }}>
          <InboxOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
          <div style={{ marginTop: '8px', fontSize: '16px', color: '#1890ff', fontWeight: 'bold' }}>
            松开以按顺序添加文件夹
          </div>
          <div style={{ marginTop: '4px', fontSize: '12px', color: '#666' }}>
            {!gtFolder && '将填入GT文件夹'}
            {gtFolder && !myFolder && '将填入我的实验数据'}
            {gtFolder && myFolder && '将添加到对比数据'}
          </div>
        </div>
      )}

      {/* 拖放说明 */}
      <Alert
        message="拖放提示"
        description={
          <div>
            <Text>您可以直接将文件夹拖放到本页面的任意位置，系统会按以下顺序自动填入：</Text>
            <ol style={{ marginTop: '8px', paddingLeft: '20px' }}>
              <li>第1个文件夹 → GT文件夹</li>
              <li>第2个文件夹 → 我的实验数据</li>
              <li>第3个及以后 → 对比数据</li>
            </ol>
            <Text type="secondary">也可以点击下方各个区域手动选择文件夹</Text>
          </div>
        }
        type="info"
        showIcon
        style={{ marginBottom: '24px' }}
      />

      <Row gutter={[16, 16]}>
        {/* GT文件夹选择 */}
        <Col xs={24} md={12} lg={8}>
          <FolderDropzone
            title="GT图片文件夹"
            description="选择包含真实标注（Ground Truth）的文件夹"
            value={gtFolder}
            onChange={handleGtFolderChange}
            disabled={loading}
          />
        </Col>

        {/* 我的实验数据文件夹选择 */}
        <Col xs={24} md={12} lg={8}>
          <FolderDropzone
            title="我的实验数据"
            description="选择包含您的模型输出结果的文件夹"
            value={myFolder}
            onChange={handleMyFolderChange}
            disabled={loading}
          />
        </Col>

        {/* 对比数据文件夹选择 */}
        <Col xs={24} md={12} lg={8}>
          <FolderDropzone
            title="添加对比数据"
            description="选择要对比的其他模型输出结果文件夹"
            value=""
            onChange={handleComparisonFolderAdd}
            disabled={loading}
          />
        </Col>
      </Row>

      {/* 已选择的对比文件夹列表 */}
      {comparisonFolders.length > 0 && (
        <Card 
          title={
            <Space>
              <PlusOutlined />
              已选择的对比文件夹
            </Space>
          }
          style={{ marginTop: '24px' }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            {comparisonFolders.map((folder) => (
              <div key={folder.id} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                padding: '12px 16px',
                backgroundColor: '#f5f5f5',
                borderRadius: '6px'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                    <Tag color="green" style={{ marginRight: '8px' }}>
                      {editingId === folder.id ? (
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onPressEnter={saveEditing}
                          onBlur={saveEditing}
                          style={{ width: '120px' }}
                          autoFocus
                        />
                      ) : (
                        folder.name
                      )}
                    </Tag>
                    {editingId !== folder.id && (
                      <Button
                        type="text"
                        icon={<EditOutlined />}
                        size="small"
                        onClick={() => startEditing(folder)}
                        disabled={loading}
                        style={{ marginLeft: '4px' }}
                      />
                    )}
                  </div>
                  <span style={{ fontSize: '12px', color: '#666' }}>
                    {folder.path}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {editingId === folder.id && (
                    <Button
                      size="small"
                      onClick={cancelEditing}
                      disabled={loading}
                    >
                      取消
                    </Button>
                  )}
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    size="small"
                    onClick={() => removeComparisonFolder(folder.id)}
                    title="移除"
                    disabled={loading}
                  />
                </div>
              </div>
            ))}
          </Space>
        </Card>
      )}

      {error && (
        <Alert
          message={error}
          type="error"
          closable
          onClose={() => setError(null)}
          style={{ marginTop: '16px' }}
        />
      )}

      <div style={{ marginTop: '32px', textAlign: 'center' }}>
        <Button
          type="primary"
          size="large"
          loading={loading}
          disabled={!canSubmit}
          onClick={handleSubmit}
          style={{ minWidth: '140px' }}
        >
          {loading ? '验证中...' : '开始验证'}
        </Button>
      </div>
    </div>
  );
};

export default FolderSelection; 