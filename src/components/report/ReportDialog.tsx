import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Form, Input, Modal, Tooltip } from 'antd';
import { DownloadOutlined, PrinterOutlined } from '@ant-design/icons';
import { useProjectStore } from '../../stores/projectStore';
import { ReportGenerator } from '../../utils/reportGenerator';
import logoSvg from '../../assets/lens-icon.svg?raw';

const logoDataUrl = `data:image/svg+xml,${encodeURIComponent(logoSvg)}`;
interface ReportDialogProps { visible: boolean; onCancel: () => void }

export function ReportDialog({ visible, onCancel }: ReportDialogProps) {
  const { currentImage, geometry, parameters, processingTime, causticsRenderResults } = useProjectStore();
  const [form] = Form.useForm<{ projectName: string }>();
  const defaultName = (currentImage?.name.replace(/\.[^.]+$/, '') ?? '焦散透镜设计').slice(0, 50);
  const name = Form.useWatch('projectName', form) ?? defaultName;
  const [generating, setGenerating] = useState(false);
  const [printReady, setPrintReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const projection = causticsRenderResults.at(-1);
  const snapshot = useMemo(() => currentImage && geometry ?
    ReportGenerator.createSnapshot('', currentImage, geometry, parameters, processingTime, { logoDataUrl, projection }) : null,
  [currentImage, geometry, parameters, processingTime, projection]);
  const report = useMemo(() => snapshot ? { ...snapshot, projectName: name.trim() || defaultName } : null, [snapshot, name, defaultName]);
  const html = useMemo(() => report ? ReportGenerator.getReportHTML(report) : '', [report]);
  useEffect(() => { setPrintReady(false); }, [html]);

  const download = async () => {
    if (!report || generating) return;
    setGenerating(true);
    setError(null);
    try {
      const embedded = await ReportGenerator.prepareDownload(report);
      ReportGenerator.downloadHTMLReport(embedded, `${report.projectName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}-report.html`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : '报告生成失败'); }
    finally { setGenerating(false); }
  };
  const print = () => {
    if (!printReady || !report) return;
    frame.current?.contentWindow?.focus();
    frame.current?.contentWindow?.print();
  };

  return <Modal className="report-dialog" aria-label="设计报告" title={<div className="report-dialog-heading">
    <img src={logoDataUrl} alt="" /><div><strong>设计报告</strong><span aria-hidden="true">CAUSTIC LENS / DESIGN REPORT</span></div>
  </div>} open={visible} onCancel={onCancel} footer={null} width={980} centered>
    <Form form={form} layout="vertical" onFinish={download} initialValues={{ projectName: defaultName }}>
      <div className="report-dialog-toolbar">
        <Form.Item name="projectName" label="项目名称" rules={[{ required: true, whitespace: true, message: '请输入项目名称' }, { max: 50, message: '最多 50 个字符' }]}>
          <Input aria-label="项目名称" maxLength={50} disabled={generating} />
        </Form.Item>
        <div className="report-dialog-actions">
          <Tooltip title="打印报告 / 保存 PDF"><Button aria-label="打印报告" icon={<PrinterOutlined />} onClick={print} disabled={!printReady || !report || !name.trim()} /></Tooltip>
          <Button type="primary" htmlType="submit" icon={<DownloadOutlined />} loading={generating} disabled={!report}>下载 HTML 报告</Button>
        </div>
      </div>
      {error && <Alert className="report-dialog-error" type="error" showIcon message={error} />}
      {report ? <iframe ref={frame} className="report-preview" title="设计报告预览" srcDoc={html}
        sandbox="allow-same-origin allow-modals" onLoad={() => setPrintReady(true)} /> :
        <Alert type="info" showIcon message="暂无可生成报告的模型" />}
    </Form>
  </Modal>;
}

export default ReportDialog;
