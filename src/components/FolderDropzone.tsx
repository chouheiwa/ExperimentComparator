import React, { useState, useCallback } from 'react';
import { Typography, Button, Space, Card } from 'antd';
import { InboxOutlined, FolderOutlined, FolderOpenOutlined } from '@ant-design/icons';
import { invoke } from '@tauri-apps/api/core';

const { Text, Title } = Typography;

interface FolderDropzoneProps {
  title: string;
  description: string;
  value?: string;
  onChange: (path: string) => void;
  disabled?: boolean;
}

const FolderDropzone: React.FC<FolderDropzoneProps> = ({
  title,
  description,
  value,
  onChange,
  disabled = false
}) => {
  const [error, setError] = useState<string | null>(null);

  const handleFolderSelect = useCallback(async () => {
    try {
      setError(null);
      const folderPath = await invoke<string>('select_folder');
      onChange(folderPath);
    } catch (err) {
      setError(err as string);
    }
  }, [onChange]);

  const dropzoneStyle = {
    border: `2px dashed ${value ? '#52c41a' : '#d9d9d9'}`,
    borderRadius: '6px',
    backgroundColor: value ? '#f6ffed' : '#fafafa',
    padding: '20px 16px',
    textAlign: 'center' as const,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.3s ease',
    minHeight: '200px',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: disabled ? 0.6 : 1
  };

  return (
    <Card style={{ height: '100%' }}>
      <div style={dropzoneStyle}>
        {value ? (
          <FolderOpenOutlined style={{ fontSize: '48px', color: '#52c41a' }} />
        ) : (
          <InboxOutlined style={{ fontSize: '48px', color: '#bfbfbf' }} />
        )}
        
        <Title level={4} style={{ marginTop: '16px', marginBottom: '8px' }}>
          {title}
        </Title>
        
        <Text type="secondary" style={{ display: 'block', marginBottom: '16px' }}>
          {description}
        </Text>

        {value ? (
          <div style={{ 
            padding: '8px 12px', 
            backgroundColor: '#f6ffed', 
            borderRadius: '4px',
            border: '1px solid #b7eb8f',
            marginBottom: '16px',
            width: '100%',
            maxWidth: '400px'
          }}>
            <Text style={{ fontSize: '12px', color: '#52c41a', wordBreak: 'break-all' }}>
              <FolderOutlined style={{ marginRight: '4px' }} />
              {value}
            </Text>
          </div>
        ) : (
          <div style={{ marginBottom: '16px' }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              点击选择文件夹，或拖放文件夹到页面任意位置
            </Text>
          </div>
        )}

        {error && (
          <div style={{ 
            padding: '8px 12px', 
            backgroundColor: '#fff2f0', 
            borderRadius: '4px',
            border: '1px solid #ffccc7',
            marginBottom: '16px',
            width: '100%',
            maxWidth: '400px'
          }}>
            <Text style={{ fontSize: '12px', color: '#ff4d4f' }}>
              {error}
            </Text>
          </div>
        )}

        <Space>
          <Button 
            type="primary" 
            ghost 
            size="small"
            onClick={handleFolderSelect}
            disabled={disabled}
          >
            选择文件夹
          </Button>
          {value && (
            <Button 
              size="small"
              onClick={() => {
                onChange('');
                setError(null);
              }}
              disabled={disabled}
            >
              清除
            </Button>
          )}
        </Space>
      </div>
    </Card>
  );
};

export default FolderDropzone; 