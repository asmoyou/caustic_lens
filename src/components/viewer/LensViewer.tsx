import { Component, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Box3, Vector3 } from 'three';
import { Alert, Button, Checkbox, InputNumber, Popover, Segmented, Slider, Spin, Tooltip } from 'antd';
import { BorderOutlined, BulbOutlined, HomeOutlined, PauseOutlined, PlayCircleOutlined, ReloadOutlined, SettingOutlined, StopOutlined } from '@ant-design/icons';
import { useProjectStore } from '../../stores/projectStore';
import type { LensGeometry } from '../../types';
import { toBufferGeometry } from '../../utils/geometry';
import type { ProjectionMessage } from '../../workers/projection.worker';

class ViewerBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <div className="viewer-empty"><Alert type="error" showIcon message="3D 视图无法启动" />
      <Button icon={<ReloadOutlined />} onClick={() => this.setState({ failed: false })}>重试</Button></div> : this.props.children;
  }
}

function Model({ geometry, wireframe }: { geometry: LensGeometry; wireframe: boolean }) {
  const buffer = useMemo(() => toBufferGeometry(geometry), [geometry]);
  useEffect(() => () => buffer.dispose(), [buffer]);
  return <mesh geometry={buffer}>
    <meshPhysicalMaterial color="#73ae98" metalness={0.16} roughness={0.32} clearcoat={0.8}
      wireframe={wireframe} side={2} />
  </mesh>;
}

function CameraRig({ geometry, resetKey, autoRotate }: { geometry: LensGeometry; resetKey: number; autoRotate: boolean }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera, size } = useThree();
  const bounds = useMemo(() => new Box3().setFromPoints(geometry.vertices.map(v => new Vector3(v.x, v.y, v.z))), [geometry]);
  useEffect(() => {
    const center = bounds.getCenter(new Vector3());
    const radius = bounds.getSize(new Vector3()).length() / 2;
    const distance = radius * 2.8 * Math.max(1, size.height / size.width);
    camera.position.copy(center).add(new Vector3(0.65, 0.35, 1).normalize().multiplyScalar(distance));
    camera.near = 0.1;
    camera.far = distance * 20;
    camera.updateProjectionMatrix();
    controls.current?.target.copy(center);
    controls.current?.update();
  }, [camera, bounds, resetKey, size.width, size.height]);
  return <OrbitControls ref={controls} makeDefault autoRotate={autoRotate} autoRotateSpeed={1.2}
    minDistance={30} maxDistance={2000} enableDamping />;
}

export function LensViewer() {
  const { geometry, currentImage, isProcessing, parameters, setParameters, revision,
    addCausticsRenderResult, updateCausticsRenderResult, deleteCausticsRenderResult } = useProjectStore();
  const [wireframe, setWireframe] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [renderProgress, setRenderProgress] = useState<number | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const resultId = useRef<string | null>(null);
  useEffect(() => {
    setRenderProgress(null);
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
      if (resultId.current) useProjectStore.getState().deleteCausticsRenderResult(resultId.current);
      resultId.current = null;
    };
  }, [revision, geometry]);

  const cancelRender = () => {
    workerRef.current?.terminate();
    workerRef.current = null;
    if (resultId.current) deleteCausticsRenderResult(resultId.current);
    resultId.current = null;
    setRenderProgress(null);
  };
  const renderProjection = () => {
    if (!geometry || workerRef.current) return;
    const id = crypto.randomUUID();
    resultId.current = id;
    const started = performance.now();
    setRenderProgress(0);
    addCausticsRenderResult({ id, timestamp: Date.now(), imageData: '', status: 'processing', renderTime: 0,
      parameters: { focalLength: parameters.focalLengthMeters * 1000, targetDistance: parameters.targetDistance, material: parameters.material } });
    const fail = (errorMessage: string) => {
      updateCausticsRenderResult(id, { status: 'error', errorMessage });
      workerRef.current?.terminate();
      workerRef.current = null;
      resultId.current = null;
      setRenderProgress(null);
    };
    try {
      const worker = new Worker(new URL('../../workers/projection.worker.ts', import.meta.url), { type: 'module' });
      workerRef.current = worker;
      worker.onerror = () => fail('投影计算线程异常');
      worker.onmessage = (event: MessageEvent<ProjectionMessage>) => {
        if (workerRef.current !== worker) return;
        if (event.data.type === 'error') return fail(event.data.error);
        if (event.data.type === 'progress') return setRenderProgress(event.data.progress);
        try {
          const { result } = event.data;
          const canvas = document.createElement('canvas');
          canvas.width = canvas.height = result.resolution;
          const ctx = canvas.getContext('2d')!;
          const pixels = ctx.createImageData(result.resolution, result.resolution);
          pixels.data.set(result.pixels);
          ctx.putImageData(pixels, 0, 0);
          updateCausticsRenderResult(id, { status: 'success', imageData: canvas.toDataURL('image/png'),
            renderTime: performance.now() - started, statistics: {
              tracedRays: result.tracedRays, receivedRays: result.receivedRays,
              totalInternalReflections: result.totalInternalReflections, screenWidth: result.screenWidth,
            } });
          worker.terminate();
          workerRef.current = null;
          resultId.current = null;
          setRenderProgress(null);
        } catch { fail('投影图像生成失败'); }
      };
      worker.postMessage({ geometry, options: { refractiveIndex: parameters.refractiveIndex,
        distance: parameters.targetDistance, intensity: parameters.lightSource.intensity } });
    } catch { fail('无法启动投影计算线程'); }
  };
  const settings = <div className="view-settings">
    <Checkbox checked={showGrid} onChange={e => setShowGrid(e.target.checked)}>显示网格</Checkbox>
    <label htmlFor="projection-distance">投影距离 (mm)</label>
    <InputNumber id="projection-distance" aria-label="投影距离 (mm)" min={50} max={5000} step={50}
      value={parameters.targetDistance} disabled={renderProgress !== null || isProcessing}
      onChange={targetDistance => { if (targetDistance !== null) setParameters({ targetDistance }); }} />
    <label>光照强度</label><Slider min={0} max={2} step={0.1} value={parameters.lightSource.intensity}
      disabled={renderProgress !== null || isProcessing} onChange={intensity => setParameters({ lightSource: { ...parameters.lightSource, intensity } })} />
  </div>;

  return <div className="lens-viewer">
    <div className="viewer-toolbar">
      <Segmented size="small" value={wireframe ? 'wire' : 'surface'} disabled={!geometry}
        onChange={value => setWireframe(value === 'wire')}
        options={[{ value: 'surface', label: '表面', icon: <BulbOutlined /> }, { value: 'wire', label: '线框', icon: <BorderOutlined /> }]} />
      <div className="viewer-actions">
        <Tooltip title="重置视角"><Button type="text" aria-label="重置视角" icon={<HomeOutlined />} disabled={!geometry}
          onClick={() => { setAutoRotate(false); setResetKey(value => value + 1); }} /></Tooltip>
        <Tooltip title={autoRotate ? '暂停旋转' : '自动旋转'}><Button type={autoRotate ? 'primary' : 'text'} aria-label="自动旋转"
          aria-pressed={autoRotate} icon={autoRotate ? <PauseOutlined /> : <PlayCircleOutlined />} disabled={!geometry}
          onClick={() => setAutoRotate(value => !value)} /></Tooltip>
        <Popover content={settings} title="视图与投影" trigger="click" placement="bottomRight">
          <Button type="text" aria-label="视图设置" icon={<SettingOutlined />} /></Popover>
        <Button className="render-button" type="primary" aria-label="渲染投影" icon={<BulbOutlined />}
          disabled={!geometry || isProcessing} loading={renderProgress !== null} onClick={renderProjection}>
          {renderProgress === null ? '渲染投影' : `${renderProgress}%`}</Button>
        {renderProgress !== null && <Tooltip title="取消渲染"><Button aria-label="取消渲染" icon={<StopOutlined />} onClick={cancelRender} /></Tooltip>}
      </div>
    </div>
    <div className="viewport" data-testid="viewport">
      {geometry ? <ViewerBoundary key={revision}><Canvas dpr={[1, 2]} camera={{ fov: 40 }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}>
        <color attach="background" args={['#e9efec']} />
        <ambientLight intensity={1.4} />
        <directionalLight position={[80, 120, 180]} intensity={3} />
        <directionalLight position={[-100, -60, 30]} intensity={1.2} color="#e1f4e9" />
        <Model geometry={geometry} wireframe={wireframe} />
        {showGrid && <gridHelper args={[220, 22, '#b4c6bc', '#d3dfd8']} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -12]} />}
        <CameraRig geometry={geometry} resetKey={resetKey} autoRotate={autoRotate} />
      </Canvas></ViewerBoundary> : <div className="viewer-empty">
        {isProcessing ? <Spin size="large" /> : <img src={currentImage?.url ?? `${import.meta.env.BASE_URL}sample-target.png`} alt="目标图案" />}
        <h2>{isProcessing ? '正在生成透镜' : currentImage ? '等待计算' : '等待目标图像'}</h2>
        <span>{isProcessing ? '计算进行中' : currentImage?.name ?? 'CAUSTIC LENS'}</span>
      </div>}
      <span className="viewport-label">{geometry ? 'PERSPECTIVE / mm' : '3D VIEW'}</span>
    </div>
  </div>;
}
