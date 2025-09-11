import React, { useMemo } from 'react';
import { Tag, Button, Typography, Statistic, Space } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { ComparisonResult } from '../types';
import { formatMetric, getMetricStatus } from '../utils';
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
  selectedMetric?: 'iou' | 'accuracy' | 'dice'; // 选定的评估指标
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
  statisticsPosition = 'top',
  selectedMetric = 'iou'
}) => {
  const sortedEntries = getSortedEntries(result.paths);
  
  // 计算默认值
  const defaultImageHeight = imageHeight || (isGridView ? 100 : 150);

  // 计算统计信息
  const statisticsData = useMemo(() => {
    if (!showStatistics) return null;

    const iouValues = Object.values(result.iou_scores).filter(v => v !== undefined);
    const accValues = Object.values(result.accuracy_scores).filter(v => v !== undefined);
    const diceValues = Object.values(result.dice_scores || {}).filter(v => v !== undefined);
    
    const avgIou = iouValues.length > 0 ? iouValues.reduce((a, b) => a + b, 0) / iouValues.length : 0;
    const avgAccuracy = accValues.length > 0 ? accValues.reduce((a, b) => a + b, 0) / accValues.length : 0;
    const avgDice = diceValues.length > 0 ? diceValues.reduce((a, b) => a + b, 0) / diceValues.length : 0;
    
    // 计算方差
    const iouVariance = iouValues.length > 1 ? 
      iouValues.reduce((sum, val) => sum + Math.pow(val - avgIou, 2), 0) / iouValues.length : 0;
    const accuracyVariance = accValues.length > 1 ? 
      accValues.reduce((sum, val) => sum + Math.pow(val - avgAccuracy, 2), 0) / accValues.length : 0;
    const diceVariance = diceValues.length > 1 ? 
      diceValues.reduce((sum, val) => sum + Math.pow(val - avgDice, 2), 0) / diceValues.length : 0;
    
    // 计算我的方法优势
    const myIou = result.iou_scores['我的结果'] || 0;
    const otherIouValues = Object.entries(result.iou_scores)
      .filter(([name, value]) => name !== '我的结果' && value !== undefined)
      .map(([, value]) => value);
    const othersAvgIou = otherIouValues.length > 0 ? 
      otherIouValues.reduce((a, b) => a + b, 0) / otherIouValues.length : 0;
    
    const myDice = result.dice_scores?.['我的结果'] || 0;
    const otherDiceValues = Object.entries(result.dice_scores || {})
      .filter(([name, value]) => name !== '我的结果' && value !== undefined)
      .map(([, value]) => value);
    const othersAvgDice = otherDiceValues.length > 0 ? 
      otherDiceValues.reduce((a, b) => a + b, 0) / otherDiceValues.length : 0;
    
    // 根据选定指标计算优势
    const myAccuracy = result.accuracy_scores['我的结果'] || 0;
    const otherAccuracyValues = Object.entries(result.accuracy_scores)
      .filter(([name, value]) => name !== '我的结果' && value !== undefined)
      .map(([, value]) => value);
    const othersAvgAccuracy = otherAccuracyValues.length > 0 ? 
      otherAccuracyValues.reduce((a, b) => a + b, 0) / otherAccuracyValues.length : 0;
    
    // 根据selectedMetric计算当前指标的优势
    let myAdvantage = 0;
    switch (selectedMetric) {
      case 'accuracy':
        myAdvantage = myAccuracy - othersAvgAccuracy;
        break;
      case 'dice':
        myAdvantage = myDice - othersAvgDice;
        break;
      default: // 'iou'
        myAdvantage = myIou - othersAvgIou;
        break;
    }
    
    return {
      avgIou,
      avgAccuracy,
      avgDice,
      iouVariance,
      accuracyVariance,
      diceVariance,
      myIou,
      othersAvgIou,
      myDice,
      othersAvgDice,
      myAccuracy,
      othersAvgAccuracy,
      myAdvantage
    };
  }, [result, showStatistics, selectedMetric]);

  // 统计信息组件
  const StatisticsRow = () => {
    if (!showStatistics || !statisticsData) return null;

    const getMetricData = () => {
      switch (selectedMetric) {
        case 'accuracy':
          return {
            title: '平均准确率',
            value: statisticsData.avgAccuracy * 100,
            myValue: (result.accuracy_scores['我的结果'] || 0) * 100,
            myTitle: '我的准确率'
          };
        case 'dice':
          return {
            title: '平均Dice系数',
            value: statisticsData.avgDice * 100,
            myValue: (result.dice_scores?.['我的结果'] || 0) * 100,
            myTitle: '我的Dice系数'
          };
        default: // 'iou'
          return {
            title: '平均IOU',
            value: statisticsData.avgIou * 100,
            myValue: (result.iou_scores['我的结果'] || 0) * 100,
            myTitle: '我的IOU'
          };
      }
    };

    const metricData = getMetricData();

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
          title={metricData.title}
          value={metricData.value}
          precision={2}
          suffix="%"
          valueStyle={{ fontSize: isGridView ? '14px' : '16px' }}
        />
        <Statistic
          title={metricData.myTitle}
          value={metricData.myValue}
          precision={2}
          suffix="%"
          valueStyle={{ 
            fontSize: isGridView ? '14px' : '16px',
            color: statisticsData.myAdvantage > 0 ? '#52c41a' : '#ff4d4f'
          }}
        />
        <Statistic
          title="其他平均"
          value={selectedMetric === 'accuracy' ? statisticsData.avgAccuracy * 100 :
                 selectedMetric === 'dice' ? statisticsData.othersAvgDice * 100 :
                 statisticsData.othersAvgIou * 100}
          precision={2}
          suffix="%"
          valueStyle={{ fontSize: isGridView ? '14px' : '16px' }}
        />
        <Statistic
          title="我的优势"
          value={statisticsData.myAdvantage * 100}
          precision={2}
          suffix="%"
          valueStyle={{ 
            fontSize: isGridView ? '14px' : '16px',
            color: statisticsData.myAdvantage > 0.2 ? '#52c41a' : 
                   statisticsData.myAdvantage > 0 ? '#faad14' : '#ff4d4f'
          }}
        />
        <Statistic
          title={selectedMetric === 'accuracy' ? '准确率方差' :
                 selectedMetric === 'dice' ? 'Dice系数方差' :
                 'IOU方差'}
          value={(selectedMetric === 'accuracy' ? statisticsData.accuracyVariance :
                 selectedMetric === 'dice' ? statisticsData.diceVariance :
                 statisticsData.iouVariance) * 100}
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
              {(() => {
                const scores = selectedMetric === 'accuracy' ? result.accuracy_scores :
                              selectedMetric === 'dice' ? result.dice_scores :
                              result.iou_scores;
                const score = scores[name];
                return score !== undefined && (
                   <Tag 
                     color={
                       getMetricStatus(score) === 'success' ? 'green' : 
                       getMetricStatus(score) === 'warning' ? 'orange' : 'red'
                     }
                     style={{ fontSize: '10px', margin: 0 }}
                   >
                     {formatMetric(score)}
                   </Tag>
                 );
              })()}
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