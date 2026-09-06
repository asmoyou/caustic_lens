import { useState } from 'react';
import { App as AntApp, Button, ConfigProvider, Drawer, Grid, Popconfirm, Tabs, Tag, Tooltip } from 'antd';
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
    colorPrimary: '#24272d', colorInfo: '#667c94', colorSuccess: '#94713e',
    colorText: '#25272c', colorTextSecondary: '#767981', colorBorder: '#dfe0e4',
    borderRadius: 6, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif',
  } }}>
    <AntApp><div className="app-shell">
      <header className="app-header">
        <div className="brand"><img src={`${import.meta.env.BASE_URL}lens-icon.svg?v=2`} alt="" />
          <div><strong>Caustic Lens<span className="brand-period">.</span></strong><span className="brand-subtitle">光学设计工作室<span className="brand-subtitle-en"> / OPTICS STUDIO</span></span></div></div>
        <div className="header-actions">
          <Tooltip title="新建项目"><Popconfirm title="新建项目？" description="当前图像、模型和计算结果将被清除。"
            onConfirm={() => { reset(); setActiveTab('upload'); }} disabled={!currentImage}>
            <Button aria-label="新建项目" icon={<FileAddOutlined />} disabled={!currentImage || isProcessing} />
          </Popconfirm></Tooltip>
          <Tooltip title="设计报告"><Button aria-label="设计报告" icon={<FileTextOutlined />} disabled={!geometry || isProcessing}
            onClick={() => setReportOpen(true)}><span className="action-label">设计报告</span></Button></Tooltip>
          <Tooltip title="导出模型"><Button aria-label="导出模型" type="primary" icon={<DownloadOutlined />} disabled={!geometry || isProcessing}
            onClick={() => openPanel('export')}><span className="action-label">导出模型</span></Button></Tooltip>
        </div>
      </header>
      <div className="workspace-layout">
        {desktop && <aside className="control-sidebar" aria-label="项目控制">
          <div className="sidebar-caption"><span>项目设置</span><span>PROJECT</span></div>{panel}</aside>}
        <main className="workspace-main">
          <div className="workspace-heading"><div><span className="eyebrow">LIGHT / FORM / IMAGE</span><h1>焦散透镜工作台</h1></div>
            <div className="workspace-state"><span className="optical-summary">n {parameters.refractiveIndex.toFixed(2)}<i />f {parameters.focalLengthMeters.toFixed(1)} m</span>
            <Tag color={isProcessing ? 'gold' : geometry ? 'success' : 'default'}>
              {isProcessing ? '计算中' : geometry ? '模型已生成' : currentImage ? '待计算' : '未载入图像'}
            </Tag></div>
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
            <nav className="friend-links" aria-label="友情链接">
              <span>友情链接</span>
              <a href="https://www.asmo.top/" target="_blank" rel="noopener noreferrer">加工服务</a>
              <a href="https://games.asmo.top/" target="_blank" rel="noopener noreferrer">Toy2Game 在线玩具箱</a>
            </nav></footer>
        </main>
      </div>
      {!desktop && <Drawer title={<span><MenuOutlined /> 项目设置</span>} placement="left"
        width="min(360px, calc(100vw - 24px))" open={drawerOpen} onClose={() => setDrawerOpen(false)}
        className="controls-drawer" forceRender>{panel}</Drawer>}
      {reportOpen && <ReportDialog visible onCancel={() => setReportOpen(false)} />}
    </div></AntApp>
  </ConfigProvider>;
}

export default App;
