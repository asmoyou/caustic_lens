import React, { useState, useCallback } from 'react';
import { Card, Button, Space, Typography, Row, Col, Image, Alert, Divider, Progress } from 'antd';
import { PlayCircleOutlined, CheckCircleOutlined, CloseCircleOutlined, ExperimentOutlined } from '@ant-design/icons';
import { runSimplifiedCausticTests } from '../../test/simplifiedCausticTest';

const { Title, Text, Paragraph } = Typography;

interface TestResults {
  basicProjection: any;
  textureTest: any;
  causticShader: any;
  heightMap: any;
  overallSuccess: boolean;
  summary: string;
}

export const SimplifiedTestPanel: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResults | null>(null);

  const runTests = useCallback(async () => {
    setIsRunning(true);
    try {
      console.log('开始运行简化焦散测试...');
      
      // 模拟异步执行
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const testResults = runSimplifiedCausticTests();
      setResults(testResults);
      
      console.log('简化测试完成:', testResults);
    } catch (error) {
      console.error('简化测试执行失败:', error);
      setResults({
        basicProjection: { success: false, issues: [`执行异常: ${(error as Error).message}`] },
        textureTest: { success: false, issues: [] },
        causticShader: { success: false, issues: [] },
        heightMap: { success: false, issues: [] },
        overallSuccess: false,
        summary: `测试执行失败: ${(error as Error).message}`
      });
    } finally {
      setIsRunning(false);
    }
  }, []);

  const renderTestResult = (testName: string, result: any, icon: React.ReactNode) => {
    if (!result) return null;
    
    return (
      <Card 
        size="small" 
        title={
          <Space>
            {icon}
            <Text strong>{testName}</Text>
            {result.success ? 
              <CheckCircleOutlined style={{ color: '#52c41a' }} /> : 
              <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
            }
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        {result.success ? (
          <Alert 
            message="测试通过" 
            type="success" 
            showIcon 
            style={{ marginBottom: 8 }}
          />
        ) : (
          <Alert 
            message="测试失败" 
            description={
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {result.issues?.map((issue: string, index: number) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            }
            type="error" 
            showIcon 
            style={{ marginBottom: 8 }}
          />
        )}
        
        {result.imageData && (
          <div>
            <Text strong>渲染结果:</Text>
            <div style={{ marginTop: 8, textAlign: 'center' }}>
              <Image
                src={result.imageData}
                alt={`${testName} 渲染结果`}
                style={{ 
                  maxWidth: 200, 
                  maxHeight: 200,
                  border: '1px solid #d9d9d9',
                  borderRadius: 4
                }}
                preview={{
                  mask: '查看大图'
                }}
              />
            </div>
          </div>
        )}
      </Card>
    );
  };

  return (
    <div style={{ padding: 16 }}>
      <Card 
        title={
          <Space>
            <ExperimentOutlined />
            <Title level={4} style={{ margin: 0 }}>简化焦散测试</Title>
          </Space>
        }
        extra={
          <Button 
            type="primary" 
            icon={<PlayCircleOutlined />}
            onClick={runTests}
            loading={isRunning}
            disabled={isRunning}
          >
            {isRunning ? '测试中...' : '运行简化测试'}
          </Button>
        }
      >
        <Paragraph>
          这个简化测试套件将逐步验证焦散渲染的各个基础组件，帮助定位问题所在：
        </Paragraph>
        
        <ul>
          <li><strong>基础光线投射</strong> - 验证WebGL渲染环境是否正常</li>
          <li><strong>纹理渲染</strong> - 验证纹理处理是否正确</li>
          <li><strong>焦散着色器</strong> - 验证着色器逻辑是否有效</li>
          <li><strong>高度图生成</strong> - 验证几何计算是否正确</li>
        </ul>
        
        {isRunning && (
          <div style={{ marginTop: 16 }}>
            <Progress percent={100} status="active" showInfo={false} />
            <Text type="secondary">正在运行简化测试...</Text>
          </div>
        )}
        
        {results && (
          <div style={{ marginTop: 24 }}>
            <Divider orientation="left">测试结果</Divider>
            
            <Alert
              message={results.overallSuccess ? "所有测试通过" : "部分测试失败"}
              description={results.summary}
              type={results.overallSuccess ? "success" : "warning"}
              showIcon
              style={{ marginBottom: 16 }}
            />
            
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                {renderTestResult(
                  '基础光线投射', 
                  results.basicProjection, 
                  <CheckCircleOutlined style={{ color: '#1890ff' }} />
                )}
              </Col>
              <Col xs={24} lg={12}>
                {renderTestResult(
                  '纹理渲染', 
                  results.textureTest, 
                  <CheckCircleOutlined style={{ color: '#722ed1' }} />
                )}
              </Col>
              <Col xs={24} lg={12}>
                {renderTestResult(
                  '焦散着色器', 
                  results.causticShader, 
                  <CheckCircleOutlined style={{ color: '#fa8c16' }} />
                )}
              </Col>
              <Col xs={24} lg={12}>
                {renderTestResult(
                  '高度图生成', 
                  results.heightMap, 
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                )}
              </Col>
            </Row>
          </div>
        )}
      </Card>
    </div>
  );
};

export default SimplifiedTestPanel;