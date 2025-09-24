import React, { useState, useCallback } from 'react';
import { Card, Button, Space, Typography, Collapse, Alert, Divider, Row, Col, Statistic, Tag } from 'antd';
import { BugOutlined, PlayCircleOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useProjectStore } from '../../stores/projectStore';
import { CausticDebugger, runCausticDiagnostics } from '../../test/causticDebugger';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

interface DiagnosticResults {
  spatialTest: any;
  refractionTest: any;
  intensityTest: any;
  patternTest: any;
  textureTest: any;
  overallIssues: string[];
  recommendations: string[];
}

export const CausticTestPanel: React.FC = () => {
  const { parameters, targetShape } = useProjectStore();
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResults | null>(null);
  const [testCanvas, setTestCanvas] = useState<HTMLCanvasElement | null>(null);

  const runDiagnostics = useCallback(async () => {
    setIsRunning(true);
    try {
      console.log('开始运行焦散渲染诊断...');
      const diagnosticResults = runCausticDiagnostics(parameters, targetShape || undefined);
      setResults(diagnosticResults);
      
      // 保存测试纹理canvas
      if (diagnosticResults.textureTest.canvas) {
        setTestCanvas(diagnosticResults.textureTest.canvas);
      }
      
      console.log('诊断完成:', diagnosticResults);
    } catch (error) {
      console.error('诊断过程中发生错误:', error);
    } finally {
      setIsRunning(false);
    }
  }, [parameters, targetShape]);

  const renderSpatialTest = (spatialTest: any) => (
    <div>
      <Row gutter={16}>
        <Col span={8}>
          <Statistic 
            title="光源位置" 
            value={`(${spatialTest.lightSourcePosition.x}, ${spatialTest.lightSourcePosition.y}, ${spatialTest.lightSourcePosition.z})`}
            valueStyle={{ fontSize: '12px' }}
          />
        </Col>
        <Col span={8}>
          <Statistic 
            title="透镜位置" 
            value={`(${spatialTest.lensPosition.x}, ${spatialTest.lensPosition.y}, ${spatialTest.lensPosition.z})`}
            valueStyle={{ fontSize: '12px' }}
          />
        </Col>
        <Col span={8}>
          <Statistic 
            title="墙面位置" 
            value={`(${spatialTest.wallPosition.x}, ${spatialTest.wallPosition.y}, ${spatialTest.wallPosition.z})`}
            valueStyle={{ fontSize: '12px' }}
          />
        </Col>
      </Row>
      <Divider />
      <Row gutter={16}>
        <Col span={8}>
          <Statistic 
            title="光源到透镜距离" 
            value={spatialTest.distances.lightToLens.toFixed(1)}
            suffix="mm"
          />
        </Col>
        <Col span={8}>
          <Statistic 
            title="透镜到墙面距离" 
            value={spatialTest.distances.lensToWall.toFixed(1)}
            suffix="mm"
          />
        </Col>
        <Col span={8}>
          <Statistic 
            title="总距离" 
            value={spatialTest.distances.totalDistance.toFixed(1)}
            suffix="mm"
          />
        </Col>
      </Row>
      {spatialTest.issues.length > 0 && (
        <>
          <Divider />
          <Alert
            type="warning"
            message="发现空间关系问题"
            description={
              <ul>
                {spatialTest.issues.map((issue: string, index: number) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            }
          />
        </>
      )}
    </div>
  );

  const renderRefractionTest = (refractionTest: any) => (
    <div>
      <Paragraph>
        <Text strong>折射率:</Text> {parameters.refractiveIndex}
      </Paragraph>
      <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
        {refractionTest.testCases.map((testCase: any, index: number) => (
          <Card key={index} size="small" style={{ marginBottom: 8 }}>
            <Row gutter={8}>
              <Col span={6}>
                <Text strong>入射角度 {index + 1}:</Text>
              </Col>
              <Col span={6}>
                <Text>入射: ({testCase.incident.x.toFixed(3)}, {testCase.incident.y.toFixed(3)}, {testCase.incident.z.toFixed(3)})</Text>
              </Col>
              <Col span={6}>
                <Text>折射: ({testCase.refracted.x.toFixed(3)}, {testCase.refracted.y.toFixed(3)}, {testCase.refracted.z.toFixed(3)})</Text>
              </Col>
              <Col span={6}>
                {testCase.totalInternalReflection && <Tag color="orange">全内反射</Tag>}
              </Col>
            </Row>
          </Card>
        ))}
      </div>
      {refractionTest.issues.length > 0 && (
        <Alert
          type="error"
          message="折射计算问题"
          description={
            <ul>
              {refractionTest.issues.map((issue: string, index: number) => (
                <li key={index}>{issue}</li>
              ))}
            </ul>
          }
        />
      )}
    </div>
  );

  const renderIntensityTest = (intensityTest: any) => (
    <div>
      <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
        {intensityTest.testResults.map((result: any, index: number) => (
          <Card key={index} size="small" style={{ marginBottom: 8 }}>
            <Row gutter={8}>
              <Col span={6}>
                <Statistic title="原始面积" value={result.oldArea} precision={3} />
              </Col>
              <Col span={6}>
                <Statistic title="新面积" value={result.newArea} precision={3} />
              </Col>
              <Col span={6}>
                <Statistic title="比率" value={result.ratio} precision={2} />
              </Col>
              <Col span={6}>
                <Statistic 
                  title="强度" 
                  value={result.intensity} 
                  precision={1}
                  valueStyle={{ color: result.intensity > 100 ? '#ff4d4f' : '#52c41a' }}
                />
              </Col>
            </Row>
          </Card>
        ))}
      </div>
      {intensityTest.issues.length > 0 && (
        <Alert
          type="warning"
          message="强度计算问题"
          description={
            <ul>
              {intensityTest.issues.map((issue: string, index: number) => (
                <li key={index}>{issue}</li>
              ))}
            </ul>
          }
        />
      )}
    </div>
  );

  const renderPatternTest = (patternTest: any) => (
    <div>
      <Paragraph>
        <Text strong>测试图案:</Text> {patternTest.description}
      </Paragraph>
      <Paragraph>
        <Text>尺寸: {patternTest.pattern.length} × {patternTest.pattern[0]?.length || 0}</Text>
      </Paragraph>
    </div>
  );

  const renderTextureTest = (textureTest: any) => (
    <div>
      <Row gutter={16}>
        <Col span={12}>
          <Paragraph>
            <Text strong>纹理状态:</Text> {textureTest.texture ? '✅ 成功创建' : '❌ 创建失败'}
          </Paragraph>
          {testCanvas && (
            <div>
              <Text strong>测试纹理预览:</Text>
              <div style={{ marginTop: 8, border: '1px solid #d9d9d9', padding: 8, borderRadius: 4 }}>
                <canvas 
                  ref={(canvas) => {
                    if (canvas && testCanvas) {
                      const ctx = canvas.getContext('2d');
                      if (ctx) {
                        canvas.width = testCanvas.width;
                        canvas.height = testCanvas.height;
                        ctx.drawImage(testCanvas, 0, 0);
                      }
                    }
                  }}
                  style={{ maxWidth: '200px', maxHeight: '200px', imageRendering: 'pixelated' }}
                />
              </div>
            </div>
          )}
        </Col>
        <Col span={12}>
          {textureTest.issues.length > 0 && (
            <Alert
              type="error"
              message="纹理生成问题"
              description={
                <ul>
                  {textureTest.issues.map((issue: string, index: number) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              }
            />
          )}
        </Col>
      </Row>
    </div>
  );

  return (
    <Card 
      title="焦散渲染完整诊断"
      extra={
        <Button 
          type="primary" 
          icon={<PlayCircleOutlined />}
          onClick={runDiagnostics}
          loading={isRunning}
          disabled={isRunning}
        >
          {isRunning ? '诊断中...' : '运行完整诊断'}
        </Button>
      }
    >
          {!results && (
            <Alert
              type="info"
              message="点击'运行诊断'开始系统性测试焦散渲染问题"
              description="这将测试光源位置、折射计算、强度计算、纹理生成等关键环节"
            />
          )}
          
          {results && (
            <div>
              {/* 总体状态 */}
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={8}>
                  <Statistic
                    title="发现的问题"
                    value={results.overallIssues.length}
                    valueStyle={{ color: results.overallIssues.length > 0 ? '#ff4d4f' : '#52c41a' }}
                    prefix={results.overallIssues.length > 0 ? <ExclamationCircleOutlined /> : <CheckCircleOutlined />}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="建议数量"
                    value={results.recommendations.length}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="测试状态"
                    value={results.overallIssues.length === 0 ? "通过" : "需要修复"}
                    valueStyle={{ color: results.overallIssues.length === 0 ? '#52c41a' : '#ff4d4f' }}
                  />
                </Col>
              </Row>

              {/* 建议 */}
              {results.recommendations.length > 0 && (
                <Alert
                  type="info"
                  message="修复建议"
                  description={
                    <ul>
                      {results.recommendations.map((rec, index) => (
                        <li key={index}>{rec}</li>
                      ))}
                    </ul>
                  }
                  style={{ marginBottom: 16 }}
                />
              )}

              {/* 详细测试结果 */}
              <Collapse>
                <Panel 
                  header={`空间关系测试 ${results.spatialTest.issues.length > 0 ? '❌' : '✅'}`} 
                  key="spatial"
                >
                  {renderSpatialTest(results.spatialTest)}
                </Panel>
                
                <Panel 
                  header={`折射计算测试 ${results.refractionTest.issues.length > 0 ? '❌' : '✅'}`} 
                  key="refraction"
                >
                  {renderRefractionTest(results.refractionTest)}
                </Panel>
                
                <Panel 
                  header={`强度计算测试 ${results.intensityTest.issues.length > 0 ? '❌' : '✅'}`} 
                  key="intensity"
                >
                  {renderIntensityTest(results.intensityTest)}
                </Panel>
                
                <Panel 
                  header={`图案测试 ✅`} 
                  key="pattern"
                >
                  {renderPatternTest(results.patternTest)}
                </Panel>
                
                <Panel 
                  header={`纹理生成测试 ${results.textureTest.issues.length > 0 ? '❌' : '✅'}`} 
                  key="texture"
                >
                  {renderTextureTest(results.textureTest)}
                </Panel>
              </Collapse>
            </div>
          )}
    </Card>
  );
};

export default CausticTestPanel;