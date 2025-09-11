import React, { useState, useMemo, useEffect } from 'react';
import { Card, Row, Col, Select, Switch, Button, Space, Typography, Tag, Modal, message, Spin } from 'antd';
import { DownloadOutlined, StarOutlined, StarFilled } from '@ant-design/icons';
import { invoke } from '@tauri-apps/api/core';
import { showErrorDialog } from '../utils/errorDialog';
import { ComparisonResult } from '../types';
import ImageComparisonGrid from './ImageComparisonGrid';
import SafeImage from './SafeImage';

const { Text } = Typography;
const { Option } = Select;

interface AnalysisViewProps {
  results: ComparisonResult[];
  onReset: () => void;
}

type SortBy = 'my_advantage';
type MetricType = 'iou' | 'accuracy' | 'dice';

interface CaseAnalysis {
  filename: string;
  avgIou: number;
  maxIou: number;
  minIou: number;
  iouVariance: number;
  avgAccuracy: number;
  avgDice: number;
  maxDice: number;
  minDice: number;
  diceVariance: number;
  myAdvantage: number; // 我的方法相对于其他方法的优势
  myIou: number; // 我的方法的IOU
  othersAvgIou: number; // 其他方法的平均IOU
  myDice: number; // 我的方法的Dice系数
  othersAvgDice: number; // 其他方法的平均Dice系数
  category: 'best' | 'worst' | 'typical' | 'high_variance' | 'my_advantage';
}

const AnalysisView: React.FC<AnalysisViewProps> = ({ results, onReset }) => {
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('iou');
  const [sortedData, setSortedData] = useState<CaseAnalysis[]>([]);
  const [isSorting, setIsSorting] = useState(false);
  // 排序方式
  const [sortBy, setSortBy] = useState<SortBy>('my_advantage');
  const [isGridView, setIsGridView] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [markedImages, setMarkedImages] = useState<Set<string>>(new Set());
  const [previewImage, setPreviewImage] = useState<{result: ComparisonResult, methodName: string} | null>(null);

  // 分析每个图像的性能指标
  const analysisData = useMemo<CaseAnalysis[]>(() => {
    return results.map(result => {
      const iouValues = Object.values(result.iou_scores).filter(v => v !== undefined);
      const accValues = Object.values(result.accuracy_scores).filter(v => v !== undefined);
      const diceValues = Object.values(result.dice_scores || {}).filter(v => v !== undefined);
      
      const avgIou = iouValues.length > 0 ? iouValues.reduce((a, b) => a + b, 0) / iouValues.length : 0;
      const maxIou = iouValues.length > 0 ? Math.max(...iouValues) : 0;
      const minIou = iouValues.length > 0 ? Math.min(...iouValues) : 0;
      const avgAccuracy = accValues.length > 0 ? accValues.reduce((a, b) => a + b, 0) / accValues.length : 0;
      
      const avgDice = diceValues.length > 0 ? diceValues.reduce((a, b) => a + b, 0) / diceValues.length : 0;
      const maxDice = diceValues.length > 0 ? Math.max(...diceValues) : 0;
      const minDice = diceValues.length > 0 ? Math.min(...diceValues) : 0;
      
      // 计算方差
      const iouVariance = iouValues.length > 1 ? 
        iouValues.reduce((sum, val) => sum + Math.pow(val - avgIou, 2), 0) / iouValues.length : 0;
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
      
      const myAdvantage = myIou - othersAvgIou;
      
      // 分类 - 根据选定的指标进行分类
      let category: CaseAnalysis['category'] = 'typical';
      
      // 根据选定指标计算优势和阈值
      // 这里暂时使用IOU作为主要分类依据，后续可以根据selectedMetric动态调整
      
      // 这里暂时使用IOU作为主要分类依据，后续可以根据selectedMetric动态调整
      if (myAdvantage > 0.2 && myIou > 0.6) category = 'my_advantage'; // 我的方法明显优于其他方法
      else if (avgIou >= 0.8) category = 'best';
      else if (avgIou <= 0.3) category = 'worst';
      else if (iouVariance > 0.1) category = 'high_variance';
      
      return {
        filename: result.filename,
        avgIou,
        maxIou,
        minIou,
        iouVariance,
        avgAccuracy,
        avgDice,
        maxDice,
        minDice,
        diceVariance,
        myAdvantage,
        myIou,
        othersAvgIou,
        myDice,
        othersAvgDice,
        category
      };
    });
  }, [results, selectedMetric]);

  // 异步排序函数
  const performAsyncSort = async (data: CaseAnalysis[], sortBy: SortBy, sortOrder: 'asc' | 'desc') => {
    return new Promise<CaseAnalysis[]>((resolve) => {
      setTimeout(() => {
        const sorted = [...data];
        sorted.sort((a, b) => {
          let aVal: number, bVal: number;
          switch (sortBy) {
            case 'my_advantage':
              aVal = a.myAdvantage; bVal = b.myAdvantage; break;
            default:
              aVal = a.myAdvantage; bVal = b.myAdvantage;
          }
          return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        });
        resolve(sorted);
      }, 0);
    });
  };

  // 异步排序效果
  useEffect(() => {
    const sortData = async () => {
      if (analysisData.length === 0) return;
      
      setIsSorting(true);
      try {
        const sorted = await performAsyncSort(analysisData, sortBy, sortOrder);
        setSortedData(sorted);
      } catch (error) {
        console.error('排序失败:', error);
      } finally {
        setIsSorting(false);
      }
    };

    sortData();
  }, [analysisData, sortBy, sortOrder]);

  // 获取当前显示的结果
  const displayResults = useMemo(() => {
    return sortedData.map(analysis => 
      results.find(r => r.filename === analysis.filename)!
    );
  }, [sortedData, results]);

  // 切换图像标记
  const toggleMark = (filename: string) => {
    setMarkedImages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(filename)) {
        newSet.delete(filename);
      } else {
        newSet.add(filename);
      }
      return newSet;
    });
  };

  // 导出选中的图像文件
  const exportSelectedImages = async () => {
    if (selectedImages.size === 0) {
      message.warning('请先选择要导出的图像');
      return;
    }
    
    try {
      message.loading('正在选择导出文件夹...', 0);
      
      // 1. 让用户选择导出文件夹
      const exportFolder = await invoke<string>('select_export_folder');
      message.destroy();
      
      if (!exportFolder) {
        message.info('已取消导出');
        return;
      }
      
      // 2. 准备导出数据
      const selectedResults = results.filter(r => selectedImages.has(r.filename));
      const imageFiles = selectedResults.map(result => ({
        filename: result.filename,
        model_paths: result.paths // 保持模型名称和路径的对应关系
      }));
      
      message.loading('正在导出图片文件...', 0);
      
      // 3. 调用后端命令导出图片
      const exportResult = await invoke<string>('export_selected_images', {
        request: {
          export_folder: exportFolder,
          image_files: imageFiles
        }
      });
      
      message.destroy();
      message.success(exportResult);
      
    } catch (error) {
      message.destroy();
      console.error('导出失败:', error);
      showErrorDialog(`导出失败: ${error}`);
    }
  };



  // 获取类别标签
  const getCategoryTag = (category: CaseAnalysis['category']) => {
    const tagProps = {
      'best': { color: 'green', text: '最佳案例' },
      'worst': { color: 'red', text: '最差案例' },
      'typical': { color: 'blue', text: '典型案例' },
      'high_variance': { color: 'orange', text: '高方差' },
      'my_advantage': { color: 'purple', text: '我的优势' }
    };
    return <Tag color={tagProps[category].color}>{tagProps[category].text}</Tag>;
  };

  return (
    <div>
      {/* 控制面板 */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={5}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Text strong>评估指标</Text>
              <Select 
                value={selectedMetric} 
                onChange={setSelectedMetric}
                style={{ width: '100%' }}
                size="small"
              >
                <Option value="iou">IOU</Option>
                <Option value="accuracy">准确率</Option>
                <Option value="dice">Dice系数</Option>
              </Select>
            </Space>
          </Col>
          
          <Col xs={24} md={5}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Text strong>排序方式</Text>
              <Select 
                value={sortBy} 
                onChange={setSortBy}
                style={{ width: '100%' }}
                size="small"
              >
                <Option value="my_advantage">优势度</Option>
              </Select>
            </Space>
          </Col>
          
          <Col xs={24} md={4}>
            <Space direction="vertical" size="small">
              <Text strong>排序顺序</Text>
              <Switch
                checked={sortOrder === 'desc'}
                onChange={(checked) => setSortOrder(checked ? 'desc' : 'asc')}
                checkedChildren="降序"
                unCheckedChildren="升序"
                size="small"
              />
            </Space>
          </Col>
          
          <Col xs={24} md={4}>
            <Space direction="vertical" size="small">
              <Text strong>显示模式</Text>
              <Switch
                checked={isGridView}
                onChange={setIsGridView}
                checkedChildren="网格"
                unCheckedChildren="详细"
                size="small"
              />
            </Space>
          </Col>
          
          <Col xs={24} md={4}>
            <Space direction="vertical" size="small">
              <Text strong>操作</Text>
              <Button 
                icon={<DownloadOutlined />} 
                onClick={exportSelectedImages}
                size="small"
                disabled={selectedImages.size === 0}
                type="primary"
              >
                导出图片
              </Button>
            </Space>
          </Col>
        </Row>
        
        <Row style={{ marginTop: '12px' }}>
          <Col span={24}>
            <Text type="secondary">
              显示 {displayResults.length} / {results.length} 个图像
              {markedImages.size > 0 && ` · 已标记 ${markedImages.size} 个`}
              {selectedImages.size > 0 && ` · 已选中 ${selectedImages.size} 个`}
            </Text>

          </Col>
        </Row>
      </Card>

      {/* 图像展示区域 */}
      <Spin spinning={isSorting} tip="正在排序...">
        <Row gutter={[16, 16]}>
        {displayResults.map((result) => {
          const analysis = analysisData.find(a => a.filename === result.filename)!;
          
          return (
            <Col key={result.filename} xs={24} lg={isGridView ? 8 : 24}>
              <Card
                title={
                  <Space>
                    <Button
                      type="text"
                      icon={markedImages.has(result.filename) ? <StarFilled /> : <StarOutlined />}
                      onClick={() => toggleMark(result.filename)}
                      style={{ color: markedImages.has(result.filename) ? '#faad14' : undefined }}
                    />
                    <Text strong>{result.filename}</Text>
                    {getCategoryTag(analysis.category)}
                  </Space>
                }
                extra={
                  <Switch
                    checked={selectedImages.has(result.filename)}
                    onChange={(checked) => {
                      if (checked) {
                        setSelectedImages(prev => new Set([...prev, result.filename]));
                      } else {
                        setSelectedImages(prev => {
                          const newSet = new Set(prev);
                          newSet.delete(result.filename);
                          return newSet;
                        });
                      }
                    }}
                    checkedChildren="选中"
                    unCheckedChildren="选中"
                    size="small"
                  />
                }
                style={{
                  border: selectedImages.has(result.filename) ? '2px solid #1890ff' : undefined
                }}
              >
                {/* 图像展示及统计信息 */}
                <ImageComparisonGrid
                  result={result}
                  isGridView={isGridView}
                  onPreviewImage={(result, methodName) => setPreviewImage({result, methodName})}
                  showPreviewButton={true}
                  showStatistics={true}
                  statisticsPosition="top"
                  selectedMetric={selectedMetric}
                />
              </Card>
            </Col>
          );
        })}
        </Row>
      </Spin>

      {/* 图像预览模态框 */}
      <Modal
        title={previewImage ? `${previewImage.methodName} - ${previewImage.result.filename}` : ''}
        open={!!previewImage}
        onCancel={() => setPreviewImage(null)}
        footer={null}
        width={800}
        centered
      >
        {previewImage && (
          <div style={{ textAlign: 'center' }}>
            <SafeImage
              src={previewImage.result.paths[previewImage.methodName]}
              alt={`${previewImage.methodName} - ${previewImage.result.filename}`}
              style={{ 
                maxWidth: '100%', 
                maxHeight: '70vh',
                objectFit: 'contain'
              }}
            />
          </div>
        )}
      </Modal>

      {/* 重置按钮 */}
      <div style={{ marginTop: '32px', textAlign: 'center' }}>
        <Button onClick={onReset} size="large">
          重新开始
        </Button>
      </div>
    </div>
  );
};

export default AnalysisView;