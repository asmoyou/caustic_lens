import React from 'react';
import { Layout, Typography, Button, Space, Card, Row, Col } from 'antd';
import { ArrowLeftOutlined, BugOutlined } from '@ant-design/icons';
import { CausticTestPanel } from '../components/test/CausticTestPanel';
import { SimplifiedTestPanel } from '../components/test/SimplifiedTestPanel';

const { Header, Content } = Layout;
const { Title } = Typography;

interface DiagnosticPageProps {
  onBack: () => void;
}

export const DiagnosticPage: React.FC<DiagnosticPageProps> = ({ onBack }) => {
  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Header style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        padding: '0 24px',
        borderBottom: 'none',
        display: 'flex',
        alignItems: 'center',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
      }}>
        <Button 
          type="text" 
          icon={<ArrowLeftOutlined />} 
          onClick={onBack}
          style={{ 
            color: '#fff', 
            marginRight: '16px',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '6px'
          }}
        >
          返回主页
        </Button>
        <Title level={3} style={{ margin: 0, color: '#fff', fontWeight: 600 }}>
          <BugOutlined style={{ marginRight: '8px' }} />
          焦散渲染诊断工具
        </Title>
        <div style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.8)', fontSize: '14px', fontWeight: 500 }}>
          系统诊断与调试
        </div>
      </Header>
      
      <Content style={{ 
        padding: '24px',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        minHeight: 'calc(100vh - 64px)'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            {/* 页面说明 */}
            <Card 
              style={{ 
                borderRadius: '12px',
                border: 'none',
                background: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
              }}
            >
              <Row gutter={[24, 16]}>
                <Col span={24}>
                  <Typography.Title level={4} style={{ margin: 0, color: '#333' }}>
                    🔍 诊断工具说明
                  </Typography.Title>
                  <Typography.Paragraph style={{ margin: '8px 0 0 0', color: '#666' }}>
                    本工具用于诊断焦散渲染全黑问题，提供简化测试和完整诊断两种模式。
                    建议先运行简化测试快速定位问题范围，再根据需要进行完整诊断。
                  </Typography.Paragraph>
                </Col>
              </Row>
            </Card>

            {/* 诊断工具区域 */}
            <Row gutter={[24, 24]}>
              {/* 简化测试 */}
              <Col xs={24} lg={12}>
                <Card 
                  title={
                    <span style={{ fontSize: '16px', fontWeight: 600, color: '#333' }}>
                      🚀 简化测试
                    </span>
                  }
                  style={{ 
                    height: '600px',
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
                      background: 'linear-gradient(135deg, rgba(82, 196, 26, 0.05) 0%, rgba(135, 208, 104, 0.05) 100%)'
                    },
                    body: { 
                      height: 'calc(100% - 57px)',
                      overflow: 'auto'
                    }
                  }}
                >
                  <SimplifiedTestPanel />
                </Card>
              </Col>

              {/* 完整诊断 */}
              <Col xs={24} lg={12}>
                <Card 
                  title={
                    <span style={{ fontSize: '16px', fontWeight: 600, color: '#333' }}>
                      🔬 完整诊断
                    </span>
                  }
                  style={{ 
                    height: '600px',
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
                    },
                    body: { 
                      height: 'calc(100% - 57px)',
                      overflow: 'auto'
                    }
                  }}
                >
                  <CausticTestPanel />
                </Card>
              </Col>
            </Row>
          </Space>
        </div>
      </Content>
    </Layout>
  );
};