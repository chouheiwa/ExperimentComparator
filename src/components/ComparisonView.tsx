import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Typography, Space, Row, Col, Statistic, Switch, message, Modal } from 'antd';
import { LeftOutlined, RightOutlined, ReloadOutlined, BarChartOutlined, DownloadOutlined } from '@ant-design/icons';
import { invoke } from '@tauri-apps/api/tauri';
import { ComparisonResult } from '../types';
import { getIouStatus } from '../utils';
import ImageComparisonGrid, { getSortedEntries } from './ImageComparisonGrid';
import SafeImage from './SafeImage';

const { Title, Text } = Typography;

interface ComparisonViewProps {
  results: ComparisonResult[];
  onReset: () => void;
}

const ComparisonView: React.FC<ComparisonViewProps> = ({ results, onReset }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [previewImage, setPreviewImage] = useState<{result: ComparisonResult, methodName: string} | null>(null);

  const currentResult = results[currentIndex];

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
      message.error(`导出失败: ${error}`);
    }
  };



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

  const sortedEntries = getSortedEntries(currentResult.paths);


  return (
    <div>
      {/* 选择和导出控制面板 */}
      <Card style={{ marginBottom: '16px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Text strong>图片选择:</Text>
              <Switch
                checked={selectedImages.has(currentResult.filename)}
                onChange={(checked) => {
                  if (checked) {
                    setSelectedImages(prev => new Set([...prev, currentResult.filename]));
                  } else {
                    setSelectedImages(prev => {
                      const newSet = new Set(prev);
                      newSet.delete(currentResult.filename);
                      return newSet;
                    });
                  }
                }}
                checkedChildren="已选中"
                unCheckedChildren="选中"
              />
              <Text type="secondary">
                已选中 {selectedImages.size} / {results.length} 张图片
              </Text>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button
                type="default"
                onClick={() => {
                  if (selectedImages.size === results.length) {
                    setSelectedImages(new Set());
                  } else {
                    setSelectedImages(new Set(results.map(r => r.filename)));
                  }
                }}
              >
                {selectedImages.size === results.length ? '取消全选' : '全选'}
              </Button>
              <Button 
                icon={<DownloadOutlined />} 
                onClick={exportSelectedImages}
                disabled={selectedImages.size === 0}
                type="primary"
              >
                导出选中图片
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

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

      <Card style={{ marginBottom: '24px' }}>
        <ImageComparisonGrid
          result={currentResult}
          isGridView={false}
          showPreviewButton={true}
          onPreviewImage={(result, methodName) => setPreviewImage({result, methodName})}
          imageHeight={200}
          showStatistics={true}
          statisticsPosition="top"
        />
      </Card>

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
    </div>
  );
};

export default ComparisonView;