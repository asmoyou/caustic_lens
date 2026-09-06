import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Form, InputNumber, Select } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { useProjectStore } from '../../stores/projectStore';
import { downloadExport } from '../../utils/exportUtils';
import type { ExportFormat, ExportUnits } from '../../utils/exportUtils';

export function ExportPanel() {
  const { geometry, currentImage, parameters, isProcessing, revision } = useProjectStore();
  const [format, setFormat] = useState<ExportFormat>('stl');
  const [units, setUnits] = useState<ExportUnits>('mm');
  const [scale, setScale] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const worker = useRef<Worker | null>(null);
  useEffect(() => {
    setExporting(false);
    setError(null);
    return () => { worker.current?.terminate(); worker.current = null; };
  }, [geometry, revision]);
  const handleExport = () => {
    if (!geometry || worker.current) return;
    setExporting(true);
    setError(null);
    const cleanup = () => { worker.current?.terminate(); worker.current = null; setExporting(false); };
    try {
      worker.current = new Worker(new URL('../../workers/export.worker.ts', import.meta.url), { type: 'module' });
      worker.current.onmessage = (event: MessageEvent<{ content?: string | ArrayBuffer; error?: string }>) => {
        if (event.data.error) setError(event.data.error);
        else if (event.data.content !== undefined) downloadExport(event.data.content,
          `${(currentImage?.name.replace(/\.[^.]+$/, '') ?? 'lens').replace(/[<>:"/\\|?*]/g, '_')}-${units}.${format}`);
        cleanup();
      };
      worker.current.onerror = () => { setError('导出线程异常，请重试'); cleanup(); };
      worker.current.postMessage({ geometry, options: { format, scale, units, parameters, sourceImage: currentImage?.name } });
    } catch { setError('无法启动导出线程'); cleanup(); }
  };
  return <section className="export-panel">
    <div className="panel-heading"><h2>导出模型</h2></div>
    {!geometry && <Alert type="info" message="暂无可导出的模型" showIcon />}
    <Form layout="vertical" disabled={!geometry || isProcessing || exporting}>
      <Form.Item label="文件格式"><Select aria-label="文件格式" value={format} onChange={setFormat} options={[
        { value: 'stl', label: 'STL · 3D 打印' }, { value: 'obj', label: 'OBJ · 三维网格' },
        { value: 'ply', label: 'PLY · 三维网格' }, { value: 'step', label: 'STEP · CAD 多面实体' },
        { value: 'json', label: 'JSON · 几何与参数' },
        { value: 'gcode', label: 'G-Code · 尚未接入切片器', disabled: true },
      ]} /></Form.Item>
      <Form.Item label="坐标单位"><Select aria-label="坐标单位" value={units} onChange={setUnits} options={[
        { value: 'mm', label: '毫米 (mm)' }, { value: 'cm', label: '厘米 (cm)' }, { value: 'inch', label: '英寸 (inch)' },
      ]} /></Form.Item>
      <Form.Item label="缩放比例"><InputNumber aria-label="缩放比例" value={scale} min={0.01} max={100} step={0.1}
        addonAfter="x" style={{ width: '100%' }} onChange={value => { if (value !== null) setScale(value); }} /></Form.Item>
      {format === 'stl' && units !== 'mm' && <Alert className="export-note" type="warning" showIcon message="STL 不记录单位，导入软件需选择相同单位。" />}
      {error && <Alert className="export-note" type="error" showIcon message={error} />}
      <Button type="primary" block icon={<DownloadOutlined />} loading={exporting} onClick={handleExport}>导出 {format.toUpperCase()}</Button>
    </Form>
  </section>;
}
