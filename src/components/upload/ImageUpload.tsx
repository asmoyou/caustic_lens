import React, { useState } from 'react';
import { Upload, Button, Card, Typography, Progress, message } from 'antd';
import { UploadOutlined, DeleteOutlined, PlayCircleOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import { useProjectStore } from '../../stores/projectStore';
import { ImageProcessor } from '../../algorithms/imageProcessing';
import { CausticEngine } from '../../algorithms/causticEngine';
import { ImageData } from '../../types';

const { Text } = Typography;

export const ImageUpload: React.FC = () => {
  const { currentImage, setImage, setGeometry, setProcessing, setError, parameters, isProcessing } = useProjectStore();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [progress, setProgress] = useState(0);

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
      console.log('开始处理图像...');

      // 处理图像
      const processor = new ImageProcessor();
      const processingResult = await processor.processImage(currentImage);
      console.log('图像处理完成:', processingResult);
      setProgress(50);

      // 生成透镜几何
      const causticEngine = new CausticEngine(parameters);
      console.log('开始生成透镜几何...');
      const geometry = causticEngine.generateLensGeometry(processingResult.targetShape);
      console.log('透镜几何生成完成:', geometry);
      setProgress(75);

      setGeometry(geometry);
      setProgress(100);

      message.success('焦散透镜计算完成！');
    } catch (error) {
      console.error('Image processing failed:', error);
      setError(error instanceof Error ? error.message : '图片处理失败');
      message.error('图片处理失败，请重试');
    } finally {
      setProcessing(false);
      setTimeout(() => setProgress(0), 1000);
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
              className="border-2 border-solid border-gray-300 rounded-lg overflow-hidden cursor-pointer hover:border-blue-500 transition-all"
              onClick={() => {
                 setFileList([]);
                 useProjectStore.getState().reset();
               }}
            >
              <img 
                src={currentImage.url} 
                alt={currentImage.name}
                className="w-full max-h-48 object-contain"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all flex items-center justify-center">
                <div className="text-white opacity-0 hover:opacity-100 transition-opacity">
                  <UploadOutlined className="text-2xl mb-2" />
                  <div>点击更换图片</div>
                </div>
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-600">
              {currentImage.name} ({(currentImage.size / 1024 / 1024).toFixed(2)} MB)
            </div>
          </div>
        )}

        {progress > 0 && (
          <div>
            <Text className="text-sm text-gray-600">处理进度</Text>
            <Progress 
              percent={progress} 
              size="small" 
              status={progress === 100 ? 'success' : 'active'}
            />
          </div>
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
                  icon={<PlayCircleOutlined />} 
                  onClick={handleProcess}
                  loading={isProcessing}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? '计算中...' : '开始计算'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};