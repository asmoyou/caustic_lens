import React from 'react';
import { Progress, Card, Typography, Row, Col, Statistic, Tag, Tooltip } from 'antd';
import { ClockCircleOutlined, ThunderboltOutlined, DatabaseOutlined, CheckCircleOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

interface ProgressDetails {
  iteration?: number;
  totalIterations?: number;
  currentError?: number;
  bestError?: number;
  converged?: boolean;
  discrepancy?: number;
  gradientNorm?: number;
  phase?: string;
  estimatedTimeRemaining?: number;
  avgIterationTime?: number;
  startTime?: number;
  elapsedTime?: number;
  memoryUsage?: number;
  cpuUsage?: number;
  processingSpeed?: number;
}

interface EnhancedProgressDisplayProps {
  progress: number;
  progressDetails?: ProgressDetails | null;
  title?: string;
  showPerformanceMetrics?: boolean;
}

/**
 * 格式化时间显示
 */
const formatTime = (milliseconds: number): string => {
  if (milliseconds < 1000) {
    return `${Math.round(milliseconds)}ms`;
  }
  
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
};

/**
 * 格式化内存大小
 */
const formatMemory = (mb: number): string => {
  if (mb < 1024) {
    return `${mb.toFixed(1)} MB`;
  }
  return `${(mb / 1024).toFixed(2)} GB`;
};

/**
 * 获取进度状态
 */
const getProgressStatus = (progress: number, converged?: boolean): 'success' | 'active' | 'exception' => {
  if (converged) return 'success';
  if (progress === 100) return 'success';
  return 'active';
};

/**
 * 获取收敛状态标签
 */
const getConvergenceTag = (converged?: boolean, currentError?: number, bestError?: number, progress?: number) => {
  if (converged) {
    return <Tag color="green" icon={<CheckCircleOutlined />}>已收敛</Tag>;
  }
  
  // 如果进度达到100%，即使没有明确标记为收敛，也应该显示完成状态
  if (progress === 100) {
    return <Tag color="green" icon={<CheckCircleOutlined />}>已完成</Tag>;
  }
  
  if (currentError !== undefined && bestError !== undefined && bestError !== Infinity) {
    const improvement = ((bestError - currentError) / bestError) * 100;
    if (improvement > 0) {
      return <Tag color="blue">优化中 (+{improvement.toFixed(2)}%)</Tag>;
    }
  }
  
  return <Tag color="orange">计算中</Tag>;
};

export const EnhancedProgressDisplay: React.FC<EnhancedProgressDisplayProps> = ({
  progress,
  progressDetails,
  title = "处理进度",
  showPerformanceMetrics = true
}) => {
  // 只有在进度为0且没有详细信息时才不显示
  if (progress === 0 && !progressDetails) {
    return null;
  }

  const {
    iteration,
    totalIterations,
    currentError,
    bestError,
    converged,
    discrepancy,
    gradientNorm,
    phase,
    estimatedTimeRemaining,
    avgIterationTime,
    startTime,
    elapsedTime,
    memoryUsage,
    cpuUsage,
    processingSpeed
  } = progressDetails || {};

  const progressPercent = Math.min(Math.max(progress, 0), 100);

  return (
    <Card 
      size="small" 
      style={{ marginBottom: 16 }}
      bodyStyle={{ padding: '16px' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* 标题和状态 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={5} style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{title}</Title>
          {getConvergenceTag(converged, currentError, bestError, progressPercent)}
        </div>

        {/* 主进度条 */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontSize: '14px', color: '#666', fontWeight: 500 }}>
              {phase || '处理中'}
            </Text>
            <Text style={{ fontSize: '14px', fontWeight: 600, color: '#1890ff' }}>
              {progressPercent}%
            </Text>
          </div>
          <Progress 
            percent={progressPercent} 
            status={getProgressStatus(progressPercent, converged)}
            strokeWidth={10}
            showInfo={false}
            strokeColor={{
              '0%': '#108ee9',
              '100%': '#87d068',
            }}
          />
        </div>

        {/* 迭代进度 */}
        {iteration !== undefined && totalIterations && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
            <Text style={{ fontSize: '14px', color: '#666', fontWeight: 500 }}>迭代进度</Text>
            <Text style={{ fontSize: '14px', fontFamily: 'monospace', fontWeight: 600, color: '#1890ff' }}>
              {iteration}/{totalIterations}
            </Text>
          </div>
        )}

        {/* 时间信息 */}
        {(estimatedTimeRemaining || elapsedTime || avgIterationTime) && (
          <div style={{ padding: '12px', backgroundColor: '#fafafa', borderRadius: '8px', border: '1px solid #f0f0f0' }}>
            <Row gutter={[8, 8]} style={{ flexWrap: 'nowrap' }}>
              {elapsedTime && (
                <Col flex="1" style={{ minWidth: 0 }}>
                  <Statistic
                    title="已用时间"
                    value={formatTime(elapsedTime)}
                    prefix={<ClockCircleOutlined style={{ color: '#52c41a' }} />}
                    valueStyle={{ fontSize: '14px', fontWeight: 600, color: '#52c41a', whiteSpace: 'nowrap' }}
                    titleStyle={{ fontSize: '11px', color: '#666', whiteSpace: 'nowrap' }}
                  />
                </Col>
              )}
              {estimatedTimeRemaining && estimatedTimeRemaining > 0 && (
                <Col flex="1" style={{ minWidth: 0 }}>
                  <Statistic
                    title="预计剩余"
                    value={formatTime(estimatedTimeRemaining)}
                    prefix={<ClockCircleOutlined style={{ color: '#1890ff' }} />}
                    valueStyle={{ fontSize: '14px', fontWeight: 600, color: '#1890ff', whiteSpace: 'nowrap' }}
                    titleStyle={{ fontSize: '11px', color: '#666', whiteSpace: 'nowrap' }}
                  />
                </Col>
              )}
              {avgIterationTime && (
                <Col flex="1" style={{ minWidth: 0 }}>
                  <Statistic
                    title="平均迭代"
                    value={formatTime(avgIterationTime)}
                    prefix={<ThunderboltOutlined style={{ color: '#fa8c16' }} />}
                    valueStyle={{ fontSize: '14px', fontWeight: 600, color: '#fa8c16', whiteSpace: 'nowrap' }}
                    titleStyle={{ fontSize: '11px', color: '#666', whiteSpace: 'nowrap' }}
                  />
                </Col>
              )}
            </Row>
          </div>
        )}

        {/* 性能指标 */}
        {showPerformanceMetrics && (memoryUsage || cpuUsage || processingSpeed) && (
          <Row gutter={16}>
            {memoryUsage && (
              <Col span={8}>
                <Statistic
                  title="内存使用"
                  value={formatMemory(memoryUsage)}
                  prefix={<DatabaseOutlined />}
                  valueStyle={{ fontSize: '14px' }}
                />
              </Col>
            )}
            {cpuUsage && (
              <Col span={8}>
                <Statistic
                  title="CPU使用率"
                  value={`${cpuUsage.toFixed(1)}%`}
                  prefix={<ThunderboltOutlined />}
                  valueStyle={{ fontSize: '14px' }}
                />
              </Col>
            )}
            {processingSpeed && (
              <Col span={8}>
                <Statistic
                  title="处理速度"
                  value={`${processingSpeed.toFixed(0)} px/s`}
                  valueStyle={{ fontSize: '14px' }}
                />
              </Col>
            )}
          </Row>
        )}

        {/* 算法详细信息 */}
        {(currentError !== undefined || bestError !== undefined || discrepancy !== undefined || gradientNorm !== undefined) && (
          <div className="bg-gray-50 p-3 rounded text-xs space-y-2">
            <div className="font-medium text-gray-700 mb-2">算法指标</div>
            
            {currentError !== undefined && (
              <div className="flex justify-between">
                <span>当前误差:</span>
                <Tooltip title="当前迭代的目标函数值">
                  <span className="font-mono">{currentError.toExponential(3)}</span>
                </Tooltip>
              </div>
            )}
            
            {bestError !== undefined && bestError !== Infinity && (
              <div className="flex justify-between">
                <span>最佳误差:</span>
                <Tooltip title="迄今为止找到的最小误差值">
                  <span className="font-mono text-green-600">{bestError.toExponential(3)}</span>
                </Tooltip>
              </div>
            )}
            
            {discrepancy !== undefined && (
              <div className="flex justify-between">
                <span>差异度量:</span>
                <Tooltip title="当前解与目标的差异程度">
                  <span className="font-mono">{discrepancy.toExponential(3)}</span>
                </Tooltip>
              </div>
            )}
            
            {gradientNorm !== undefined && (
              <div className="flex justify-between">
                <span>梯度范数:</span>
                <Tooltip title="梯度向量的大小，反映优化方向的强度">
                  <span className="font-mono">{gradientNorm.toExponential(3)}</span>
                </Tooltip>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default EnhancedProgressDisplay;