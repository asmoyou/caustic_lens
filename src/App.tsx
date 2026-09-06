import { useState } from 'react';
import { Button, ConfigProvider, Drawer, Grid, Popconfirm, Tabs, Tag, Tooltip } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { DownloadOutlined, FileAddOutlined, FileTextOutlined, MenuOutlined, SettingOutlined, UploadOutlined } from '@ant-design/icons';
import { LensViewer } from './components/viewer/LensViewer';
import { CausticsRenderArea } from './components/viewer/CausticsRenderArea';
import { ImageUpload } from './components/upload/ImageUpload';
import { ParameterPanel } from './components/controls/ParameterPanel';
import { ExportPanel } from './components/export/ExportPanel';
import { ReportDialog } from './components/report/ReportDialog';
import { useProjectStore } from './stores/projectStore';
import './styles/custom.css';

function App() {
  const { currentImage, geometry, isProcessing, reset, parameters } = useProjectStore();
  const [reportOpen, setReportOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('upload');
  const desktop = Grid.useBreakpoint().lg;
  const panel = <Tabs className="control-tabs" activeKey={activeTab} onChange={setActiveTab}
    items={[
      { key: 'upload', label: '图像', icon: <UploadOutlined />, children: <ImageUpload /> },
      { key: 'parameters', label: '参数', icon: <SettingOutlined />, children: <ParameterPanel /> },
      { key: 'export', label: '导出', icon: <DownloadOutlined />, children: <ExportPanel /> },
    ]} />;
  const openPanel = (tab: string) => { setActiveTab(tab); setDrawerOpen(true); };

  return <ConfigProvider locale={zhCN} theme={{ token: {
    colorPrimary: '#16796d', colorInfo: '#16796d', colorSuccess: '#38844b',
    colorText: '#242c2b', colorTextSecondary: '#6b7473', colorBorder: '#dce2df',
    borderRadius: 6, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif',
  } }}>
    <div className="app-shell">
      <header className="app-header">
        <div className="brand"><img src={`${import.meta.env.BASE_URL}lens-icon.svg`} alt="" />
          <div><strong>Caustic Lens</strong><span>焦散透镜设计</span></div></div>
        <div className="header-actions">
          <Tooltip title="新建项目"><Popconfirm title="新建项目？" description="当前图像、模型和计算结果将被清除。"
            onConfirm={() => { reset(); setActiveTab('upload'); }} disabled={!currentImage}>
            <Button aria-label="新建项目" icon={<FileAddOutlined />} disabled={!currentImage || isProcessing} />
          </Popconfirm></Tooltip>
          <Button icon={<FileTextOutlined />} disabled={!geometry || isProcessing} onClick={() => setReportOpen(true)}>设计报告</Button>
        </div>
      </header>
      <div className="workspace-layout">
        {desktop && <aside className="control-sidebar" aria-label="项目控制">{panel}</aside>}
        <main className="workspace-main">
          <div className="workspace-heading"><div><span className="eyebrow">DESIGN WORKSPACE</span><h1>透镜工作台</h1></div>
            <Tag color={isProcessing ? 'gold' : geometry ? 'success' : 'default'}>
              {isProcessing ? '计算中' : geometry ? '模型已生成' : currentImage ? '待计算' : '未载入图像'}
            </Tag>
          </div>
          {!desktop && <nav className="mobile-tools" aria-label="项目工具">
            <Button icon={<UploadOutlined />} onClick={() => openPanel('upload')}>图像</Button>
            <Button icon={<SettingOutlined />} onClick={() => openPanel('parameters')}>参数</Button>
            <Button icon={<DownloadOutlined />} onClick={() => openPanel('export')}>导出</Button>
          </nav>}
          <section className="viewer-section" aria-label="3D 透镜预览"><LensViewer /></section>
          <div className="model-metrics">
            <div><span>设计尺寸</span><strong>100 x 100 <small>mm</small></strong></div>
            <div><span>计算网格</span><strong>{parameters.resolution} x {parameters.resolution}</strong></div>
            <div><span>顶点</span><strong>{geometry?.vertices.length.toLocaleString() ?? '-'}</strong></div>
            <div><span>面片</span><strong>{geometry?.faces.length.toLocaleString() ?? '-'}</strong></div>
          </div>
          <CausticsRenderArea />
          <footer className="workspace-footer"><span>小白客 · Caustic Lens Designer</span>
            <a href="https://www.asmo.top/" target="_blank" rel="noopener noreferrer">加工服务</a></footer>
        </main>
      </div>
      {!desktop && <Drawer title={<span><MenuOutlined /> 项目设置</span>} placement="left"
        width="min(360px, calc(100vw - 24px))" open={drawerOpen} onClose={() => setDrawerOpen(false)}
        className="controls-drawer" forceRender>{panel}</Drawer>}
      {reportOpen && <ReportDialog visible onCancel={() => setReportOpen(false)} />}
    </div>
  </ConfigProvider>;
}

export default App;
