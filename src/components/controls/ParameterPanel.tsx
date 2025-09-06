import React, { useEffect } from 'react';
import { Card, Form, Slider, InputNumber, Select, Switch, Divider, Typography, Space, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { useProjectStore } from '../../stores/projectStore';
import { CausticParameters } from '../../types';

const { Title, Text } = Typography;
const { Option } = Select;

export const ParameterPanel: React.FC = () => {
  const { parameters, setParameters } = useProjectStore();
  const [form] = Form.useForm();

  // 监听parameters变化，同步更新Form字段值
  useEffect(() => {
    form.setFieldsValue(parameters);
  }, [form, parameters]);

  const handleParameterChange = (field: keyof CausticParameters, value: any) => {
    setParameters({ [field]: value });
    form.setFieldsValue({ [field]: value });
  };

  const resetToDefaults = () => {
    const defaultParams: CausticParameters = {
      lensWidth: 100,
      lensHeight: 100,
      focalLength: 50,
      resolution: 128,
      thickness: 10,
      material: 'acrylic',
      refractiveIndex: 1.49,
      targetDistance: 200,
      lightSource: {
        type: 'parallel',
        intensity: 1.0,
        wavelength: 550,
        position: { x: 0, y: 0, z: -100 }
      },
      optimization: {
        iterations: 100,
        tolerance: 0.001,
        algorithm: 'gradient_descent'
      }
    };
    setParameters(defaultParams);
    form.setFieldsValue(defaultParams);
  };

  return (
    <Card 
      title="参数配置" 
      size="small"
      extra={
        <a onClick={resetToDefaults} style={{ fontSize: '12px' }}>
          重置默认值
        </a>
      }
    >
      <Form
        form={form}
        layout="vertical"
        size="small"
      >
        {/* 透镜基本参数 */}
        <Title level={5} style={{ margin: '0 0 12px 0', fontSize: '14px' }}>
          透镜尺寸
        </Title>
        
        <Form.Item 
          name="lensWidth"
          label={
            <Space>
              <Text>宽度 (mm)</Text>
              <Tooltip title="透镜的水平宽度">
                <InfoCircleOutlined style={{ color: '#999', fontSize: '12px' }} />
              </Tooltip>
            </Space>
          }
        >
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Slider
              min={10}
              max={200}
              value={parameters.lensWidth}
              onChange={(value) => handleParameterChange('lensWidth', value)}
              style={{ flex: 1 }}
            />
            <InputNumber
              min={10}
              max={200}
              value={parameters.lensWidth}
              onChange={(value) => handleParameterChange('lensWidth', value || 100)}
              size="small"
              style={{ width: '70px' }}
            />
          </div>
        </Form.Item>

        <Form.Item 
          name="lensHeight"
          label={
            <Space>
              <Text>高度 (mm)</Text>
              <Tooltip title="透镜的垂直高度">
                <InfoCircleOutlined style={{ color: '#999', fontSize: '12px' }} />
              </Tooltip>
            </Space>
          }
        >
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Slider
              min={10}
              max={200}
              value={parameters.lensHeight}
              onChange={(value) => handleParameterChange('lensHeight', value)}
              style={{ flex: 1 }}
            />
            <InputNumber
              min={10}
              max={200}
              value={parameters.lensHeight}
              onChange={(value) => handleParameterChange('lensHeight', value || 100)}
              size="small"
              style={{ width: '70px' }}
            />
          </div>
        </Form.Item>

        <Form.Item 
          name="thickness"
          label={
            <Space>
              <Text>厚度 (mm)</Text>
              <Tooltip title="透镜的最大厚度">
                <InfoCircleOutlined style={{ color: '#999', fontSize: '12px' }} />
              </Tooltip>
            </Space>
          }
        >
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Slider
              min={1}
              max={20}
              step={0.5}
              value={parameters.thickness}
              onChange={(value) => handleParameterChange('thickness', value)}
              style={{ flex: 1 }}
            />
            <InputNumber
              min={1}
              max={20}
              step={0.5}
              value={parameters.thickness}
              onChange={(value) => handleParameterChange('thickness', value || 5)}
              size="small"
              style={{ width: '70px' }}
            />
          </div>
        </Form.Item>

        <Divider style={{ margin: '16px 0' }} />

        {/* 光学参数 */}
        <Title level={5} style={{ margin: '0 0 12px 0', fontSize: '14px' }}>
          光学参数
        </Title>

        <Form.Item 
          name="focalLength"
          label={
            <Space>
              <Text>焦距 (mm)</Text>
              <Tooltip title="透镜的焦距，影响焦散图案的大小">
                <InfoCircleOutlined style={{ color: '#999', fontSize: '12px' }} />
              </Tooltip>
            </Space>
          }
        >
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Slider
              min={10}
              max={200}
              value={parameters.focalLength}
              onChange={(value) => handleParameterChange('focalLength', value)}
              style={{ flex: 1 }}
            />
            <InputNumber
              min={10}
              max={200}
              value={parameters.focalLength}
              onChange={(value) => handleParameterChange('focalLength', value || 50)}
              size="small"
              style={{ width: '70px' }}
            />
          </div>
        </Form.Item>

        <Form.Item 
          name="targetDistance"
          label={
            <Space>
              <Text>目标距离 (mm)</Text>
              <Tooltip title="焦散图案投影的距离">
                <InfoCircleOutlined style={{ color: '#999', fontSize: '12px' }} />
              </Tooltip>
            </Space>
          }
        >
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Slider
              min={50}
              max={500}
              value={parameters.targetDistance}
              onChange={(value) => handleParameterChange('targetDistance', value)}
              style={{ flex: 1 }}
            />
            <InputNumber
              min={50}
              max={500}
              value={parameters.targetDistance}
              onChange={(value) => handleParameterChange('targetDistance', value || 200)}
              size="small"
              style={{ width: '70px' }}
            />
          </div>
        </Form.Item>

        <Form.Item 
          name="material"
          label={
            <Space>
              <Text>材料</Text>
              <Tooltip title="透镜材料类型">
                <InfoCircleOutlined style={{ color: '#999', fontSize: '12px' }} />
              </Tooltip>
            </Space>
          }
        >
          <Select
            value={parameters.material}
            onChange={(value) => {
              // 直接更新store和form
              setParameters({ material: value });
              form.setFieldsValue({ material: value });
              // 根据材料自动设置折射率
              const refractiveIndexMap: Record<string, number> = {
                'acrylic': 1.49,
                'glass': 1.52,
                'polycarbonate': 1.59,
                'pmma': 1.49
              };
              if (refractiveIndexMap[value]) {
                setParameters({ refractiveIndex: refractiveIndexMap[value] });
                form.setFieldsValue({ refractiveIndex: refractiveIndexMap[value] });
              }
            }}
            size="small"
          >
            <Option value="acrylic">亚克力 (PMMA)</Option>
            <Option value="glass">玻璃</Option>
            <Option value="polycarbonate">聚碳酸酯 (PC)</Option>
            <Option value="pmma">有机玻璃</Option>
          </Select>
        </Form.Item>

        <Form.Item 
          name="refractiveIndex"
          label={
            <Space>
              <Text>折射率</Text>
              <Tooltip title="材料的折射率，影响光线弯曲程度">
                <InfoCircleOutlined style={{ color: '#999', fontSize: '12px' }} />
              </Tooltip>
            </Space>
          }
        >
          <InputNumber
            min={1.0}
            max={2.0}
            step={0.01}
            value={parameters.refractiveIndex}
            onChange={(value) => handleParameterChange('refractiveIndex', value || 1.49)}
            size="small"
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Divider style={{ margin: '16px 0' }} />

        {/* 计算参数 */}
        <Title level={5} style={{ margin: '0 0 12px 0', fontSize: '14px' }}>
          计算设置
        </Title>

        <Form.Item 
          name="resolution"
          label={
            <Space>
              <Text>网格分辨率</Text>
              <Tooltip title="计算网格的密度，越高越精确但计算越慢">
                <InfoCircleOutlined style={{ color: '#999', fontSize: '12px' }} />
              </Tooltip>
            </Space>
          }
        >
          <Select
            value={parameters.resolution}
            onChange={(value) => handleParameterChange('resolution', value)}
            size="small"
          >
            <Option value={32}>低 (32x32)</Option>
            <Option value={64}>中 (64x64)</Option>
            <Option value={128}>高 (128x128)</Option>
            <Option value={256}>超高 (256x256)</Option>
          </Select>
        </Form.Item>

        <Form.Item 
          label={
            <Space>
              <Text>优化迭代次数</Text>
              <Tooltip title="算法优化的迭代次数">
                <InfoCircleOutlined style={{ color: '#999', fontSize: '12px' }} />
              </Tooltip>
            </Space>
          }
        >
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Slider
              min={10}
              max={500}
              value={parameters.optimization.iterations}
              onChange={(value) => handleParameterChange('optimization', {
                ...parameters.optimization,
                iterations: value
              })}
              style={{ flex: 1 }}
            />
            <InputNumber
              min={10}
              max={500}
              value={parameters.optimization.iterations}
              onChange={(value) => handleParameterChange('optimization', {
                ...parameters.optimization,
                iterations: value || 100
              })}
              size="small"
              style={{ width: '70px' }}
            />
          </div>
        </Form.Item>

        <Form.Item 
          label={
            <Space>
              <Text>收敛容差</Text>
              <Tooltip title="算法收敛的精度要求">
                <InfoCircleOutlined style={{ color: '#999', fontSize: '12px' }} />
              </Tooltip>
            </Space>
          }
        >
          <Select
            value={parameters.optimization.tolerance}
            onChange={(value) => handleParameterChange('optimization', {
              ...parameters.optimization,
              tolerance: value
            })}
            size="small"
          >
            <Option value={0.01}>粗糙 (0.01)</Option>
            <Option value={0.001}>中等 (0.001)</Option>
            <Option value={0.0001}>精细 (0.0001)</Option>
            <Option value={0.00001}>超精细 (0.00001)</Option>
          </Select>
        </Form.Item>

        <Divider style={{ margin: '16px 0' }} />

        {/* 光源参数 */}
        <Title level={5} style={{ margin: '0 0 12px 0', fontSize: '14px' }}>
          光源设置
        </Title>

        <Form.Item 
          label={
            <Space>
              <Text>光源类型</Text>
              <Tooltip title="入射光的类型">
                <InfoCircleOutlined style={{ color: '#999', fontSize: '12px' }} />
              </Tooltip>
            </Space>
          }
        >
          <Select
            value={parameters.lightSource.type}
            onChange={(value) => handleParameterChange('lightSource', {
              ...parameters.lightSource,
              type: value
            })}
            size="small"
          >
            <Option value="parallel">平行光</Option>
            <Option value="point">点光源</Option>
            <Option value="collimated">准直光</Option>
          </Select>
        </Form.Item>

        <Form.Item 
          label={
            <Space>
              <Text>光强度</Text>
              <Tooltip title="光源的强度">
                <InfoCircleOutlined style={{ color: '#999', fontSize: '12px' }} />
              </Tooltip>
            </Space>
          }
        >
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Slider
              min={0.1}
              max={2.0}
              step={0.1}
              value={parameters.lightSource.intensity}
              onChange={(value) => handleParameterChange('lightSource', {
                ...parameters.lightSource,
                intensity: value
              })}
              style={{ flex: 1 }}
            />
            <InputNumber
              min={0.1}
              max={2.0}
              step={0.1}
              value={parameters.lightSource.intensity}
              onChange={(value) => handleParameterChange('lightSource', {
                ...parameters.lightSource,
                intensity: value || 1.0
              })}
              size="small"
              style={{ width: '70px' }}
            />
          </div>
        </Form.Item>

        <Form.Item 
          label={
            <Space>
              <Text>波长 (nm)</Text>
              <Tooltip title="光的波长，影响色散效果">
                <InfoCircleOutlined style={{ color: '#999', fontSize: '12px' }} />
              </Tooltip>
            </Space>
          }
        >
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Slider
              min={400}
              max={700}
              value={parameters.lightSource.wavelength}
              onChange={(value) => handleParameterChange('lightSource', {
                ...parameters.lightSource,
                wavelength: value
              })}
              style={{ flex: 1 }}
            />
            <InputNumber
              min={400}
              max={700}
              value={parameters.lightSource.wavelength}
              onChange={(value) => handleParameterChange('lightSource', {
                ...parameters.lightSource,
                wavelength: value || 550
              })}
              size="small"
              style={{ width: '70px' }}
            />
          </div>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default ParameterPanel;