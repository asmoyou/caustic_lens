import React, { useState } from 'react';
import {
  Modal,
  Form,
  Select,
  Input,
  InputNumber,
  Switch,
  Button,
  Space,
  Typography,
  Divider,
  Card,
  Row,
  Col,
  Alert,
  Tooltip
} from 'antd';
import {
  DownloadOutlined,
  FileTextOutlined,
  PrinterOutlined,
  SettingOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { LensGeometry } from '../../types';
import { exportGeometry, EXPORT_FORMATS, GCodeSettings, ExportOptions } from '../../utils/exportUtils';

const { Option } = Select;
const { Text, Title } = Typography;

interface ExportDialogProps {
  visible: boolean;
  onCancel: () => void;
  geometry: LensGeometry | null;
}

interface FormValues {
  format: 'stl' | 'obj' | 'gcode' | 'ply';
  filename: string;
  // G-Code specific settings
  layerHeight: number;
  printSpeed: number;
  travelSpeed: number;
  extrusionMultiplier: number;
  bedTemp: number;
  hotendTemp: number;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  visible,
  onCancel,
  geometry
}) => {
  const [form] = Form.useForm<FormValues>();
  const [loading, setLoading] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<'stl' | 'obj' | 'gcode' | 'ply'>('stl');

  const handleExport = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      
      if (!geometry) {
        throw new Error('没有可导出的几何体');
      }

      const options: ExportOptions = {
        format: values.format,
        filename: values.filename
      };

      if (values.format === 'gcode') {
        options.gCodeSettings = {
          layerHeight: values.layerHeight,
          printSpeed: values.printSpeed,
          travelSpeed: values.travelSpeed,
          extrusionMultiplier: values.extrusionMultiplier,
          bedTemp: values.bedTemp,
          hotendTemp: values.hotendTemp
        };
      }

      exportGeometry(geometry, options);
      onCancel();
    } catch (error) {
      console.error('导出失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFormatChange = (format: 'stl' | 'obj' | 'gcode' | 'ply') => {
    setSelectedFormat(format);
    const extension = EXPORT_FORMATS[format].extension;
    const currentFilename = form.getFieldValue('filename') || '';
    const nameWithoutExt = currentFilename.replace(/\.[^/.]+$/, '');
    form.setFieldsValue({
      filename: nameWithoutExt ? `${nameWithoutExt}${extension}` : `lens${extension}`
    });
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'stl':
      case 'obj':
      case 'ply':
        return <FileTextOutlined />;
      case 'gcode':
        return <PrinterOutlined />;
      default:
        return <FileTextOutlined />;
    }
  };

  const getModelStats = () => {
    if (!geometry) return null;
    
    return (
      <Card size="small" style={{ marginBottom: 16 }}>
        <Title level={5} style={{ margin: 0, marginBottom: 8 }}>模型统计</Title>
        <Row gutter={16}>
          <Col span={8}>
            <Text type="secondary">顶点数</Text>
            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
              {geometry.vertices.length.toLocaleString()}
            </div>
          </Col>
          <Col span={8}>
            <Text type="secondary">面片数</Text>
            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
              {geometry.faces.length.toLocaleString()}
            </div>
          </Col>
          <Col span={8}>
            <Text type="secondary">预估大小</Text>
            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
              {getEstimatedFileSize()}
            </div>
          </Col>
        </Row>
      </Card>
    );
  };

  const getEstimatedFileSize = () => {
    if (!geometry) return '0 KB';
    
    const vertexCount = geometry.vertices.length;
    const faceCount = geometry.faces.length;
    
    let sizeBytes = 0;
    switch (selectedFormat) {
      case 'stl':
        sizeBytes = 80 + (faceCount * 50); // STL header + faces
        break;
      case 'obj':
        sizeBytes = (vertexCount * 30) + (faceCount * 20); // Rough estimate
        break;
      case 'ply':
        sizeBytes = 200 + (vertexCount * 40) + (faceCount * 15);
        break;
      case 'gcode':
        sizeBytes = faceCount * 100; // Very rough estimate
        break;
    }
    
    if (sizeBytes < 1024) return `${sizeBytes} B`;
    if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Modal
      title={
        <Space>
          <DownloadOutlined />
          导出3D模型
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      width={600}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button
          key="export"
          type="primary"
          icon={<DownloadOutlined />}
          loading={loading}
          onClick={handleExport}
          disabled={!geometry}
        >
          导出文件
        </Button>
      ]}
    >
      {!geometry && (
        <Alert
          message="没有可导出的模型"
          description="请先上传图片并生成3D透镜模型"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      
      {geometry && getModelStats()}
      
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          format: 'stl',
          filename: 'lens.stl',
          layerHeight: 0.2,
          printSpeed: 50,
          travelSpeed: 120,
          extrusionMultiplier: 1.0,
          bedTemp: 60,
          hotendTemp: 200
        }}
      >
        <Form.Item
          label="导出格式"
          name="format"
          rules={[{ required: true, message: '请选择导出格式' }]}
        >
          <Select
            size="large"
            onChange={handleFormatChange}
            placeholder="选择导出格式"
          >
            {Object.entries(EXPORT_FORMATS).map(([key, format]) => (
              <Option key={key} value={key}>
                <Space>
                  {getFormatIcon(key)}
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{format.name}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {format.description}
                    </div>
                  </div>
                </Space>
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          label="文件名"
          name="filename"
          rules={[
            { required: true, message: '请输入文件名' },
            { pattern: /^[^<>:"/\\|?*]+$/, message: '文件名包含非法字符' }
          ]}
        >
          <Input
            placeholder="输入文件名"
            suffix={
              <Tooltip title="文件名不能包含特殊字符">
                <InfoCircleOutlined style={{ color: '#ccc' }} />
              </Tooltip>
            }
          />
        </Form.Item>

        {selectedFormat === 'gcode' && (
          <>
            <Divider>
              <Space>
                <SettingOutlined />
                3D打印设置
              </Space>
            </Divider>
            
            <Alert
              message="G-Code设置"
              description="这些参数将影响3D打印质量，请根据您的打印机和材料调整"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="层高 (mm)"
                  name="layerHeight"
                  rules={[{ required: true, message: '请输入层高' }]}
                >
                  <InputNumber
                    min={0.1}
                    max={1.0}
                    step={0.05}
                    style={{ width: '100%' }}
                    placeholder="0.2"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="打印速度 (mm/s)"
                  name="printSpeed"
                  rules={[{ required: true, message: '请输入打印速度' }]}
                >
                  <InputNumber
                    min={10}
                    max={200}
                    step={5}
                    style={{ width: '100%' }}
                    placeholder="50"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="移动速度 (mm/s)"
                  name="travelSpeed"
                  rules={[{ required: true, message: '请输入移动速度' }]}
                >
                  <InputNumber
                    min={50}
                    max={300}
                    step={10}
                    style={{ width: '100%' }}
                    placeholder="120"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="挤出倍数"
                  name="extrusionMultiplier"
                  rules={[{ required: true, message: '请输入挤出倍数' }]}
                >
                  <InputNumber
                    min={0.5}
                    max={2.0}
                    step={0.1}
                    style={{ width: '100%' }}
                    placeholder="1.0"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="热床温度 (°C)"
                  name="bedTemp"
                  rules={[{ required: true, message: '请输入热床温度' }]}
                >
                  <InputNumber
                    min={0}
                    max={120}
                    step={5}
                    style={{ width: '100%' }}
                    placeholder="60"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="喷头温度 (°C)"
                  name="hotendTemp"
                  rules={[{ required: true, message: '请输入喷头温度' }]}
                >
                  <InputNumber
                    min={150}
                    max={300}
                    step={5}
                    style={{ width: '100%' }}
                    placeholder="200"
                  />
                </Form.Item>
              </Col>
            </Row>
          </>
        )}

        {selectedFormat !== 'gcode' && (
          <Alert
            message={`${EXPORT_FORMATS[selectedFormat].name} 格式说明`}
            description={
              <div>
                <p>{EXPORT_FORMATS[selectedFormat].description}</p>
                {selectedFormat === 'stl' && (
                  <p>• 适用于3D打印，包含几何信息但不包含材质和纹理</p>
                )}
                {selectedFormat === 'obj' && (
                  <p>• 通用3D格式，包含几何、材质和纹理信息，适用于大多数3D软件</p>
                )}
                {selectedFormat === 'ply' && (
                  <p>• 学术研究常用格式，包含顶点颜色和法向量信息</p>
                )}
              </div>
            }
            type="info"
            showIcon
          />
        )}
      </Form>
    </Modal>
  );
};