import React, { useState, useEffect } from 'react';
import { Layout, Typography, Space, Card, Row, Col, Tabs, Button } from 'antd';
import { SettingOutlined, UploadOutlined, EyeOutlined, FileTextOutlined, DownloadOutlined, ShopOutlined, MenuOutlined } from '@ant-design/icons';
import { LensViewer } from './components/viewer/LensViewer';
import { CausticsRenderArea } from './components/viewer/CausticsRenderArea';
import { ImageUpload } from './components/upload/ImageUpload';
import { ParameterPanel } from './components/controls/ParameterPanel';
import { ExportPanel } from './components/export/ExportPanel';
import { ReportDialog } from './components/report/ReportDialog';
import { useProjectStore } from './stores/projectStore';
import './styles/custom.css';

const { Header, Content, Sider, Footer } = Layout;
const { Title } = Typography;

function App() {
  const { currentImage, geometry, isProcessing } = useProjectStore();
  const [reportDialogVisible, setReportDialogVisible] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // 检测移动端
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      // 在移动端默认折叠侧边栏
      if (window.innerWidth < 768) {
        setCollapsed(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        padding: isMobile ? '0 12px' : '0 24px',
        borderBottom: 'none',
        display: 'flex',
        alignItems: 'center',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        position: 'sticky',
        top: 0,
        zIndex: 1000
      }}>
        {isMobile && (
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              color: '#fff',
              fontSize: '18px',
              marginRight: '12px',
              padding: '4px 8px'
            }}
          />
        )}
        <Title 
          level={isMobile ? 4 : 3} 
          style={{ 
            margin: 0, 
            color: '#fff', 
            fontWeight: 600,
            fontSize: isMobile ? '16px' : undefined,
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {isMobile ? '🔍 透镜设计' : '🔍 Caustic Lens Designer'}
        </Title>
        {!isMobile && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', fontWeight: 500 }}>
              焦散透镜设计工具
            </div>
          </div>
        )}
      </Header>
      
      <Layout>
        <Sider 
          width={isMobile ? '100%' : 360}
          collapsed={collapsed}
          collapsedWidth={isMobile ? 0 : 80}
          collapsible={isMobile}
          trigger={null}
          breakpoint="lg"
          onBreakpoint={(broken) => {
            setIsMobile(broken);
            setCollapsed(broken);
          }}
          style={{ 
            background: '#fafafa',
            borderRight: '1px solid #e8e8e8',
            overflow: 'auto',
            height: isMobile ? 'calc(100vh - 64px)' : '130vh',
            boxShadow: '2px 0 8px rgba(0,0,0,0.06)',
            position: isMobile ? 'fixed' : 'relative',
            left: isMobile && collapsed ? '-100%' : 0,
            top: isMobile ? 64 : 0,
            zIndex: isMobile ? 999 : 1,
            transition: 'all 0.3s ease'
          }}
        >
          <div style={{ padding: '16px' }}>
            <Tabs 
              defaultActiveKey="upload" 
              size="small"
              items={[
                {
                  key: 'upload',
                  label: (
                    <span>
                      <UploadOutlined />
                      图像上传
                    </span>
                  ),
                  children: (
                    <Space direction="vertical" style={{ width: '100%' }} size="middle">
                      <ImageUpload />
                      
                      {isProcessing && (
                        <Card size="small" style={{ borderColor: '#1890ff', backgroundColor: '#f6ffed' }}>
                          <Typography.Text>
                            ⚙️ 正在处理图像...
                          </Typography.Text>
                        </Card>
                      )}
                      
                      {currentImage && !isProcessing && (
                        <Card size="small" style={{ borderColor: '#52c41a', backgroundColor: '#f6ffed' }}>
                          <Typography.Text type="success">
                            ✅ 图像处理完成
                          </Typography.Text>
                        </Card>
                      )}
                    </Space>
                  )
                },
                {
                  key: 'parameters',
                  label: (
                    <span>
                      <SettingOutlined />
                      参数设置
                    </span>
                  ),
                  children: <ParameterPanel />
                },
                {
                  key: 'export',
                  label: (
                    <span>
                      <DownloadOutlined />
                      文件导出
                    </span>
                  ),
                  children: <ExportPanel />
                }
              ]}
            />
          </div>
        </Sider>
        
        <Content style={{ 
          padding: isMobile ? '12px' : '20px', 
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          minHeight: 'calc(100vh - 64px)',
          marginLeft: isMobile && !collapsed ? 0 : 0
        }}>
          <div style={{ 
            display: 'flex', 
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between', 
            alignItems: isMobile ? 'stretch' : 'center', 
            marginBottom: isMobile ? 12 : 20,
            padding: isMobile ? '12px' : '16px 20px',
            background: 'rgba(255,255,255,0.9)',
            borderRadius: '12px',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            gap: isMobile ? '12px' : 0
          }}>
            <Space 
              size={isMobile ? 'small' : 'large'} 
              wrap={isMobile}
              style={{ width: isMobile ? '100%' : 'auto' }}
            >
              <Typography.Text strong style={{ color: '#666', fontSize: isMobile ? '14px' : '16px' }}>
                {isMobile ? '状态:' : '系统状态:'}
              </Typography.Text>
              {currentImage && (
                <Typography.Text type="success" style={{ fontSize: isMobile ? '12px' : '14px', fontWeight: 500 }}>
                  ✅ {isMobile ? '图像' : '图像已加载'}
                </Typography.Text>
              )}
              {geometry && (
                <Typography.Text type="success" style={{ fontSize: isMobile ? '12px' : '14px', fontWeight: 500 }}>
                  ✅ {isMobile ? '模型' : '模型已生成'}
                </Typography.Text>
              )}
              {isProcessing && (
                <Typography.Text style={{ fontSize: isMobile ? '12px' : '14px', fontWeight: 500, color: '#1890ff' }}>
                  ⚙️ {isMobile ? '处理中' : '正在处理...'}
                </Typography.Text>
              )}
            </Space>
            
            <Space 
              size="middle" 
              direction={isMobile ? 'vertical' : 'horizontal'}
              style={{ width: isMobile ? '100%' : 'auto' }}
            >
              {geometry && (
                <Button
                  type="default"
                  icon={<ShopOutlined />}
                  onClick={() => window.open('https://www.asmo.top/', '_blank')}
                  size={isMobile ? 'middle' : 'large'}
                  block={isMobile}
                  style={{
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    height: isMobile ? '36px' : '40px',
                    fontWeight: 500,
                    color: '#fff',
                    boxShadow: '0 4px 15px rgba(245, 87, 108, 0.4)'
                  }}
                >
                  {isMobile ? '代理加工' : '需要代理加工？'}
                </Button>
              )}
              <Button
                type="primary"
                icon={<FileTextOutlined />}
                onClick={() => setReportDialogVisible(true)}
                disabled={!geometry}
                size={isMobile ? 'middle' : 'large'}
                block={isMobile}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  height: isMobile ? '36px' : '40px',
                  fontWeight: 500,
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
                }}
              >
                生成报告
              </Button>
            </Space>
          </div>
          
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            {/* 移动端提示：提醒用户展开侧栏上传图片 */}
            {isMobile && collapsed && !currentImage && (
              <Card
                style={{
                  background: 'linear-gradient(135deg, #fff3cd 0%, #ffe69c 100%)',
                  border: '2px solid #ffc107',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(255, 193, 7, 0.3)'
                }}
              >
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <Typography.Text strong style={{ color: '#856404', fontSize: '14px', display: 'block' }}>
                    💡 提示
                  </Typography.Text>
                  <div style={{ color: '#856404', fontSize: '13px', display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span>请点击左上角</span>
                    <MenuOutlined style={{ margin: '0 4px', fontSize: '16px' }} />
                    <span>菜单按钮，展开侧栏上传图片开始使用</span>
                  </div>
                </Space>
              </Card>
            )}
            
            {/* 3D 透镜预览区域 */}
            <Card 
              title={
                <span style={{ fontSize: isMobile ? '14px' : '16px', fontWeight: 600, color: '#333' }}>
                  <EyeOutlined style={{ marginRight: '8px', color: '#667eea' }} />
                  3D 透镜预览
                </span>
              }
              style={{ 
                height: isMobile ? '400px' : '600px',
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
                },
                body: { 
                  height: isMobile ? 'calc(100% - 49px)' : 'calc(100% - 57px)', 
                  padding: 0,
                  background: currentImage ? '#000' : '#f5f5f5'
                }
              }}
              extra={
                geometry && !isMobile && (
                  <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                    顶点: {geometry.vertices.length} | 面片: {geometry.faces.length}
                  </Typography.Text>
                )
              }
            >
              <LensViewer 
                geometry={geometry}
                image={currentImage}
              />
            </Card>
            
            {/* 焦散图案渲染区域 */}
            <CausticsRenderArea />
          </Space>
        </Content>
      </Layout>
      
      <Footer style={{ 
        textAlign: 'center', 
        background: '#fafafa',
        borderTop: '1px solid #e8e8e8',
        padding: isMobile ? '12px 16px' : '16px 24px'
      }}>
        <div style={{ 
          color: '#666', 
          fontSize: isMobile ? '12px' : '14px',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: isMobile ? '4px' : '8px'
        }}>
          <span>© 2025 小白客 - 焦散透镜应用</span>
          {isMobile ? (
            <span>
              <a 
                href="https://www.asmo.top/" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ 
                  color: '#667eea', 
                  textDecoration: 'none',
                  fontWeight: 500
                }}
              >
                杂货铺
              </a>
            </span>
          ) : (
            <>
              <span>|</span>
              <a 
                href="https://www.asmo.top/" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ 
                  color: '#667eea', 
                  textDecoration: 'none'
                }}
              >
                杂货铺
              </a>
            </>
          )}
        </div>
      </Footer>
      
      {/* 移动端侧边栏遮罩层 */}
      {isMobile && !collapsed && (
        <div
          style={{
            position: 'fixed',
            top: 64,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.45)',
            zIndex: 998,
            transition: 'opacity 0.3s ease'
          }}
          onClick={() => setCollapsed(true)}
        />
      )}
      
      <ReportDialog
        visible={reportDialogVisible}
        onCancel={() => setReportDialogVisible(false)}
      />
    </Layout>
  );
}

export default App;
