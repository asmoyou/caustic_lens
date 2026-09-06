import { Button, Collapse, Form, InputNumber, Select, Slider, Tooltip } from 'antd';
import { PlayCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { defaultParameters, useProjectStore } from '../../stores/projectStore';
import { startGeneration } from '../../utils/generationJob';

interface NumberControlProps {
  label: string; value: number; min: number; max: number; step?: number;
  onChange: (value: number) => void;
}

function NumberControl({ label, value, min, max, step = 1, onChange }: NumberControlProps) {
  return <Form.Item label={label}><div className="number-control">
    <Slider aria-label={label} min={min} max={max} step={step} value={value} onChange={onChange} />
    <InputNumber aria-label={label} min={min} max={max} step={step} value={value}
      onChange={next => { if (next !== null && Number.isFinite(next)) onChange(next); }} />
  </div></Form.Item>;
}

export function ParameterPanel() {
  const { parameters: p, setParameters, isProcessing, currentImage } = useProjectStore();
  const optimization = (value: Partial<typeof p.optimization>) => setParameters({ optimization: { ...p.optimization, ...value } });
  return <section className="parameter-panel">
    <div className="panel-heading"><h2>设计参数</h2><Tooltip title="恢复默认参数">
      <Button type="text" aria-label="恢复默认参数" icon={<ReloadOutlined />} disabled={isProcessing}
        onClick={() => setParameters(structuredClone(defaultParameters))} /></Tooltip></div>
    <Form layout="vertical" disabled={isProcessing}>
      <h3>光学参数</h3>
      <NumberControl label="算法焦距 (m)" value={p.focalLengthMeters} min={0.2} max={5} step={0.1}
        onChange={focalLengthMeters => setParameters({ focalLengthMeters })} />
      <Form.Item label="透镜材料"><Select aria-label="透镜材料" value={p.material} onChange={material => {
        const indices: Record<string, number> = { acrylic: 1.49, glass: 1.52, polycarbonate: 1.59 };
        setParameters({ material, refractiveIndex: indices[material] });
      }} options={[{ value: 'acrylic', label: '亚克力 (PMMA)' }, { value: 'glass', label: '玻璃' }, { value: 'polycarbonate', label: '聚碳酸酯 (PC)' }]} /></Form.Item>
      <NumberControl label="折射率" value={p.refractiveIndex} min={1.01} max={2} step={0.01}
        onChange={refractiveIndex => setParameters({ refractiveIndex })} />
      <h3>计算设置</h3>
      <Form.Item label="网格分辨率"><Select aria-label="网格分辨率" value={p.resolution}
        onChange={resolution => setParameters({ resolution })}
        options={[64, 128, 256, 512].map(value => ({ value, label: `${value} x ${value}${value === 128 ? ' · 标准' : value === 64 ? ' · 快速' : ' · 精细'}` }))} /></Form.Item>
      <NumberControl label="迭代次数" value={p.optimization.iterations ?? 4} min={1} max={20}
        onChange={iterations => optimization({ iterations })} />
      <Collapse ghost items={[{ key: 'solver', label: '求解器参数', children: <>
        <Form.Item label="收敛阈值"><Select aria-label="收敛阈值" value={p.optimization.tolerance}
          options={[0.001, 0.0001, 0.00001, 0.000001].map(value => ({ value, label: value.toExponential() }))}
          onChange={tolerance => optimization({ tolerance })} /></Form.Item>
        <NumberControl label="松弛因子" value={p.optimization.relaxationFactor ?? 1.99} min={1} max={1.99} step={0.01}
          onChange={relaxationFactor => optimization({ relaxationFactor })} />
      </> }]} />
    </Form>
    {currentImage && <Button className="apply-parameters" type="primary" block icon={<PlayCircleOutlined />}
      loading={isProcessing} onClick={() => void startGeneration()}>应用参数并生成</Button>}
  </section>;
}
