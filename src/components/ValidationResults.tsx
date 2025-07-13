import React from 'react';
import { Card, Button, Typography, Space, Alert, Tag, List, Statistic, Row, Col } from 'antd';
import { CheckCircleOutlined, ExclamationCircleOutlined, ReloadOutlined, PlayCircleOutlined, FileTextOutlined, FolderOutlined } from '@ant-design/icons';
import { ValidationResult } from '../types';

const { Title } = Typography;

interface ValidationResultsProps {
  result: ValidationResult;
  onStartComparison: () => void;
  onReset: () => void;
  loading: boolean;
}

const ValidationResults: React.FC<ValidationResultsProps> = ({
  result,
  onStartComparison,
  onReset,
  loading
}) => {
  return (
    <div>
      <Alert
        message={result.is_valid ? '验证通过' : '验证失败'}
        description={
          result.is_valid 
            ? '所有文件夹都包含相同的图片文件，可以开始对比分析' 
            : '文件夹中存在不匹配的文件，请检查后重新选择'
        }
        type={result.is_valid ? 'success' : 'error'}
        icon={result.is_valid ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}
        style={{ marginBottom: '24px' }}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card>
            <Statistic
              title="共同文件数量"
              value={result.common_files.length}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} md={12}>
          <Card>
            <Statistic
              title="存在问题的文件夹"
              value={Object.keys(result.missing_files).length}
              prefix={<FolderOutlined />}
              valueStyle={{ color: Object.keys(result.missing_files).length > 0 ? '#cf1322' : '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {result.common_files.length > 0 && (
        <Card 
          title={
            <Space>
              <FileTextOutlined />
              共同文件列表
            </Space>
          }
          style={{ marginTop: '24px' }}
        >
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            <List
              dataSource={result.common_files}
              renderItem={(file) => (
                <List.Item>
                  <Tag color="blue" style={{ marginRight: '8px' }}>
                    {file.split('.').pop()?.toUpperCase() || 'FILE'}
                  </Tag>
                  {file}
                </List.Item>
              )}
            />
          </div>
        </Card>
      )}

      {Object.keys(result.missing_files).length > 0 && (
        <Card 
          title={
            <Space>
              <ExclamationCircleOutlined />
              缺失文件详情
            </Space>
          }
          style={{ marginTop: '24px' }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            {Object.entries(result.missing_files).map(([folder, files]) => (
              <Card key={folder} size="small" style={{ backgroundColor: '#fff7e6' }}>
                <Title level={5} style={{ margin: 0, marginBottom: '12px' }}>
                  <FolderOutlined style={{ marginRight: '8px' }} />
                  {folder}
                </Title>
                <List
                  dataSource={files}
                  renderItem={(file) => (
                    <List.Item style={{ padding: '4px 0' }}>
                      <Typography.Text type="danger">
                        • {file}
                      </Typography.Text>
                    </List.Item>
                  )}
                />
              </Card>
            ))}
          </Space>
        </Card>
      )}

      <div style={{ 
        marginTop: '32px', 
        textAlign: 'center'
      }}>
        <Space size="middle">
          <Button
            icon={<ReloadOutlined />}
            onClick={onReset}
            disabled={loading}
            size="large"
          >
            重新选择
          </Button>
          
          {result.is_valid && (
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={onStartComparison}
              loading={loading}
              size="large"
            >
              {loading ? '计算中...' : '开始对比'}
            </Button>
          )}
        </Space>
      </div>
    </div>
  );
};

export default ValidationResults; 