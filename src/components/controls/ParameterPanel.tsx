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
      focalLength: 200,  // Julia默认0.2米 = 200mm
      resolution: 512,  // Julia默认grid_definition = 512
      material: 'acrylic',
      refractiveIndex: 1.49,
      targetDistance: 1000,  // 调整为1000mm
      lightSource: {
        type: 'parallel',
        intensity: 1.0,
        wavelength: 633,
        position: { x: 0, y: 0, z: 150 }
      },
      optimization: {
        iterations: 4,  // 默认4次迭代，与Julia实现一致
        tolerance: 0.00001,  // Julia默认收敛阈值
        algorithm: 'sor',  // SOR算法
        useGPUAcceleration: true,
        photonMapSize: 512,  // 与resolution保持一致
        regularizationWeight: 1.99,  // Julia默认ω = 1.99
        learningRate: 0.1
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
              max={1000}
              value={parameters.targetDistance}
              onChange={(value) => handleParameterChange('targetDistance', value)}
              style={{ flex: 1 }}
            />
            <InputNumber
              min={50}
              max={1000}
              value={parameters.targetDistance}
              onChange={(value) => handleParameterChange('targetDistance', value || 1000)}
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
              <Tooltip title="计算网格的密度，Julia默认512x512">
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
            <Option value={64}>低 (64x64)</Option>
            <Option value={128}>中 (128x128)</Option>
            <Option value={256}>高 (256x256)</Option>
            <Option value={512}>标准 (512x512)</Option>
            <Option value={1024}>极高 (1024x1024)</Option>
          </Select>
        </Form.Item>

        <Form.Item 
          label={
            <Space>
              <Text>最大迭代次数</Text>
              <Tooltip title="算法的最大迭代次数。注意：这是外层迭代次数，每次迭代内部还会进行SOR求解。建议值：4-10次">
                <InfoCircleOutlined style={{ color: '#999', fontSize: '12px' }} />
              </Tooltip>
            </Space>
          }
        >
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Slider
              min={1}
              max={20}
              value={parameters.optimization.iterations}
              onChange={(value) => handleParameterChange('optimization', {
                ...parameters.optimization,
                iterations: value
              })}
              style={{ flex: 1 }}
            />
            <InputNumber
              min={1}
              max={20}
              value={parameters.optimization.iterations}
              onChange={(value) => handleParameterChange('optimization', {
                ...parameters.optimization,
                iterations: value || 4
              })}
              size="small"
              style={{ width: '80px' }}
            />
          </div>
        </Form.Item>

        <Form.Item 
          label={
            <Space>
              <Text>收敛容差</Text>
              <Tooltip title="SOR算法收敛阈值。较小的值会得到更精确的结果，但计算时间更长。Julia默认0.00001">
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
            <Option value={0.00001}>标准 (0.00001)</Option>
            <Option value={0.000001}>超精细 (0.000001)</Option>
          </Select>
        </Form.Item>

        <Form.Item 
          label={
            <Space>
              <Text>算法类型</Text>
              <Tooltip title="选择焦散透镜生成算法。SOR（逐次超松弛法）是推荐算法，收敛速度快且稳定">
                <InfoCircleOutlined style={{ color: '#999', fontSize: '12px' }} />
              </Tooltip>
            </Space>
          }
        >
          <Select
            value={parameters.optimization.algorithm}
            onChange={(value) => handleParameterChange('optimization', {
              ...parameters.optimization,
              algorithm: value
            })}
            size="small"
          >
            <Option value="sor">逐次超松弛法 (SOR)</Option>
            <Option value="gradient_descent">梯度下降法</Option>
          </Select>
        </Form.Item>

        <Form.Item 
          label={
            <Space>
              <Text>GPU加速</Text>
              <Tooltip title="使用WebGL计算着色器加速计算">
                <InfoCircleOutlined style={{ color: '#999', fontSize: '12px' }} />
              </Tooltip>
            </Space>
          }
        >
          <Switch
            checked={parameters.optimization.useGPUAcceleration ?? true}
            onChange={(checked) => handleParameterChange('optimization', {
              ...parameters.optimization,
              useGPUAcceleration: checked
            })}
            size="small"
          />
          <Text style={{ marginLeft: '8px', fontSize: '12px', color: '#666' }}>
            {parameters.optimization.useGPUAcceleration ?? true ? '已启用' : '已禁用'}
          </Text>
        </Form.Item>

        <Form.Item 
          label={
            <Space>
              <Text>光子图大小</Text>
              <Tooltip title="光线追踪计算的采样密度。高值提供更精确的结果但计算时间更长。推荐：中等或高等级">
                <InfoCircleOutlined style={{ color: '#999', fontSize: '12px' }} />
              </Tooltip>
            </Space>
          }
        >
          <Select
            value={parameters.optimization.photonMapSize || 262144}
            onChange={(value) => handleParameterChange('optimization', {
              ...parameters.optimization,
              photonMapSize: value
            })}
            size="small"
          >
            <Option value={16384}>低 (128x128)</Option>
            <Option value={65536}>中 (256x256)</Option>
            <Option value={262144}>高 (512x512)</Option>
            <Option value={1048576}>超高 (1024x1024)</Option>
          </Select>
        </Form.Item>

        <Form.Item 
          label={
            <Space>
              <Text>松弛因子 (ω)</Text>
              <Tooltip title="SOR算法的松弛因子。控制收敛速度，1.0为标准松弛，1.0-2.0为超松弛。Julia推荐值：1.99">
                <InfoCircleOutlined style={{ color: '#999', fontSize: '12px' }} />
              </Tooltip>
            </Space>
          }
        >
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Slider
              min={1.0}
              max={2.0}
              step={0.01}
              value={parameters.optimization.relaxationFactor || 1.99}
              onChange={(value) => handleParameterChange('optimization', {
                ...parameters.optimization,
                relaxationFactor: value
              })}
              style={{ flex: 1 }}
            />
            <InputNumber
              min={1.0}
              max={2.0}
              step={0.01}
              value={parameters.optimization.relaxationFactor || 1.99}
              onChange={(value) => handleParameterChange('optimization', {
                ...parameters.optimization,
                relaxationFactor: value || 1.99
              })}
              size="small"
              style={{ width: '80px' }}
            />
          </div>
        </Form.Item>

        {/* 学习率参数仅在梯度下降算法时显示 */}
        {parameters.optimization.algorithm === 'gradient_descent' && (
          <Form.Item 
            label={
              <Space>
                <Text>学习率</Text>
                <Tooltip title="梯度下降算法的学习率">
                  <InfoCircleOutlined style={{ color: '#999', fontSize: '12px' }} />
                </Tooltip>
              </Space>
            }
          >
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Slider
                min={0.001}
                max={0.5}
                step={0.001}
                value={parameters.optimization.learningRate || 0.1}
                onChange={(value) => handleParameterChange('optimization', {
                  ...parameters.optimization,
                  learningRate: value
                })}
                style={{ flex: 1 }}
              />
              <InputNumber
                min={0.001}
                max={0.5}
                step={0.001}
                value={parameters.optimization.learningRate || 0.1}
                onChange={(value) => handleParameterChange('optimization', {
                  ...parameters.optimization,
                  learningRate: value || 0.1
                })}
                size="small"
                style={{ width: '80px' }}
              />
            </div>
          </Form.Item>
        )}

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

        <Form.Item 
          label={
            <Space>
              <Text>光源位置</Text>
              <Tooltip title="光源在3D空间中的位置坐标">
                <InfoCircleOutlined style={{ color: '#999', fontSize: '12px' }} />
              </Tooltip>
            </Space>
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            <div>
              <Text style={{ fontSize: '12px', color: '#666' }}>X (mm)</Text>
              <InputNumber
                min={-500}
                max={500}
                value={parameters.lightSource.position.x}
                onChange={(value) => handleParameterChange('lightSource', {
                  ...parameters.lightSource,
                  position: {
                    ...parameters.lightSource.position,
                    x: value || 0
                  }
                })}
                size="small"
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <Text style={{ fontSize: '12px', color: '#666' }}>Y (mm)</Text>
              <InputNumber
                min={-500}
                max={500}
                value={parameters.lightSource.position.y}
                onChange={(value) => handleParameterChange('lightSource', {
                  ...parameters.lightSource,
                  position: {
                    ...parameters.lightSource.position,
                    y: value || 0
                  }
                })}
                size="small"
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <Text style={{ fontSize: '12px', color: '#666' }}>Z (mm)</Text>
              <InputNumber
                min={0}
                max={1000}
                value={parameters.lightSource.position.z}
                onChange={(value) => handleParameterChange('lightSource', {
                  ...parameters.lightSource,
                  position: {
                    ...parameters.lightSource.position,
                    z: value || 150
                  }
                })}
                size="small"
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </Form.Item>


      </Form>
    </Card>
  );
};

export default ParameterPanel;