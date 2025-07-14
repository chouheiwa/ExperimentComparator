import React, { useMemo } from 'react';
import { Tag, Button, Typography, Statistic, Space } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { ComparisonResult } from '../types';
import { formatIou, getIouStatus } from '../utils';
import SafeImage from './SafeImage';

const { Text } = Typography;

export interface ImageComparisonGridProps {
  result: ComparisonResult;
  isGridView?: boolean;
  onPreviewImage?: (result: ComparisonResult, methodName: string) => void;
  showPreviewButton?: boolean;
  imageHeight?: number;
  showStatistics?: boolean; // 是否显示统计信息
  statisticsPosition?: 'top' | 'bottom'; // 统计信息位置
}

// 获取排序后的图片条目
export const getSortedEntries = (paths: Record<string, string>) => {
  const entries = Object.entries(paths);
  const order = ['原始图片', 'GT', '我的结果'];
  const comparisonKeys = entries
    .filter(([name]) => !order.includes(name))
    .map(([name]) => name)
    .sort();
  const fullOrder = [...order, ...comparisonKeys];
  return fullOrder
    .filter(name => paths[name] !== undefined)
    .map(name => [name, paths[name]] as [string, string]);
};

const ImageComparisonGrid: React.FC<ImageComparisonGridProps> = ({
  result,
  isGridView = false,
  onPreviewImage,
  showPreviewButton = true,
  imageHeight,
  showStatistics = false,
  statisticsPosition = 'top'
}) => {
  const sortedEntries = getSortedEntries(result.paths);
  
  // 计算默认值
  const defaultImageHeight = imageHeight || (isGridView ? 100 : 150);

  // 计算统计信息
  const statisticsData = useMemo(() => {
    if (!showStatistics) return null;

    const iouValues = Object.values(result.iou_scores).filter(v => v !== undefined);
    const accValues = Object.values(result.accuracy_scores).filter(v => v !== undefined);
    
    const avgIou = iouValues.length > 0 ? iouValues.reduce((a, b) => a + b, 0) / iouValues.length : 0;
    const avgAccuracy = accValues.length > 0 ? accValues.reduce((a, b) => a + b, 0) / accValues.length : 0;
    
    // 计算方差
    const iouVariance = iouValues.length > 1 ? 
      iouValues.reduce((sum, val) => sum + Math.pow(val - avgIou, 2), 0) / iouValues.length : 0;
    
    // 计算我的方法优势
    const myIou = result.iou_scores['我的结果'] || 0;
    const otherIouValues = Object.entries(result.iou_scores)
      .filter(([name, value]) => name !== '我的结果' && value !== undefined)
      .map(([, value]) => value);
    const othersAvgIou = otherIouValues.length > 0 ? 
      otherIouValues.reduce((a, b) => a + b, 0) / otherIouValues.length : 0;
    const myAdvantage = myIou - othersAvgIou;
    
    return {
      avgIou,
      avgAccuracy,
      iouVariance,
      myIou,
      othersAvgIou,
      myAdvantage
    };
  }, [result, showStatistics]);

  // 统计信息组件
  const StatisticsRow = () => {
    if (!showStatistics || !statisticsData) return null;

    return (
      <Space 
        size={16} 
        wrap 
        style={{ 
          width: '100%',
          justifyContent: 'space-around',
          marginBottom: statisticsPosition === 'top' ? '8px' : '0', 
          marginTop: statisticsPosition === 'bottom' ? '8px' : '0'
        }}
      >
        <Statistic
          title="平均IOU"
          value={statisticsData.avgIou * 100}
          precision={1}
          suffix="%"
          valueStyle={{ fontSize: isGridView ? '14px' : '16px' }}
        />
        <Statistic
          title="我的IOU"
          value={statisticsData.myIou * 100}
          precision={1}
          suffix="%"
          valueStyle={{ 
            fontSize: isGridView ? '14px' : '16px',
            color: statisticsData.myAdvantage > 0 ? '#52c41a' : '#ff4d4f'
          }}
        />
        <Statistic
          title="其他平均"
          value={statisticsData.othersAvgIou * 100}
          precision={1}
          suffix="%"
          valueStyle={{ fontSize: isGridView ? '14px' : '16px' }}
        />
        <Statistic
          title="我的优势"
          value={statisticsData.myAdvantage * 100}
          precision={1}
          suffix="%"
          valueStyle={{ 
            fontSize: isGridView ? '14px' : '16px',
            color: statisticsData.myAdvantage > 0.2 ? '#52c41a' : 
                   statisticsData.myAdvantage > 0 ? '#faad14' : '#ff4d4f'
          }}
        />
        <Statistic
          title="平均准确率"
          value={statisticsData.avgAccuracy * 100}
          precision={1}
          suffix="%"
          valueStyle={{ fontSize: isGridView ? '14px' : '16px' }}
        />
        <Statistic
          title="IOU方差"
          value={statisticsData.iouVariance * 100}
          precision={2}
          suffix="%"
          valueStyle={{ fontSize: isGridView ? '14px' : '16px' }}
        />
      </Space>
    );
  };

  return (
    <div>
      {/* 顶部统计信息 */}
      {statisticsPosition === 'top' && <StatisticsRow />}
      
            {/* 图片网格 */}
      <Space size={2} wrap align="start">
        {sortedEntries.map(([name, path]) => (
          <div 
            key={name} 
            style={{ 
              width: '200px',
              textAlign: 'center'
            }}
          >
            {/* 标题信息 */}
            <Space size={4} wrap style={{ marginBottom: '4px', justifyContent: 'center' }}>
              <Text strong style={{ fontSize: '12px', color: '#333' }}>{name}</Text>
              {result.iou_scores[name] !== undefined && (
                <Tag 
                  color={
                    getIouStatus(result.iou_scores[name]) === 'success' ? 'green' : 
                    getIouStatus(result.iou_scores[name]) === 'warning' ? 'orange' : 'red'
                  }
                  style={{ fontSize: '10px', margin: 0 }}
                >
                  {formatIou(result.iou_scores[name])}
                </Tag>
              )}
              {showPreviewButton && onPreviewImage && (
                <Button
                  type="text"
                  icon={<EyeOutlined />}
                  size="small"
                  onClick={() => onPreviewImage(result, name)}
                  style={{ padding: '0 2px', minWidth: 'auto', height: '16px' }}
                />
              )}
            </Space>

            {/* 图片 */}
            <div 
              style={{ 
                cursor: onPreviewImage ? 'pointer' : 'default'
              }}
              onClick={() => onPreviewImage && onPreviewImage(result, name)}
            >
              <SafeImage
                src={path}
                alt={`${name} - ${result.filename}`}
                style={{ 
                  width: '100%', 
                  height: `${defaultImageHeight}px`,
                  objectFit: 'contain',
                  display: 'block'
                }}
              />
            </div>
          </div>
        ))}
      </Space>
      
      {/* 底部统计信息 */}
      {statisticsPosition === 'bottom' && <StatisticsRow />}
    </div>
  );
};

export default ImageComparisonGrid; 