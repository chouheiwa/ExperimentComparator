import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Card, Button, Space, Tag, Alert, Row, Col, Typography, Input, Modal } from 'antd';
import { DeleteOutlined, PlusOutlined, InboxOutlined, EditOutlined, HolderOutlined } from '@ant-design/icons';
import { listen } from '@tauri-apps/api/event';
import { dirname } from '@tauri-apps/api/path';
import { invoke } from '@tauri-apps/api/core';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FolderData, ComparisonFolder } from '../types';
import FolderDropzone from './FolderDropzone';

const { Text } = Typography;

interface FolderSelectionProps {
  onFoldersSelected: (folders: FolderData) => void;
  loading: boolean;
  folders?: FolderData;
  onMainFoldersChanged?: () => void; // 主要文件夹变化时清除历史记录ID
}

// 可拖拽的对比文件夹项组件
interface SortableComparisonFolderProps {
  folder: ComparisonFolder;
  editingId: string | null;
  editingName: string;
  loading: boolean;
  onStartEditing: (folder: ComparisonFolder) => void;
  onSaveEditing: () => void;
  onCancelEditing: () => void;
  onRemove: (id: string) => void;
  onEditingNameChange: (name: string) => void;
}

const SortableComparisonFolder: React.FC<SortableComparisonFolderProps> = ({
  folder,
  editingId,
  editingName,
  loading,
  onStartEditing,
  onSaveEditing,
  onCancelEditing,
  onRemove,
  onEditingNameChange,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: folder.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="sortable-comparison-folder"
    >
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        padding: '12px 16px',
        backgroundColor: '#f5f5f5',
        borderRadius: '6px',
        border: isDragging ? '2px dashed #1890ff' : '1px solid #d9d9d9',
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {/* 拖拽手柄 */}
          <div
            {...attributes}
            {...listeners}
            style={{
              cursor: 'grab',
              marginRight: '12px',
              color: '#999',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
            }}
            title="拖拽以重新排序"
          >
            <HolderOutlined />
          </div>
          
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
              <Tag color="green" style={{ marginRight: '8px' }}>
                {editingId === folder.id ? (
                  <Input
                    value={editingName}
                    onChange={(e) => onEditingNameChange(e.target.value)}
                    onPressEnter={onSaveEditing}
                    onBlur={onSaveEditing}
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
                  onClick={() => onStartEditing(folder)}
                  disabled={loading}
                  style={{ marginLeft: '4px' }}
                />
              )}
            </div>
            <span style={{ fontSize: '12px', color: '#666' }}>
              {folder.path}
            </span>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          {editingId === folder.id && (
            <Button
              size="small"
              onClick={onCancelEditing}
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
            onClick={() => onRemove(folder.id)}
            title="移除"
            disabled={loading}
          />
        </div>
      </div>
    </div>
  );
};

// 生成唯一ID
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// 生成默认名称
const generateDefaultName = (index: number): string => {
  return `对比数据 ${index + 1}`;
};

const FolderSelection: React.FC<FolderSelectionProps> = ({ onFoldersSelected, loading, folders, onMainFoldersChanged }) => {
  const [originalFolder, setOriginalFolder] = useState('');
  const [gtFolder, setGtFolder] = useState('');
  const [myFolder, setMyFolder] = useState('');
  const [comparisonFolders, setComparisonFolders] = useState<ComparisonFolder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  // 模态框相关状态
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalInputValue, setModalInputValue] = useState('');
  const [pendingFolderPath, setPendingFolderPath] = useState<string | null>(null);

  // 拖拽传感器配置
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 使用ref来确保拖放处理函数中能获取到最新的状态值
  const originalFolderRef = useRef(originalFolder);
  const gtFolderRef = useRef(gtFolder);
  const myFolderRef = useRef(myFolder);
  const comparisonFoldersRef = useRef(comparisonFolders);

  // 保持refs与状态同步
  useEffect(() => {
    originalFolderRef.current = originalFolder;
  }, [originalFolder]);

  useEffect(() => {
    gtFolderRef.current = gtFolder;
  }, [gtFolder]);

  useEffect(() => {
    myFolderRef.current = myFolder;
  }, [myFolder]);

  useEffect(() => {
    comparisonFoldersRef.current = comparisonFolders;
  }, [comparisonFolders]);

  // 拖拽结束处理
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = comparisonFolders.findIndex((folder) => folder.id === active.id);
      const newIndex = comparisonFolders.findIndex((folder) => folder.id === over.id);

      setComparisonFolders((folders) => arrayMove(folders, oldIndex, newIndex));
    }
  }, [comparisonFolders]);

  // 监听外部folders属性变化，同步更新本地状态
  useEffect(() => {
    if (folders) {
      setOriginalFolder(folders.original);
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
      
      // 获取最新的状态值（使用refs确保不会使用过时的闭包值）
      let currentOriginalFolder = originalFolderRef.current;
      let currentGtFolder = gtFolderRef.current;
      let currentMyFolder = myFolderRef.current;
      let currentComparisonFolders = [...comparisonFoldersRef.current];
      let hasChanges = false;
      
      for (const path of paths) {
        // 检查是否为文件，如果是则获取其父目录
        const isFile = await invoke<boolean>('is_file', { path });
        const finalPath = isFile ? await dirname(path) : path;

        // 按顺序填入：原始图片 -> GT -> 我的实验数据 -> 对比数据
        // 只有当对应字段为空时才填入，不覆盖已有值
        if (!currentOriginalFolder) {
          currentOriginalFolder = finalPath;
          setOriginalFolder(finalPath);
          hasChanges = true;
        } else if (!currentGtFolder) {
          currentGtFolder = finalPath;
          setGtFolder(finalPath);
          hasChanges = true;
        } else if (!currentMyFolder) {
          currentMyFolder = finalPath;
          setMyFolder(finalPath);
          hasChanges = true;
        } else {
          // 所有必要字段都有值时，只添加到对比数据（避免重复）
          const existingPaths = currentComparisonFolders.map(f => f.path);
          if (!existingPaths.includes(finalPath)) {
            // 对于拖拽情况，找到第一个需要添加的文件夹就弹出模态框
            // 中断循环，一次只处理一个对比文件夹
            setPendingFolderPath(finalPath);
            setModalInputValue(generateDefaultName(currentComparisonFolders.length));
            setIsModalVisible(true);
            hasChanges = true;
            return; // 中断处理，等待用户输入
          }
        }
      }
      
      // 只有在修改主要文件夹时才清除历史记录ID
      // 如果只是添加对比文件夹，不调用回调以保持历史记录跟踪
      if (hasChanges && (currentOriginalFolder !== originalFolderRef.current || 
                         currentGtFolder !== gtFolderRef.current || 
                         currentMyFolder !== myFolderRef.current)) {
        onMainFoldersChanged?.();
      }
    } catch (err) {
      setError('处理拖放文件时出错: ' + err);
    }
  }, [onMainFoldersChanged]);

  // 监听全局拖放事件
  useEffect(() => {
    if (loading) return;

    let unlistenDrop: (() => void) | undefined;
    let unlistenDragOver: (() => void) | undefined;
    let unlistenDragLeave: (() => void) | undefined;

    const setupListeners = async () => {
      // 监听拖放事件 - Tauri 2.0 中的正确事件名称
      unlistenDrop = await listen('tauri://drag-drop', (event) => {
        setIsDragging(false);
        const paths = event.payload as string[];
        handleFolderDrop(paths);
      });

      // 监听拖拽悬停事件
      unlistenDragOver = await listen('tauri://drag-over', () => {
        setIsDragging(true);
      });

      // 监听拖拽离开事件
      unlistenDragLeave = await listen('tauri://drag-leave', () => {
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

  const handleOriginalFolderChange = (path: string) => {
    setOriginalFolder(path);
    setError(null);
    onMainFoldersChanged?.(); // 修改主要文件夹，清除历史记录ID
  };

  const handleGtFolderChange = (path: string) => {
    setGtFolder(path);
    setError(null);
    onMainFoldersChanged?.(); // 修改主要文件夹，清除历史记录ID
  };

  const handleMyFolderChange = (path: string) => {
    setMyFolder(path);
    setError(null);
    onMainFoldersChanged?.(); // 修改主要文件夹，清除历史记录ID
  };

  const handleComparisonFolderAdd = (path: string) => {
    if (path) {
      const existingPaths = comparisonFolders.map(f => f.path);
      if (!existingPaths.includes(path)) {
        // 弹出模态框让用户输入自定义名称
        setPendingFolderPath(path);
        setModalInputValue(generateDefaultName(comparisonFolders.length));
        setIsModalVisible(true);
      }
    }
  };

  const removeComparisonFolder = (id: string) => {
    setComparisonFolders(comparisonFolders.filter(f => f.id !== id));
    // 删除对比文件夹不清除历史记录ID，保持更新原记录
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

  // 模态框确认处理
  const handleModalOk = () => {
    if (pendingFolderPath && modalInputValue.trim()) {
      const newFolder: ComparisonFolder = {
        id: generateId(),
        name: modalInputValue.trim(),
        path: pendingFolderPath
      };
      setComparisonFolders([...comparisonFolders, newFolder]);
      setError(null);
      
      // 重置模态框状态
      setIsModalVisible(false);
      setModalInputValue('');
      setPendingFolderPath(null);
    }
  };

  // 模态框取消处理
  const handleModalCancel = () => {
    setIsModalVisible(false);
    setModalInputValue('');
    setPendingFolderPath(null);
  };

  const handleSubmit = () => {
    if (!originalFolder || !gtFolder || !myFolder || comparisonFolders.length === 0) {
      setError('请选择原始图片文件夹、GT文件夹、实验数据文件夹和至少一个对比文件夹');
      return;
    }
    
    onFoldersSelected({
      original: originalFolder,
      gt: gtFolder,
      my: myFolder,
      comparison: comparisonFolders
    });
  };

  const canSubmit = originalFolder && gtFolder && myFolder && comparisonFolders.length > 0;

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
            {!originalFolderRef.current && '将填入：原始图片文件夹（不会覆盖已有数据）'}
            {originalFolderRef.current && !gtFolderRef.current && '将填入：GT文件夹（跳过已有的原始数据）'}
            {originalFolderRef.current && gtFolderRef.current && !myFolderRef.current && '将填入：我的实验数据（跳过已有数据）'}
            {originalFolderRef.current && gtFolderRef.current && myFolderRef.current && '将添加到：对比数据（不覆盖任何已有数据）'}
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
              <li>第1个文件夹 → 原始图片文件夹</li>
              <li>第2个文件夹 → GT文件夹</li>
              <li>第3个文件夹 → 我的实验数据</li>
              <li>第4个及以后 → 对比数据</li>
            </ol>
            <Text type="secondary">也可以点击下方各个区域手动选择文件夹</Text>
          </div>
        }
        type="info"
        showIcon
        style={{ marginBottom: '24px' }}
      />

      <Row gutter={[16, 16]}>
        {/* 原始图片文件夹选择 */}
        <Col xs={24} sm={12} md={12} lg={12} xl={6} xxl={6}>
          <FolderDropzone
            title="原始图片文件夹"
            description="选择包含原始图片的文件夹"
            value={originalFolder}
            onChange={handleOriginalFolderChange}
            disabled={loading}
          />
        </Col>

        {/* GT文件夹选择 */}
        <Col xs={24} sm={12} md={12} lg={12} xl={6} xxl={6}>
          <FolderDropzone
            title="GT图片文件夹"
            description="选择包含真实标注（Ground Truth）的文件夹"
            value={gtFolder}
            onChange={handleGtFolderChange}
            disabled={loading}
          />
        </Col>

        {/* 我的实验数据文件夹选择 */}
        <Col xs={24} sm={12} md={12} lg={12} xl={6} xxl={6}>
          <FolderDropzone
            title="我的实验数据"
            description="选择包含您的模型输出结果的文件夹"
            value={myFolder}
            onChange={handleMyFolderChange}
            disabled={loading}
          />
        </Col>

        {/* 对比数据文件夹选择 */}
        <Col xs={24} sm={12} md={12} lg={12} xl={6} xxl={6}>
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
                     <DndContext
             sensors={sensors}
             collisionDetection={closestCenter}
             onDragEnd={handleDragEnd}
           >
             <SortableContext
               items={comparisonFolders.map(folder => folder.id)}
               strategy={verticalListSortingStrategy}
             >
               <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                 {comparisonFolders.map((folder) => (
                   <SortableComparisonFolder
                     key={folder.id}
                     folder={folder}
                     editingId={editingId}
                     editingName={editingName}
                     loading={loading}
                     onStartEditing={startEditing}
                     onSaveEditing={saveEditing}
                     onCancelEditing={cancelEditing}
                     onRemove={removeComparisonFolder}
                     onEditingNameChange={setEditingName}
                   />
                 ))}
               </div>
             </SortableContext>
           </DndContext>
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

      {/* 模型名称输入模态框 */}
      <Modal
        title="设置模型名称"
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        okText="确认"
        cancelText="取消"
        centered
      >
        <div style={{ marginBottom: '16px' }}>
          <Text type="secondary">请为这个对比文件夹设置一个名称：</Text>
        </div>
        <Input
          value={modalInputValue}
          onChange={(e) => setModalInputValue(e.target.value)}
          placeholder="请输入模型名称"
          onPressEnter={handleModalOk}
          autoFocus
        />
      </Modal>
    </div>
  );
};

export default FolderSelection;