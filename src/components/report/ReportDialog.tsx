import React, { useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  Space,
  Card,
  Statistic,
  Row,
  Col,
  Typography,
  Divider,
  message,
  Spin
} from 'antd';
import {
  FileTextOutlined,
  DownloadOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { useProjectStore } from '../../stores/projectStore';
import { ReportGenerator, ReportData, GeometryAnalyzer } from '../../utils/reportGenerator';

const { Title, Text } = Typography;

interface ReportDialogProps {
  visible: boolean;
  onCancel: () => void;
}

export const ReportDialog: React.FC<ReportDialogProps> = ({ visible, onCancel }) => {
  const [form] = Form.useForm();
  const [generating, setGenerating] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  
  const {
    currentImage,
    geometry,
    parameters,
    processingTime
  } = useProjectStore();

  // 计算统计信息
  const getStatistics = () => {
    if (!geometry) return null;
    
    return {
      vertexCount: geometry.vertices.length,
      faceCount: geometry.faces.length,
      surfaceArea: GeometryAnalyzer.calculateSurfaceArea(geometry),
      volume: GeometryAnalyzer.calculateVolume(geometry),
      boundingBox: GeometryAnalyzer.getBoundingBox(geometry)
    };
  };

  const statistics = getStatistics();

  const handleGenerateReport = async (values: { projectName: string }) => {
    if (!currentImage || !geometry) {
      message.error('请先生成透镜模型');
      return;
    }

    setGenerating(true);
    
    try {
      const reportData = await ReportGenerator.generateReport(
        values.projectName,
        currentImage,
        geometry,
        {
          lensWidth: parameters.lensWidth,
          lensHeight: parameters.lensHeight,
          thickness: parameters.thickness,
          focalLength: parameters.focalLength,
          refractiveIndex: parameters.refractiveIndex,
          resolution: parameters.resolution,
          rayCount: parameters.rayCount,
          convergenceThreshold: parameters.convergenceThreshold,
          maxIterations: parameters.maxIterations
        },
        processingTime
      );
      
      setReportData(reportData);
      message.success('报告生成成功！');
    } catch (error) {
      console.error('报告生成失败:', error);
      message.error('报告生成失败，请重试');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadReport = () => {
    if (!reportData) return;
    
    const filename = `${reportData.projectName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}_report.html`;
    ReportGenerator.downloadHTMLReport(reportData, filename);
    message.success('报告已下载');
  };

  const handleReset = () => {
    form.resetFields();
    setReportData(null);
  };

  const handleCancel = () => {
    handleReset();
    onCancel();
  };

  return (
    <Modal
      title={
        <Space>
          <FileTextOutlined />
          <span>生成技术报告</span>
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      width={800}
      footer={null}
      destroyOnHidden
    >
      <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {!reportData ? (
          <>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleGenerateReport}
              initialValues={{
                projectName: `焦散透镜设计_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '')}`
              }}
            >
              <Form.Item
                label="项目名称"
                name="projectName"
                rules={[
                  { required: true, message: '请输入项目名称' },
                  { max: 50, message: '项目名称不能超过50个字符' }
                ]}
              >
                <Input
                  placeholder="请输入项目名称"
                  prefix={<FileTextOutlined />}
                />
              </Form.Item>

              <Divider>模型统计信息</Divider>
              
              {statistics && (
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Card size="small">
                      <Statistic
                        title="顶点数量"
                        value={statistics.vertexCount}
                        prefix={<DatabaseOutlined />}
                        suffix="个"
                      />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card size="small">
                      <Statistic
                        title="面片数量"
                        value={statistics.faceCount}
                        prefix={<BarChartOutlined />}
                        suffix="个"
                      />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card size="small">
                      <Statistic
                        title="表面积"
                        value={statistics.surfaceArea}
                        precision={2}
                        suffix="mm²"
                      />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card size="small">
                      <Statistic
                        title="体积"
                        value={statistics.volume}
                        precision={3}
                        suffix="mm³"
                      />
                    </Card>
                  </Col>
                  <Col span={24}>
                    <Card size="small">
                      <Statistic
                        title="处理时间"
                        value={processingTime}
                        precision={2}
                        prefix={<ClockCircleOutlined />}
                        suffix="秒"
                      />
                    </Card>
                  </Col>
                </Row>
              )}

              {!statistics && (
                <Card>
                  <Text type="secondary">请先生成透镜模型以查看统计信息</Text>
                </Card>
              )}

              <Divider>报告内容</Divider>
              
              <Card size="small" style={{ marginBottom: 16 }}>
                <Title level={5}>报告将包含以下内容：</Title>
                <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
                  <li>项目基本信息和生成时间</li>
                  <li>源图像预览和参数</li>
                  <li>透镜设计参数详情</li>
                  <li>计算参数和算法设置</li>
                  <li>3D模型统计数据</li>
                  <li>技术说明和应用建议</li>
                  <li>材料建议和制造工艺</li>
                </ul>
              </Card>

              <Form.Item>
                <Space>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={generating}
                    disabled={!currentImage || !geometry}
                    icon={<FileTextOutlined />}
                  >
                    {generating ? '生成中...' : '生成报告'}
                  </Button>
                  <Button onClick={handleCancel}>
                    取消
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </>
        ) : (
          <>
            <Card>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <Title level={3} style={{ color: '#52c41a', marginBottom: 8 }}>
                  ✅ 报告生成成功！
                </Title>
                <Text type="secondary">
                  项目: {reportData.projectName}
                </Text>
                <br />
                <Text type="secondary">
                  生成时间: {reportData.generatedAt.toLocaleString('zh-CN')}
                </Text>
              </div>

              <Divider>报告统计</Divider>
              
              <Row gutter={[16, 16]}>
                <Col span={8}>
                  <Statistic
                    title="顶点数量"
                    value={reportData.statistics.vertexCount}
                    suffix="个"
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="面片数量"
                    value={reportData.statistics.faceCount}
                    suffix="个"
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="处理时间"
                    value={reportData.statistics.processingTime}
                    precision={2}
                    suffix="秒"
                  />
                </Col>
              </Row>

              <Divider />
              
              <div style={{ textAlign: 'center' }}>
                <Space size="large">
                  <Button
                    type="primary"
                    size="large"
                    icon={<DownloadOutlined />}
                    onClick={handleDownloadReport}
                  >
                    下载HTML报告
                  </Button>
                  <Button
                    size="large"
                    onClick={handleReset}
                  >
                    重新生成
                  </Button>
                  <Button
                    size="large"
                    onClick={handleCancel}
                  >
                    关闭
                  </Button>
                </Space>
              </div>
            </Card>
          </>
        )}
        
        {generating && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>
              <Text>正在生成报告，请稍候...</Text>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ReportDialog;