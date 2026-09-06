import { Component, useState } from 'react';
import type { ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { Alert, Button, Checkbox, ConfigProvider, InputNumber, Popover, Segmented, Slider, Spin, Tooltip } from 'antd';
import { BorderOutlined, BulbOutlined, DownloadOutlined, EyeOutlined, HomeOutlined, NodeIndexOutlined,
  PauseOutlined, PlayCircleOutlined, ReloadOutlined, SettingOutlined, StopOutlined } from '@ant-design/icons';
import { useProjectStore } from '../../stores/projectStore';
import { OpticalScene } from './OpticalScene';
import type { ViewerMode } from './OpticalScene';
import { useProjectionPreview } from './useProjectionPreview';

class ViewerBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <div className="viewer-empty"><Alert type="error" showIcon message="3D 视图无法启动" />
      <Button icon={<ReloadOutlined />} onClick={() => this.setState({ failed: false })}>重试</Button></div> : this.props.children;
  }
}

export function LensViewer() {
  const { geometry, currentImage, isProcessing, parameters, setParameters } = useProjectStore();
  const { preview, progress, error, render, cancel } = useProjectionPreview();
  const [mode, setMode] = useState<ViewerMode>('optical');
  const [wireframe, setWireframe] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showRays, setShowRays] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const settings = <div className="view-settings">
    <Checkbox checked={showGrid} onChange={e => setShowGrid(e.target.checked)}>显示网格</Checkbox>
    <Checkbox checked={showRays} onChange={e => setShowRays(e.target.checked)}>显示光路</Checkbox>
    <Checkbox checked={wireframe} onChange={e => setWireframe(e.target.checked)}>线框模式</Checkbox>
    <label htmlFor="projection-distance">投影距离 (mm)</label>
    <InputNumber id="projection-distance" aria-label="投影距离 (mm)" min={50} max={5000} step={50}
      value={parameters.targetDistance} disabled={isProcessing}
      onChange={targetDistance => { if (targetDistance !== null) setParameters({ targetDistance }); }} />
    <label>光照强度</label><Slider aria-label="光照强度" min={0} max={2} step={0.1} value={parameters.lightSource.intensity}
      disabled={isProcessing} onChange={intensity => setParameters({ lightSource: { ...parameters.lightSource, intensity } })} />
  </div>;

  return <div className="lens-viewer">
    <div className="viewer-toolbar">
      <Segmented aria-label="预览模式" value={mode} onChange={value => { setMode(value as ViewerMode); setAutoRotate(false); }}
        options={[{ value: 'optical', label: '光路', icon: <NodeIndexOutlined /> },
          { value: 'model', label: '模型', icon: <BorderOutlined /> }, { value: 'projection', label: '投影', icon: <EyeOutlined /> }]} />
      <div className="viewer-actions">
        <Tooltip title="重置视角"><Button type="text" aria-label="重置视角" icon={<HomeOutlined />} disabled={!geometry}
          onClick={() => { setAutoRotate(false); setResetKey(value => value + 1); }} /></Tooltip>
        <Tooltip title={autoRotate ? '暂停旋转' : '自动旋转'}><Button type="text" aria-label="自动旋转"
          aria-pressed={autoRotate} icon={autoRotate ? <PauseOutlined /> : <PlayCircleOutlined />} disabled={!geometry || mode === 'projection'}
          onClick={() => setAutoRotate(value => !value)} /></Tooltip>
        <Popover content={settings} title="视图与投影" trigger="click" placement="bottomRight">
          <Button type="text" aria-label="视图设置" icon={<SettingOutlined />} /></Popover>
        <Tooltip title="下载当前投影"><Button type="text" aria-label="下载当前投影" icon={<DownloadOutlined />}
          disabled={!preview} href={preview?.imageData} download="caustic-preview.png" /></Tooltip>
        <Button className="render-button" aria-label="渲染投影" icon={<ReloadOutlined />}
          disabled={!geometry || isProcessing} loading={progress !== null} onClick={render}>
          {progress === null ? '重新渲染' : `${progress}%`}</Button>
        {progress !== null && <Tooltip title="取消渲染"><Button aria-label="取消渲染" icon={<StopOutlined />} onClick={cancel} /></Tooltip>}
      </div>
    </div>
    <div className="viewport" data-testid="viewport" data-mode={mode} data-projection-ready={!!preview}>
      {geometry ? <ViewerBoundary><Canvas dpr={[1, 2]} camera={{ fov: 40 }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}>
        <OpticalScene geometry={geometry} preview={preview} mode={mode} distance={parameters.targetDistance}
          refractiveIndex={parameters.refractiveIndex} wireframe={wireframe} showGrid={showGrid}
          showRays={showRays} autoRotate={autoRotate} resetKey={resetKey} />
      </Canvas></ViewerBoundary> : <div className="viewer-empty">
        {isProcessing ? <Spin size="large" /> : <img className="empty-lens-mark" src={`${import.meta.env.BASE_URL}lens-icon.svg`} alt="Caustic Lens" />}
        <h2>{isProcessing ? '正在构建透镜表面' : currentImage ? '等待生成透镜' : '光影，从一片透镜开始'}</h2>
        <span>{currentImage?.name ?? 'CAUSTIC LENS STUDIO'}</span>
      </div>}
      {error && <Alert className="viewport-error" type="error" showIcon message={error} />}
      {geometry && <div className="viewport-meta"><span className={`preview-status ${preview ? 'ready' : ''}`}>
        <i />{progress !== null ? `投影计算 ${progress}%` : preview ? '投影已就绪' : error ? '投影失败' : '等待投影'}</span></div>}
      <span className="viewport-label">{mode === 'optical' ? '光路示意 · 轴向压缩' : mode === 'model' ? '透明透镜 / mm' : '投影正视'}</span>
      {geometry && mode === 'optical' && <div className="optical-legend"><span><BulbOutlined /> 平行白光</span>
        <span><BorderOutlined /> 透明透镜</span><span><EyeOutlined /> 接收屏</span></div>}
    </div>
    <ConfigProvider theme={{ token: { colorPrimary: '#d5a15b' } }}><div className="projection-distance-bar">
      <span>投影距离</span><Slider aria-label="实时投影距离" min={50} max={5000} step={50}
        value={parameters.targetDistance} disabled={isProcessing || !geometry}
        onChange={targetDistance => setParameters({ targetDistance })} />
      <InputNumber aria-label="实时投影距离 (mm)" min={50} max={5000} step={50} value={parameters.targetDistance}
        disabled={isProcessing || !geometry} onChange={targetDistance => { if (targetDistance !== null) setParameters({ targetDistance }); }} />
      <span>mm</span>
    </div></ConfigProvider>
  </div>;
}
