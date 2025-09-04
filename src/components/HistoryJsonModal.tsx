import React, { useState, useEffect } from 'react';
import { Modal, Input, Button, Space, message, Typography, Divider } from 'antd';
import { CopyOutlined, SaveOutlined, ExportOutlined, CloseOutlined } from '@ant-design/icons';
import { save, open } from '@tauri-apps/plugin-dialog';
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { showErrorDialog } from '../utils/errorDialog';
import { HistoryRecord } from '../types';
import { exportHistoryToJson, importHistoryFromJson } from '../utils/history';

const { TextArea } = Input;
const { Text, Title } = Typography;

interface HistoryJsonModalProps {
  visible: boolean;
  onClose: () => void;
  mode: 'export' | 'import';
  historyRecords?: HistoryRecord[];
  onImport?: (records: HistoryRecord[]) => Promise<void>;
}

const HistoryJsonModal: React.FC<HistoryJsonModalProps> = ({
  visible,
  onClose,
  mode,
  historyRecords = [],
  onImport
}) => {
  const [jsonContent, setJsonContent] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && mode === 'export' && historyRecords.length > 0) {
      const jsonString = exportHistoryToJson(historyRecords);
      setJsonContent(JSON.stringify(JSON.parse(jsonString), null, 2));
    } else if (visible && mode === 'import') {
      setJsonContent('');
    }
  }, [visible, mode, historyRecords]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonContent);
      message.success('JSON内容已复制到剪贴板');
    } catch (error) {
      console.error('复制失败:', error);
      message.error('复制失败');
    }
  };

  const handleSave = async () => {
    if (mode === 'import' && onImport) {
      try {
        setLoading(true);
        const parsedData = JSON.parse(jsonContent);
        const records = importHistoryFromJson(JSON.stringify(parsedData));
        await onImport(records);
        showErrorDialog('历史记录导入成功', 'success');
        onClose();
      } catch (error: any) {
        console.error('导入失败:', error);
        showErrorDialog(`导入失败: ${error?.message || '无效的JSON格式'}`, 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleExportToFile = async () => {
    if (mode === 'export') {
      try {
        setLoading(true);
        const defaultFileName = `datachoosing-history-${new Date().toISOString().split('T')[0]}.json`;
        
    
        const filePath = await save({
          title: '导出历史记录',
          defaultPath: defaultFileName,
          filters: [{
            name: 'JSON 文件',
            extensions: ['json']
          }]
        });
        
  
        
        if (filePath) {
    
          try {
            await writeTextFile(filePath, jsonContent);
    
            showErrorDialog('导出历史记录成功', 'success');
          } catch (writeError: any) {
            console.error('文件写入失败:', writeError);
            // 尝试使用 invoke 方法作为备选
            try {
      
              await invoke('plugin:fs|write_file', { 
                path: filePath, 
                contents: jsonContent 
              });
    
              showErrorDialog('导出历史记录成功', 'success');
            } catch (invokeError: any) {
              console.error('使用 invoke 方法写入文件失败:', invokeError);
              throw invokeError;
            }
          }
        } else {
    
        }
      } catch (error: any) {
        console.error('导出失败:', error);
        showErrorDialog(`导出失败: ${error?.message || '未知错误'}`, 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleLoadFromFile = async () => {
    if (mode === 'import') {
      try {
        setLoading(true);
    
        const filePath = await open({
          title: '导入历史记录',
          filters: [{
            name: 'JSON 文件',
            extensions: ['json']
          }]
        });
        
        if (filePath) {
    
          const content = await readTextFile(filePath as string);
          setJsonContent(JSON.stringify(JSON.parse(content), null, 2));
          message.success('文件加载成功，请检查内容后点击保存');
        }
      } catch (error: any) {
        console.error('加载文件失败:', error);
        showErrorDialog(`加载文件失败: ${error?.message || '未知错误'}`, 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const getTitle = () => {
    return mode === 'export' ? '导出历史记录' : '导入历史记录';
  };

  const getDescription = () => {
    if (mode === 'export') {
      return '以下是当前的历史记录JSON数据，您可以复制或导出到文件：';
    } else {
      return '请粘贴或加载历史记录JSON数据，然后点击保存按钮导入：';
    }
  };

  return (
    <Modal
      title={getTitle()}
      open={visible}
      onCancel={onClose}
      width={800}
      footer={[
        <Button key="close" onClick={onClose} icon={<CloseOutlined />}>
          关闭
        </Button>,
        mode === 'import' && (
          <Button 
            key="load" 
            onClick={handleLoadFromFile} 
            loading={loading}
            icon={<ExportOutlined />}
          >
            从文件加载
          </Button>
        ),
        <Button 
          key="copy" 
          onClick={handleCopy} 
          icon={<CopyOutlined />}
          disabled={!jsonContent}
        >
          复制
        </Button>,
        mode === 'export' && (
          <Button 
            key="export" 
            type="primary" 
            onClick={handleExportToFile} 
            loading={loading}
            icon={<ExportOutlined />}
            disabled={!jsonContent}
          >
            导出到文件
          </Button>
        ),
        mode === 'import' && (
          <Button 
            key="save" 
            type="primary" 
            onClick={handleSave} 
            loading={loading}
            icon={<SaveOutlined />}
            disabled={!jsonContent}
          >
            保存
          </Button>
        )
      ].filter(Boolean)}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <div>
          <Text>{getDescription()}</Text>
        </div>
        
        <Divider style={{ margin: '12px 0' }} />
        
        <div>
          <Title level={5} style={{ marginBottom: '8px' }}>JSON 内容：</Title>
          <TextArea
            value={jsonContent}
            onChange={(e) => setJsonContent(e.target.value)}
            placeholder={mode === 'import' ? '请粘贴历史记录JSON数据...' : ''}
            rows={15}
            style={{ 
              fontFamily: 'Monaco, Consolas, "Courier New", monospace',
              fontSize: '12px'
            }}
            readOnly={mode === 'export'}
          />
        </div>
        
        {mode === 'import' && (
          <div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              提示：请确保JSON格式正确，包含有效的历史记录数据。点击"从文件加载"可以选择JSON文件自动填充内容。
            </Text>
          </div>
        )}
      </Space>
    </Modal>
  );
};

export default HistoryJsonModal;