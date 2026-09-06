import { Component, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { Alert, Button, Checkbox, ConfigProvider, Drawer, Grid, InputNumber, Popover, Segmented, Slider, Spin, Switch, Tooltip } from 'antd';
import { BorderOutlined, BulbOutlined, DownloadOutlined, EyeOutlined, HomeOutlined, NodeIndexOutlined,
  InfoCircleOutlined, PauseOutlined, PlayCircleOutlined, ReloadOutlined, SettingOutlined, StopOutlined } from '@ant-design/icons';
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
  const [actualScale, setActualScale] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const desktop = Grid.useBreakpoint().lg;
  const pointSource = parameters.lightSource.type === 'point';
  const entranceZ = useMemo(() => geometry ? geometry.vertices.reduce((min, v) => Math.min(min, v.z), Infinity) : -10, [geometry]);
  const sourceDistance = entranceZ - parameters.lightSource.position.z;
  const setSourcePosition = (position: Partial<typeof parameters.lightSource.position>) => setParameters({
    lightSource: { ...parameters.lightSource, position: { ...parameters.lightSource.position, ...position } },
  });
  const settings = <div className="view-settings">
    <Checkbox checked={showGrid} onChange={e => setShowGrid(e.target.checked)}>显示网格</Checkbox>
    <Checkbox checked={showRays} onChange={e => setShowRays(e.target.checked)}>显示光路</Checkbox>
    <Checkbox checked={wireframe} onChange={e => setWireframe(e.target.checked)}>线框模式</Checkbox>
    <Checkbox checked={actualScale} onChange={e => setActualScale(e.target.checked)}>实际距离比例</Checkbox>
    {pointSource && <>
      <label>光源偏移 (mm)</label><div className="source-offsets">
        <InputNumber aria-label="光源 X (mm)" addonBefore="X" min={-500} max={500} step={5}
          disabled={isProcessing} value={parameters.lightSource.position.x} onChange={x => { if (x !== null) setSourcePosition({ x }); }} />
        <InputNumber aria-label="光源 Y (mm)" addonBefore="Y" min={-500} max={500} step={5}
          disabled={isProcessing} value={parameters.lightSource.position.y} onChange={y => { if (y !== null) setSourcePosition({ y }); }} />
      </div>
      <span className="source-design-note">当前透镜按平行光设计</span>
    </>}
    <label htmlFor="projection-distance">投影距离 (mm)</label>
    <InputNumber id="projection-distance" aria-label="投影距离 (mm)" min={50} max={5000} step={50}
      value={parameters.targetDistance} disabled={isProcessing}
      onChange={targetDistance => { if (targetDistance !== null) setParameters({ targetDistance }); }} />
    <label>相对光强</label><Slider ariaLabelForHandle="光照强度" min={0} max={2} step={0.1} value={parameters.lightSource.intensity}
      disabled={isProcessing} onChange={intensity => setParameters({ lightSource: { ...parameters.lightSource, intensity } })} />
    <div className="receiver-auto-setting"><span>自动接收范围</span><Switch aria-label="自动接收范围" size="small"
      checked={parameters.receiverWidth === undefined} disabled={isProcessing}
      onChange={auto => setParameters({ receiverWidth: auto ? undefined : preview?.result.screenWidth ?? 130 })} /></div>
    <label htmlFor="receiver-width">接收屏宽度 (mm)</label>
    <InputNumber id="receiver-width" aria-label="接收屏宽度 (mm)" min={10} max={100000} step={10} precision={1}
      value={parameters.receiverWidth ?? preview?.result.screenWidth} disabled={isProcessing || parameters.receiverWidth === undefined}
      onChange={receiverWidth => { if (receiverWidth !== null) setParameters({ receiverWidth }); }} />
  </div>;

  return <div className="lens-viewer">
    <div className="viewer-toolbar">
      <div className="viewer-modes">
      <Segmented aria-label="预览模式" value={mode} onChange={value => { setMode(value as ViewerMode); setAutoRotate(false); }}
        options={[{ value: 'optical', label: '光路', icon: <NodeIndexOutlined /> },
          { value: 'model', label: '模型', icon: <BorderOutlined /> }, { value: 'projection', label: '投影', icon: <EyeOutlined /> }]} />
      <Segmented aria-label="光源类型" className="source-mode" value={parameters.lightSource.type} disabled={isProcessing}
        options={[{ value: 'parallel', label: '平行光' }, { value: 'point', label: '点光源' }]}
        onChange={type => setParameters({ lightSource: { ...parameters.lightSource, type: type as 'parallel' | 'point',
          position: parameters.lightSource.position.z < entranceZ ? parameters.lightSource.position :
            { ...parameters.lightSource.position, z: entranceZ - 150 } } })} />
      </div>
      <div className="viewer-actions">
        <Tooltip title="重置视角"><Button type="text" aria-label="重置视角" icon={<HomeOutlined />} disabled={!geometry}
          onClick={() => { setAutoRotate(false); setResetKey(value => value + 1); }} /></Tooltip>
        <Tooltip title={autoRotate ? '暂停旋转' : '自动旋转'}><Button type="text" aria-label="自动旋转"
          aria-pressed={autoRotate} icon={autoRotate ? <PauseOutlined /> : <PlayCircleOutlined />} disabled={!geometry || mode === 'projection'}
          onClick={() => setAutoRotate(value => !value)} /></Tooltip>
        <Popover content={settings} title="视图与投影" trigger="click" placement="bottom"
          open={!!desktop && settingsOpen} onOpenChange={open => { if (desktop) setSettingsOpen(open); }}>
          <Button type="text" aria-label="视图设置" icon={<SettingOutlined />}
            onClick={() => { if (!desktop) setSettingsOpen(true); }} /></Popover>
        <Tooltip title="下载当前投影"><Button type="text" aria-label="下载当前投影" icon={<DownloadOutlined />}
          disabled={!preview} href={preview?.imageData} download="caustic-preview.png" /></Tooltip>
        <Button className="render-button" aria-label="渲染投影" icon={<ReloadOutlined />}
          disabled={!geometry || isProcessing} loading={progress !== null} onClick={render}>
          {progress === null ? '重新渲染' : `${progress}%`}</Button>
        {progress !== null && <Tooltip title="取消渲染"><Button aria-label="取消渲染" icon={<StopOutlined />} onClick={cancel} /></Tooltip>}
      </div>
    </div>
    <div className="viewport" data-testid="viewport" data-mode={mode} data-light-source={parameters.lightSource.type} data-projection-ready={!!preview}>
      {geometry ? <ViewerBoundary><Canvas dpr={[1, 2]} camera={{ fov: 40 }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}>
        <OpticalScene geometry={geometry} preview={preview} mode={mode} distance={parameters.targetDistance}
          refractiveIndex={parameters.refractiveIndex} wireframe={wireframe} showGrid={showGrid}
          showRays={showRays} autoRotate={autoRotate} resetKey={resetKey} lightSource={parameters.lightSource}
          receiverWidth={parameters.receiverWidth} actualScale={actualScale} />
      </Canvas></ViewerBoundary> : <div className="viewer-empty">
        {isProcessing ? <Spin size="large" /> : <img className="empty-lens-mark" src={`${import.meta.env.BASE_URL}lens-icon.svg`} alt="Caustic Lens" />}
        <h2>{isProcessing ? '正在构建透镜表面' : currentImage ? '等待生成透镜' : '光影，从一片透镜开始'}</h2>
        <span>{currentImage?.name ?? 'CAUSTIC LENS STUDIO'}</span>
      </div>}
      {error && <Alert className="viewport-error" type="error" showIcon message={error} />}
      {geometry && <div className="viewport-meta"><span className={`preview-status ${preview ? 'ready' : ''}`}>
        <i />{progress !== null ? `投影计算 ${progress}%` : preview ? '投影已就绪' : error ? '投影失败' : '等待投影'}</span>
        <Tooltip title="当前网格的两次折射前向追迹；未模拟衍射、色散、菲涅耳损耗及多次内部反射。亮度为相对照度的显示映射。">
          <span className="simulation-method">几何光学近似 <InfoCircleOutlined /></span></Tooltip></div>}
      {preview && preview.result.receivedRays === 0 && <div className="empty-receiver-note">没有光线落入接收屏范围</div>}
      <span className="viewport-label">{mode === 'optical' ? actualScale ? '光路 · 实际距离比例' : '光路示意 · 轴向压缩' :
        mode === 'model' ? '透明透镜 / mm' : '投影正视 · 受光面'}</span>
      {geometry && mode === 'optical' && <div className="optical-legend"><span><BulbOutlined /> {pointSource ? '点光源' : '平行白光'}</span>
        <span><BorderOutlined /> 透明透镜</span><span><EyeOutlined /> 接收屏</span></div>}
    </div>
    <ConfigProvider theme={{ token: { colorPrimary: '#d5a15b' } }}>
    {pointSource && <div className="projection-distance-bar source-distance-bar">
      <span>光源距离</span><Slider ariaLabelForHandle="光源距离" min={50} max={5000} step={10} value={sourceDistance}
        disabled={isProcessing} onChange={value => setSourcePosition({ z: entranceZ - value })} />
      <InputNumber aria-label="光源距离 (mm)" min={50} max={5000} step={10} value={sourceDistance} disabled={isProcessing}
        onChange={value => { if (value !== null) setSourcePosition({ z: entranceZ - value }); }} /><span>mm</span>
    </div>}
    <div className="projection-distance-bar">
      <span>投影距离</span><Slider ariaLabelForHandle="实时投影距离" min={50} max={5000} step={50}
        value={parameters.targetDistance} disabled={isProcessing || !geometry}
        onChange={targetDistance => setParameters({ targetDistance })} />
      <InputNumber aria-label="实时投影距离 (mm)" min={50} max={5000} step={50} value={parameters.targetDistance}
        disabled={isProcessing || !geometry} onChange={targetDistance => { if (targetDistance !== null) setParameters({ targetDistance }); }} />
      <span>mm</span>
    </div></ConfigProvider>
    {!desktop && <Drawer title="视图与投影" aria-label="视图与投影" className="viewer-settings-drawer" placement="right"
      width="min(340px, calc(100vw - 24px))" open={settingsOpen} onClose={() => setSettingsOpen(false)}>
      {settings}
    </Drawer>}
  </div>;
}
