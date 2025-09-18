import React, { useState } from 'react';
import { Layout, Typography, Space, Card, Row, Col, Tabs, Button } from 'antd';
import { SettingOutlined, UploadOutlined, EyeOutlined, FileTextOutlined, DownloadOutlined, BugOutlined } from '@ant-design/icons';
import { LensViewer } from './components/viewer/LensViewer';
import { CausticsRenderArea } from './components/viewer/CausticsRenderArea';
import { ImageUpload } from './components/upload/ImageUpload';
import { ParameterPanel } from './components/controls/ParameterPanel';
import { ExportPanel } from './components/export/ExportPanel';
import { ReportDialog } from './components/report/ReportDialog';
import { DiagnosticPage } from './pages/DiagnosticPage';
import { useProjectStore } from './stores/projectStore';
import './styles/custom.css';

const { Header, Content, Sider } = Layout;
const { Title } = Typography;

function App() {
  const { currentImage, geometry, isProcessing } = useProjectStore();
  const [reportDialogVisible, setReportDialogVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState<'main' | 'diagnostic'>('main');

  if (currentPage === 'diagnostic') {
    return <DiagnosticPage onBack={() => setCurrentPage('main')} />;
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        padding: '0 24px',
        borderBottom: 'none',
        display: 'flex',
        alignItems: 'center',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
      }}>
        <Title level={3} style={{ margin: 0, color: '#fff', fontWeight: 600 }}>
          🔍 Caustic Lens Designer
        </Title>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Button 
            type="text" 
            icon={<BugOutlined />} 
            onClick={() => setCurrentPage('diagnostic')}
            style={{ 
              color: '#fff', 
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '6px',
              fontWeight: 500
            }}
          >
            诊断工具
          </Button>
          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', fontWeight: 500 }}>
            焦散透镜设计工具
          </div>
        </div>
      </Header>
      
      <Layout>
        <Sider 
          width={360} 
          style={{ 
            background: '#fafafa',
            borderRight: '1px solid #e8e8e8',
            overflow: 'auto',
            height: '130vh',
            boxShadow: '2px 0 8px rgba(0,0,0,0.06)'
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
          padding: '20px', 
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          minHeight: 'calc(100vh - 64px)'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: 20,
            padding: '16px 20px',
            background: 'rgba(255,255,255,0.9)',
            borderRadius: '12px',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
          }}>
            <Space size="large">
              <Typography.Text strong style={{ color: '#666', fontSize: '16px' }}>系统状态:</Typography.Text>
              {currentImage && <Typography.Text type="success" style={{ fontSize: '14px', fontWeight: 500 }}>✅ 图像已加载</Typography.Text>}
               {geometry && <Typography.Text type="success" style={{ fontSize: '14px', fontWeight: 500 }}>✅ 模型已生成</Typography.Text>}
               {isProcessing && <Typography.Text style={{ fontSize: '14px', fontWeight: 500, color: '#1890ff' }}>⚙️ 正在处理...</Typography.Text>}
            </Space>
            
            <Button
              type="primary"
              icon={<FileTextOutlined />}
              onClick={() => setReportDialogVisible(true)}
              disabled={!geometry}
              size="large"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '8px',
                height: '40px',
                fontWeight: 500,
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
              }}
            >
              生成报告
            </Button>
          </div>
          
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            {/* 3D 透镜预览区域 */}
            <Card 
              title={
                <span style={{ fontSize: '16px', fontWeight: 600, color: '#333' }}>
                  <EyeOutlined style={{ marginRight: '8px', color: '#667eea' }} />
                  3D 透镜预览
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
                  padding: 0,
                  background: '#000'
                }
              }}
              extra={
                geometry && (
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
      
      <ReportDialog
        visible={reportDialogVisible}
        onCancel={() => setReportDialogVisible(false)}
      />
    </Layout>
  );
}

export default App;
