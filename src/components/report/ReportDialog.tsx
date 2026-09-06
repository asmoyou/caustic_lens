import { useMemo, useState } from 'react';
import { Alert, Button, Descriptions, Form, Input, Modal } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { useProjectStore } from '../../stores/projectStore';
import { GeometryAnalyzer, ReportGenerator } from '../../utils/reportGenerator';

interface ReportDialogProps { visible: boolean; onCancel: () => void }

export function ReportDialog({ visible, onCancel }: ReportDialogProps) {
  const { currentImage, geometry, parameters, processingTime } = useProjectStore();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stats = useMemo(() => geometry ? {
    volume: GeometryAnalyzer.calculateVolume(geometry),
    surfaceArea: GeometryAnalyzer.calculateSurfaceArea(geometry),
    size: GeometryAnalyzer.getBoundingBox(geometry).size,
  } : null, [geometry]);

  const download = async ({ projectName }: { projectName: string }) => {
    if (!currentImage || !geometry || generating) return;
    setGenerating(true);
    setError(null);
    try {
      const report = await ReportGenerator.generateReport(projectName.trim(), currentImage, geometry, parameters, processingTime);
      ReportGenerator.downloadHTMLReport(report, `${projectName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}-report.html`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : '报告生成失败'); }
    finally { setGenerating(false); }
  };

  return <Modal title="设计报告" open={visible} onCancel={onCancel} footer={null} width={620}>
    <Form layout="vertical" onFinish={download} initialValues={{ projectName: currentImage?.name.replace(/\.[^.]+$/, '') ?? '焦散透镜设计' }}>
      <Form.Item name="projectName" label="项目名称" rules={[{ required: true, whitespace: true, message: '请输入项目名称' }, { max: 50, message: '最多 50 个字符' }]}>
        <Input aria-label="项目名称" maxLength={50} disabled={generating} />
      </Form.Item>
      {stats && <Descriptions column={1} size="small" className="report-statistics" items={[
        { key: 'dimensions', label: '模型尺寸', children: `${stats.size.x.toFixed(2)} x ${stats.size.y.toFixed(2)} x ${stats.size.z.toFixed(3)} mm` },
        { key: 'area', label: '表面积', children: `${stats.surfaceArea.toFixed(2)} mm²` },
        { key: 'volume', label: '体积', children: `${stats.volume.toFixed(3)} mm³` },
        { key: 'focalLength', label: '算法焦距', children: `${parameters.focalLengthMeters} m` },
        { key: 'iterations', label: '迭代次数', children: parameters.optimization.iterations },
        { key: 'processingTime', label: '计算耗时', children: `${processingTime.toFixed(2)} s` },
      ]} />}
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
      <Button type="primary" htmlType="submit" icon={<DownloadOutlined />} loading={generating} disabled={!geometry}>下载 HTML 报告</Button>
    </Form>
  </Modal>;
}

export default ReportDialog;
