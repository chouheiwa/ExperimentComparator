import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Switch, Space } from 'antd';
import { TableOutlined, EyeOutlined } from '@ant-design/icons';
import { 
  useComparisonResults,
  useResetState
} from '../store';
import ComparisonView from '../components/ComparisonView';
import AnalysisView from '../components/AnalysisView';

const ComparisonPage: React.FC = () => {
  const navigate = useNavigate();
  const [useAnalysisView, setUseAnalysisView] = useState(true);
  
  // 状态
  const comparisonResults = useComparisonResults();
  
  // 动作
  const resetState = useResetState();

  // 如果没有对比结果，重定向到文件夹选择页面
  useEffect(() => {
    if (comparisonResults.length === 0) {
      navigate('/');
    }
  }, [comparisonResults, navigate]);

  const handleReset = () => {
    resetState();
    navigate('/');
  };

  if (comparisonResults.length === 0) {
    return null; // 或者显示加载状态
  }

  return (
    <>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'flex-end', 
        marginBottom: '16px' 
      }}>
        <Space>
          <Switch
            checked={useAnalysisView}
            onChange={setUseAnalysisView}
            checkedChildren={<TableOutlined />}
            unCheckedChildren={<EyeOutlined />}
          />
          <span style={{ color: '#666' }}>
            {useAnalysisView ? '分析视图' : '对比视图'}
          </span>
        </Space>
      </div>

      {useAnalysisView ? (
        <AnalysisView results={comparisonResults} onReset={handleReset} />
      ) : (
        <ComparisonView results={comparisonResults} onReset={handleReset} />
      )}
    </>
  );
};

export default ComparisonPage; 