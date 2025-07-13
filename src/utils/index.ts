import { Step } from '../types';

export const getIouClass = (iou: number): string => {
  if (iou >= 0.7) return 'iou-high';
  if (iou >= 0.4) return 'iou-medium';
  return 'iou-low';
};

export const formatIou = (iou: number): string => {
  return (iou * 100).toFixed(2) + '%';
};

export const getStepTitle = (step: Step): string => {
  switch (step) {
    case 'folder-selection':
      return '选择文件夹';
    case 'validation':
      return '验证文件';
    case 'comparison':
      return '对比结果';
    default:
      return '';
  }
};

export const getIouStatus = (iou: number): 'success' | 'warning' | 'error' => {
  if (iou >= 0.7) return 'success';
  if (iou >= 0.4) return 'warning';
  return 'error';
}; 