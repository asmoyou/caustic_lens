import React, { useState, useEffect } from 'react';
import { Card, Button, Space, Typography, Empty, Image, Row, Col, Tag, Tooltip } from 'antd';
import { DeleteOutlined, DownloadOutlined, EyeOutlined, ClearOutlined } from '@ant-design/icons';
import { useProjectStore } from '../../stores/projectStore';

const { Title, Text } = Typography;

export const CausticsRenderArea: React.FC = () => {
  const { causticsRenderResults, deleteCausticsRenderResult, clearCausticsRenderResults } = useProjectStore();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
        <Space wrap>
          <EyeOutlined style={{ color: '#667eea' }} />
          <span style={{ fontSize: isMobile ? '14px' : '16px', fontWeight: 600, color: '#333' }}>
            {isMobile ? '渲染结果' : '焦散图案渲染结果'}
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
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
          padding: isMobile ? '8px 12px' : '12px 24px'
        }
      }}
      extra={
        <Space>
          {causticsRenderResults.length > 0 && (
            <Button
              icon={<ClearOutlined />}
              onClick={handleClearAll}
              size={isMobile ? 'small' : 'small'}
              danger
            >
              {isMobile ? '清空' : '清空全部'}
            </Button>
          )}
        </Space>
      }
    >
      <div style={{ maxHeight: isMobile ? '400px' : '600px', overflowY: 'auto', padding: '8px 0' }}>
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
                  <Row gutter={isMobile ? 8 : 16} align="middle">
                    <Col span={isMobile ? 24 : 6} style={{ marginBottom: isMobile ? 8 : 0 }}>
                      {result.status === 'processing' ? (
                        <div
                          style={{
                            width: isMobile ? '80px' : '100px',
                            height: isMobile ? '80px' : '100px',
                            background: 'linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)',
                            backgroundSize: '20px 20px',
                            backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            animation: 'pulse 2s infinite',
                            margin: isMobile ? '0 auto' : 0
                          }}
                        >
                          <Text style={{ fontSize: isMobile ? '20px' : '24px' }}>⚙️</Text>
                        </div>
                      ) : result.status === 'error' ? (
                        <div
                          style={{
                            width: isMobile ? '80px' : '100px',
                            height: isMobile ? '80px' : '100px',
                            background: '#fff2f0',
                            border: '2px dashed #ff4d4f',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: isMobile ? '0 auto' : 0
                          }}
                        >
                          <Text style={{ fontSize: isMobile ? '20px' : '24px', color: '#ff4d4f' }}>❌</Text>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: isMobile ? 'center' : 'flex-start' }}>
                          <Image
                            src={result.imageData}
                            alt="焦散图案"
                            width={isMobile ? 80 : 100}
                            height={isMobile ? 80 : 100}
                            style={{ borderRadius: '6px', objectFit: 'cover' }}
                            preview={{
                              mask: <EyeOutlined style={{ fontSize: '16px' }} />
                            }}
                          />
                        </div>
                      )}
                    </Col>
                    <Col span={isMobile ? 24 : 12}>
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <div>
                          <Text strong style={{ fontSize: isMobile ? '13px' : '14px' }}>
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
                        <Text type="secondary" style={{ fontSize: isMobile ? '11px' : '12px' }}>
                          {formatTime(result.timestamp)}
                        </Text>
                        <div style={{ fontSize: isMobile ? '11px' : '12px' }}>
                          <Text type="secondary">参数: </Text>
                          <Text>100×100mm, </Text>
                          <Text>焦距{result.parameters.focalLength}mm</Text>
                        </div>
                        {result.status === 'success' && (
                          <Text type="secondary" style={{ fontSize: isMobile ? '11px' : '12px' }}>
                            渲染耗时: {formatRenderTime(result.renderTime)}
                          </Text>
                        )}
                        {result.status === 'error' && result.errorMessage && (
                          <Text type="danger" style={{ fontSize: isMobile ? '11px' : '12px' }}>
                            错误: {result.errorMessage}
                          </Text>
                        )}
                      </Space>
                    </Col>
                    <Col span={isMobile ? 24 : 6} style={{ marginTop: isMobile ? 8 : 0 }}>
                      <Space 
                        direction={isMobile ? 'horizontal' : 'vertical'} 
                        size="small"
                        style={{ width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'center' : 'flex-start' }}
                      >
                        {result.status === 'success' && (
                          <Tooltip title="下载图像">
                            <Button
                              icon={<DownloadOutlined />}
                              size={isMobile ? 'middle' : 'small'}
                              onClick={() => downloadImage(result)}
                              block={isMobile}
                            >
                              下载
                            </Button>
                          </Tooltip>
                        )}
                        <Tooltip title="删除结果">
                          <Button
                            icon={<DeleteOutlined />}
                            size={isMobile ? 'middle' : 'small'}
                            danger
                            onClick={() => handleDeleteResult(result.id)}
                            block={isMobile}
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
      
      <style>{`
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