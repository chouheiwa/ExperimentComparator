import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Typography, Space, Progress, Row, Col, Statistic } from 'antd';
import { LeftOutlined, RightOutlined, ReloadOutlined, BarChartOutlined } from '@ant-design/icons';
import { ComparisonResult } from '../types';
import { formatIou, getIouStatus } from '../utils';
import SafeImage from './SafeImage';

const { Title, Text } = Typography;

interface ComparisonViewProps {
  results: ComparisonResult[];
  onReset: () => void;
}

const ComparisonView: React.FC<ComparisonViewProps> = ({ results, onReset }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentResult = results[currentIndex];

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
  }, [results.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
  }, [results.length]);

  // 键盘事件处理
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (results.length <= 1) return;
      
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          goToPrevious();
          break;
        case 'ArrowRight':
          event.preventDefault();
          goToNext();
          break;
      }
    };

    // 添加键盘事件监听
    window.addEventListener('keydown', handleKeyPress);

    // 清理函数
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [goToPrevious, goToNext, results.length]); // 依赖于函数和results.length

  // 获取排序后的图片条目
  const getSortedEntries = (paths: Record<string, string>) => {
    const entries = Object.entries(paths);
    
    // 定义显示顺序
    const order = ['GT', '我的结果'];
    
    // 获取对比数据的键，并按字母顺序排序以确保一致性
    const comparisonKeys = entries
      .filter(([name]) => !order.includes(name))
      .map(([name]) => name)
      .sort();
    
    // 合并完整的顺序
    const fullOrder = [...order, ...comparisonKeys];
    
    // 按顺序返回条目
    return fullOrder
      .filter(name => paths[name] !== undefined)
      .map(name => [name, paths[name]] as [string, string]);
  };

  const sortedEntries = getSortedEntries(currentResult.paths);

  return (
    <div>
      <Card style={{ marginBottom: '24px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Button
              icon={<LeftOutlined />}
              onClick={goToPrevious}
              disabled={results.length <= 1}
              size="large"
            >
              上一张
            </Button>
          </Col>
          
          <Col>
            <div style={{ textAlign: 'center' }}>
              <Title level={4} style={{ margin: 0 }}>
                {currentResult.filename}
              </Title>
              <Text type="secondary">
                {currentIndex + 1} / {results.length}
              </Text>
              {results.length > 1 && (
                <div style={{ marginTop: '4px' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    使用 ← → 键切换图片
                  </Text>
                </div>
              )}
            </div>
          </Col>
          
          <Col>
            <Button
              icon={<RightOutlined />}
              onClick={goToNext}
              disabled={results.length <= 1}
              size="large"
            >
              下一张
            </Button>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        {sortedEntries.map(([name, path]) => (
          <Col key={name} xs={24} md={12} lg={8}>
            <Card 
              title={name}
              style={{ height: '100%' }}
              extra={
                currentResult.iou_scores[name] !== undefined && (
                                     <Progress
                     percent={currentResult.iou_scores[name] * 100}
                     size="small"
                     status={getIouStatus(currentResult.iou_scores[name]) === 'error' ? 'exception' : 'success'}
                     format={(percent) => formatIou(percent! / 100)}
                   />
                )
              }
            >
              <div style={{ textAlign: 'center' }}>
                <SafeImage
                  src={path}
                  alt={`${name} - ${currentResult.filename}`}
                  style={{ maxWidth: '100%', maxHeight: '200px' }}
                />
                {(currentResult.iou_scores[name] !== undefined || currentResult.accuracy_scores[name] !== undefined) && (
                  <div style={{ marginTop: '12px' }}>
                    <Row gutter={8}>
                      {currentResult.iou_scores[name] !== undefined && (
                        <Col span={12}>
                          <Statistic
                            title="IOU"
                            value={currentResult.iou_scores[name] * 100}
                            precision={2}
                            suffix="%"
                            valueStyle={{ 
                              fontSize: '14px',
                              color: getIouStatus(currentResult.iou_scores[name]) === 'success' ? '#52c41a' : 
                                     getIouStatus(currentResult.iou_scores[name]) === 'warning' ? '#faad14' : '#ff4d4f'
                            }}
                          />
                        </Col>
                      )}
                      {currentResult.accuracy_scores[name] !== undefined && (
                        <Col span={12}>
                          <Statistic
                            title="准确率"
                            value={currentResult.accuracy_scores[name] * 100}
                            precision={2}
                            suffix="%"
                            valueStyle={{ 
                              fontSize: '14px',
                              color: currentResult.accuracy_scores[name] >= 0.9 ? '#52c41a' : 
                                     currentResult.accuracy_scores[name] >= 0.7 ? '#faad14' : '#ff4d4f'
                            }}
                          />
                        </Col>
                      )}
                    </Row>
                  </div>
                )}
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Card 
        title={
          <Space>
            <BarChartOutlined />
            性能指标总结
          </Space>
        }
        style={{ marginTop: '24px' }}
      >
        <Row gutter={[16, 16]} justify="center">
          {sortedEntries
            .filter(([name]) => currentResult.iou_scores[name] !== undefined || currentResult.accuracy_scores[name] !== undefined)
            .map(([name]) => (
              <Col key={name} xs={12} md={8} lg={6}>
                <Card size="small" style={{ textAlign: 'center' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <Text strong style={{ fontSize: '14px' }}>{name}</Text>
                  </div>
                  {currentResult.iou_scores[name] !== undefined && (
                    <Statistic
                      title="IOU"
                      value={currentResult.iou_scores[name] * 100}
                      precision={2}
                      suffix="%"
                      valueStyle={{ 
                        fontSize: '16px',
                        color: getIouStatus(currentResult.iou_scores[name]) === 'success' ? '#52c41a' : 
                               getIouStatus(currentResult.iou_scores[name]) === 'warning' ? '#faad14' : '#ff4d4f'
                      }}
                    />
                  )}
                  {currentResult.accuracy_scores[name] !== undefined && (
                    <Statistic
                      title="准确率"
                      value={currentResult.accuracy_scores[name] * 100}
                      precision={2}
                      suffix="%"
                      valueStyle={{ 
                        fontSize: '16px',
                        color: currentResult.accuracy_scores[name] >= 0.9 ? '#52c41a' : 
                               currentResult.accuracy_scores[name] >= 0.7 ? '#faad14' : '#ff4d4f'
                      }}
                    />
                  )}
                </Card>
              </Col>
            ))}
        </Row>
      </Card>

      <div style={{ 
        marginTop: '32px', 
        textAlign: 'center'
      }}>
        <Button
          icon={<ReloadOutlined />}
          onClick={onReset}
          size="large"
        >
          重新开始
        </Button>
      </div>
    </div>
  );
};

export default ComparisonView; 