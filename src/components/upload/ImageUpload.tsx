import React, { useState, useEffect } from 'react';
import { Upload, Button, Card, Typography, Progress, message, Row, Col } from 'antd';
import { UploadOutlined, DeleteOutlined, PlayCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import { useProjectStore } from '../../stores/projectStore';
import { ImageProcessor } from '../../algorithms/imageProcessing';
import { CausticEngine } from '../../algorithms/causticEngine';
import { ImageData } from '../../types';
import { EnhancedProgressDisplay } from '../progress/EnhancedProgressDisplay';

const { Text } = Typography;

export const ImageUpload: React.FC = () => {
  const { 
    currentImage, 
    setImage, 
    setGeometry, 
    setTargetShape, 
    setProcessing, 
    setError, 
    parameters, 
    isProcessing, 
    geometry, 
    progressDetails,
    setProgressDetails,
    iterationImages,
    addIterationImage,
    clearIterationImages
  } = useProjectStore();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [progress, setProgress] = useState(0);

  // 监听迭代图像生成事件
  useEffect(() => {
    const handleIterationImage = (event: CustomEvent) => {
      const { imageData } = event.detail;
      addIterationImage(imageData);
    };

    window.addEventListener('iterationImageGenerated', handleIterationImage as EventListener);
    
    return () => {
      window.removeEventListener('iterationImageGenerated', handleIterationImage as EventListener);
    };
  }, [addIterationImage]);

  const handleUpload: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess, onError } = options;
    
    try {
      // 只负责上传图片，不进行处理
      const url = URL.createObjectURL(file as File);
      const imageData: ImageData = {
        file: file as File,
        url,
        name: (file as File).name,
        size: (file as File).size,
      };

      setImage(imageData);
      message.success('图片上传成功！点击"开始计算"按钮进行处理');
      onSuccess?.(null);
    } catch (error) {
      console.error('Image upload failed:', error);
      setError(error instanceof Error ? error.message : '图片上传失败');
      message.error('图片上传失败，请重试');
      onError?.(error as Error);
    }
  };

  const handleProcess = async () => {
    if (!currentImage) {
      message.warning('请先上传图片');
      return;
    }

    try {
      setProcessing(true);
      setError(null);
      setProgress(0);
      clearIterationImages(); // 清空之前的迭代图像
      console.log('开始处理图像...');

      // 处理图像
      const processor = new ImageProcessor();
      const processingResult = await processor.processImage(currentImage);
      console.log('图像处理完成:', processingResult);
      setProgress(30);

      // 保存目标形状数据
      setTargetShape(processingResult.targetShape);

      // 生成透镜几何 - 添加进度回调
      const causticEngine = new CausticEngine(parameters);
      console.log('开始生成透镜几何...');
      
      const startTime = Date.now();
      let lastProgressTime = startTime;
      
      const geometry = await causticEngine.generateLensGeometry(
        processingResult.targetShape,
        (algorithmProgress: number, status: string) => {
          // 限制算法进度在0-100范围内
          const clampedProgress = Math.min(Math.max(algorithmProgress, 0), 100);
          
          // 将算法进度映射到总进度的30%-95%区间
          const totalProgress = 30 + (clampedProgress / 100) * 65;
          setProgress(Math.round(totalProgress));
          
          // 计算时间估算
          const currentTime = Date.now();
          const elapsed = currentTime - startTime; // 毫秒
          const progressRate = clampedProgress / 100;
          
          let timeEstimate = '';
          if (progressRate > 0.05) { // 至少5%进度才估算时间
            const estimatedTotal = elapsed / progressRate;
            const remaining = estimatedTotal - elapsed;
            
            if (remaining > 60000) {
              timeEstimate = ` (预计还需 ${Math.ceil(remaining / 60000)} 分钟)`;
            } else if (remaining > 10000) {
              timeEstimate = ` (预计还需 ${Math.ceil(remaining / 1000)} 秒)`;
            }
          }
          
          // 更新进度详情 - 修复迭代显示逻辑
          const currentIteration = Math.min(Math.floor(clampedProgress / 25) + 1, 4); // 确保不超过4
          setProgressDetails({
            iteration: currentIteration,
            totalIterations: 4,
            phase: status,
            elapsedTime: elapsed,
            estimatedTimeRemaining: progressRate > 0.05 ? elapsed / progressRate - elapsed : undefined,
            converged: clampedProgress >= 100
          });
          
          console.log(`算法进度: ${algorithmProgress}% - ${status}${timeEstimate}`);
          lastProgressTime = currentTime;
        },
        {
          useGPUAcceleration: parameters.optimization?.useGPUAcceleration ?? true,
          photonMapSize: parameters.optimization?.photonMapSize || Math.min(parameters.resolution || 128, 256)
        }
      );
      
      console.log('透镜几何生成完成:', geometry);
      setProgress(95);

      setGeometry(geometry);
      setProgress(100);
      
      // 确保最终状态显示正确的时间信息
      const finalElapsed = Date.now() - startTime;
      setProgressDetails(prev => ({
        ...prev,
        iteration: 4,
        totalIterations: 4,
        phase: '算法完成',
        elapsedTime: finalElapsed,
        estimatedTimeRemaining: 0,
        converged: true
      }));

      message.success('焦散透镜计算完成！');
    } catch (error) {
      console.error('Image processing failed:', error);
      setError(error instanceof Error ? error.message : '图片处理失败');
      message.error('图片处理失败，请重试');
      // 只有在出错时才重置进度
      setProgress(0);
      setProgressDetails(undefined);
    } finally {
      setProcessing(false);
      // 移除自动重置进度的逻辑，让成功完成的进度保持显示
    }
  };

  const handleRemove = () => {
    setFileList([]);
    useProjectStore.getState().reset();
    message.info('已清除图片');
  };

  const beforeUpload = (file: File) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('只能上传图片文件！');
      return false;
    }

    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error('图片大小不能超过 10MB！');
      return false;
    }

    return true;
  };

  const uploadProps: UploadProps = {
    name: 'image',
    fileList,
    customRequest: handleUpload,
    beforeUpload,
    onChange: ({ fileList: newFileList }) => setFileList(newFileList),
    onRemove: handleRemove,
    maxCount: 1,
    accept: 'image/*',
  };

  return (
    <Card title="图片上传" size="small">
      <div className="space-y-4">
        {!currentImage ? (
          <Upload.Dragger {...uploadProps} style={{ border: '2px dashed #d9d9d9', borderRadius: '8px' }}>
            <div className="p-4">
              <UploadOutlined className="text-2xl text-blue-500 mb-2" />
              <div className="text-sm">
                <Text>点击或拖拽图片到此区域上传</Text>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                支持 JPG、PNG、GIF 格式，最大 10MB
              </div>
            </div>
          </Upload.Dragger>
        ) : (
          <div className="relative">
            <div 
              className="border-2 border-solid border-gray-300 rounded-lg overflow-hidden"
              style={{
                maxHeight: '350px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <img 
                src={currentImage.url} 
                alt={currentImage.name}
                style={{
                  width: '100%',
                  height: 'auto',
                  maxHeight: '300px',
                  maxWidth: '100%',
                  objectFit: 'contain',
                  display: 'block'
                }}
              />
            </div>
            <div className="mt-2 text-sm text-gray-600">
              {currentImage.name} ({(currentImage.size / 1024 / 1024).toFixed(2)} MB)
            </div>
          </div>
        )}

        {/* 使用增强的进度显示组件 */}
        <EnhancedProgressDisplay
          progress={progress}
          progressDetails={progressDetails}
          title="透镜生成进度"
          showPerformanceMetrics={true}
        />

        {/* 迭代过程图像显示 */}
        {iterationImages.length > 0 && (
          <Card title="迭代过程可视化" size="small" className="mt-4">
            <div className="text-sm text-gray-600 mb-3">
              共生成 {iterationImages.length} 张迭代图像
            </div>
            <Row gutter={[8, 8]}>
              {iterationImages.map((imageData, index) => (
                <Col key={index} xs={12} sm={8} md={6}>
                  <div className="border border-gray-200 rounded p-2">
                    <img 
                      src={imageData} 
                      alt={`迭代 ${index + 1}`}
                      style={{
                        width: '100%',
                        height: 'auto',
                        maxHeight: '120px',
                        objectFit: 'contain'
                      }}
                    />
                    <div className="text-xs text-center mt-1 text-gray-500">
                      迭代 {index + 1}
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          </Card>
        )}

        {fileList.length > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Text className="text-sm text-gray-600">
                {fileList[0].name}
              </Text>
              <Button 
                type="text" 
                size="small" 
                icon={<DeleteOutlined />} 
                onClick={handleRemove}
                danger
              >
                清除
              </Button>
            </div>
            
            {currentImage && (
              <div className="flex gap-2">
                <Button 
                  type="primary" 
                  icon={geometry ? <ReloadOutlined /> : <PlayCircleOutlined />} 
                  onClick={handleProcess}
                  loading={isProcessing}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? '计算中...' : (geometry ? '重新计算' : '开始计算')}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};