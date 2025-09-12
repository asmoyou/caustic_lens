import React from 'react';
import { Card, Button, Space, Typography, Empty, Image, Row, Col, Tag, Tooltip } from 'antd';
import { DeleteOutlined, DownloadOutlined, EyeOutlined, ClearOutlined } from '@ant-design/icons';
import { useProjectStore } from '../../stores/projectStore';

const { Title, Text } = Typography;

export const CausticsRenderArea: React.FC = () => {
  const { causticsRenderResults, deleteCausticsRenderResult, clearCausticsRenderResults } = useProjectStore();

  // 格式化时间显示
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // 格式化渲染时间
  const formatRenderTime = (ms: number) => {
    if (ms < 1000) {
      return `${ms}ms`;
    } else {
      return `${(ms / 1000).toFixed(1)}s`;
    }
  };

  // 下载图像
  const downloadImage = (result: any) => {
    const link = document.createElement('a');
    link.href = result.imageData;
    link.download = `caustics_${result.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 删除单个结果
  const handleDeleteResult = (id: string) => {
    deleteCausticsRenderResult(id);
  };

  // 清空所有结果
  const handleClearAll = () => {
    clearCausticsRenderResults();
  };

  return (
    <Card
      title={
        <Space>
          <EyeOutlined style={{ color: '#667eea' }} />
          <span style={{ fontSize: '16px', fontWeight: 600, color: '#333' }}>
            焦散图案渲染结果
          </span>
          <Tag color="blue">{causticsRenderResults.length} 个结果</Tag>
        </Space>
      }
      style={{
        borderRadius: '12px',
        border: 'none',
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
      }}
      styles={{
        header: {
          borderBottom: '1px solid #f0f0f0',
          borderRadius: '12px 12px 0 0',
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)'
        }
      }}
      extra={
        <Space>
          {causticsRenderResults.length > 0 && (
            <Button
              icon={<ClearOutlined />}
              onClick={handleClearAll}
              size="small"
              danger
            >
              清空全部
            </Button>
          )}
        </Space>
      }
    >
      <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '8px 0' }}>
        {causticsRenderResults.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span style={{ color: '#999' }}>
                暂无渲染结果<br />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  请在上方3D预览中点击"开始渲染"按钮
                </Text>
              </span>
            }
          />
        ) : (
          <Row gutter={[16, 16]}>
            {causticsRenderResults.map((result) => (
              <Col span={24} key={result.id}>
                <Card
                  size="small"
                  style={{
                    border: '1px solid #f0f0f0',
                    borderRadius: '8px',
                    background: result.status === 'error' ? '#fff2f0' : '#fff'
                  }}
                >
                  <Row gutter={16} align="middle">
                    <Col span={6}>
                      {result.status === 'processing' ? (
                        <div
                          style={{
                            width: '100px',
                            height: '100px',
                            background: 'linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)',
                            backgroundSize: '20px 20px',
                            backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            animation: 'pulse 2s infinite'
                          }}
                        >
                          <Text style={{ fontSize: '24px' }}>⚙️</Text>
                        </div>
                      ) : result.status === 'error' ? (
                        <div
                          style={{
                            width: '100px',
                            height: '100px',
                            background: '#fff2f0',
                            border: '2px dashed #ff4d4f',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Text style={{ fontSize: '24px', color: '#ff4d4f' }}>❌</Text>
                        </div>
                      ) : (
                        <Image
                          src={result.imageData}
                          alt="焦散图案"
                          width={100}
                          height={100}
                          style={{ borderRadius: '6px', objectFit: 'cover' }}
                          preview={{
                            mask: <EyeOutlined style={{ fontSize: '16px' }} />
                          }}
                        />
                      )}
                    </Col>
                    <Col span={12}>
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <div>
                          <Text strong style={{ fontSize: '14px' }}>
                            渲染 #{result.id.split('_')[1]?.slice(-6) || 'Unknown'}
                          </Text>
                          <Tag
                            color={
                              result.status === 'success' ? 'green' :
                              result.status === 'error' ? 'red' : 'blue'
                            }
                            style={{ marginLeft: '8px' }}
                          >
                            {result.status === 'success' ? '成功' :
                             result.status === 'error' ? '失败' : '处理中'}
                          </Tag>
                        </div>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {formatTime(result.timestamp)}
                        </Text>
                        <div style={{ fontSize: '12px' }}>
                          <Text type="secondary">参数: </Text>
                          <Text>{result.parameters.lensWidth}×{result.parameters.lensHeight}mm, </Text>
                          <Text>焦距{result.parameters.focalLength}mm</Text>
                        </div>
                        {result.status === 'success' && (
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            渲染耗时: {formatRenderTime(result.renderTime)}
                          </Text>
                        )}
                        {result.status === 'error' && result.errorMessage && (
                          <Text type="danger" style={{ fontSize: '12px' }}>
                            错误: {result.errorMessage}
                          </Text>
                        )}
                      </Space>
                    </Col>
                    <Col span={6}>
                      <Space direction="vertical" size="small">
                        {result.status === 'success' && (
                          <Tooltip title="下载图像">
                            <Button
                              icon={<DownloadOutlined />}
                              size="small"
                              onClick={() => downloadImage(result)}
                            >
                              下载
                            </Button>
                          </Tooltip>
                        )}
                        <Tooltip title="删除结果">
                          <Button
                            icon={<DeleteOutlined />}
                            size="small"
                            danger
                            onClick={() => handleDeleteResult(result.id)}
                          >
                            删除
                          </Button>
                        </Tooltip>
                      </Space>
                    </Col>
                  </Row>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </div>
      
      <style jsx>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </Card>
  );
};

export default CausticsRenderArea;