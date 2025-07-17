import React from 'react';
import { Progress, Card, Typography, Space, Statistic, Row, Col } from 'antd';
import { ClockCircleOutlined, FileTextOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { ProgressInfo } from '../types';

const { Text, Title } = Typography;

interface ProgressIndicatorProps {
  progressInfo: ProgressInfo;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ progressInfo }) => {
  const {
    current,
    total,
    percentage,
    currentFileName,
    estimatedTimeRemaining,
    speed
  } = progressInfo;

  // 格式化剩余时间
  const formatRemainingTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.round(seconds)}秒`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.round(seconds % 60);
      return `${minutes}分${remainingSeconds}秒`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}小时${minutes}分钟`;
    }
  };

  // 格式化处理速度
  const formatSpeed = (speed: number): string => {
    if (speed < 1) {
      return `${(speed * 60).toFixed(1)} 个/分钟`;
    } else {
      return `${speed.toFixed(1)} 个/秒`;
    }
  };

  return (
    <>
      <style>
        {`
          .ant-progress-text {
            color: white !important;
          }
        `}
      </style>
      <Card
        style={{
          marginBottom: '24px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          color: 'white'
        }}
        bodyStyle={{ padding: '24px' }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Title level={3} style={{ color: 'white', margin: 0, marginBottom: '8px' }}>
            对比计算进行中...
          </Title>
          <Text style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '16px' }}>
            请耐心等待，正在为您分析图片数据
          </Text>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <Progress
            percent={percentage}
            strokeColor={{
              '0%': '#108ee9',
              '100%': '#87d068',
            }}
            trailColor="rgba(255, 255, 255, 0.2)"
          />
          <div style={{ textAlign: 'center', marginTop: '8px' }}>
            <Text style={{ color: 'white', fontSize: '14px' }}>
              已完成 {current} / {total} 个文件
            </Text>
          </div>
        </div>

        <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
          <Col xs={24} sm={8}>
            <div style={{ textAlign: 'center' }}>
              <FileTextOutlined style={{ fontSize: '20px', color: 'white', marginBottom: '8px' }} />
              <div>
                <Text style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '12px', display: 'block' }}>
                  当前文件
                </Text>
                <Text style={{ color: 'white', fontSize: '14px', fontWeight: 500 }}>
                  {currentFileName || '准备中...'}
                </Text>
              </div>
            </div>
          </Col>

          <Col xs={24} sm={8}>
            <div style={{ textAlign: 'center' }}>
              <ClockCircleOutlined style={{ fontSize: '20px', color: 'white', marginBottom: '8px' }} />
              <div>
                <Text style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '12px', display: 'block' }}>
                  预计剩余时间
                </Text>
                <Text style={{ color: 'white', fontSize: '14px', fontWeight: 500 }}>
                  {estimatedTimeRemaining && estimatedTimeRemaining > 0 
                    ? formatRemainingTime(estimatedTimeRemaining)
                    : '计算中...'
                  }
                </Text>
              </div>
            </div>
          </Col>

          <Col xs={24} sm={8}>
            <div style={{ textAlign: 'center' }}>
              <ThunderboltOutlined style={{ fontSize: '20px', color: 'white', marginBottom: '8px' }} />
              <div>
                <Text style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '12px', display: 'block' }}>
                  处理速度
                </Text>
                <Text style={{ color: 'white', fontSize: '14px', fontWeight: 500 }}>
                  {speed && speed > 0 ? formatSpeed(speed) : '计算中...'}
                </Text>
              </div>
            </div>
          </Col>
        </Row>

        <div style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.1)', 
          borderRadius: '6px', 
          padding: '12px',
          textAlign: 'center'
        }}>
          <Text style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '13px' }}>
            💡 提示：计算可能需要一些时间，请不要关闭应用程序
          </Text>
        </div>
      </Card>
    </>
  );
};

export default ProgressIndicator; 