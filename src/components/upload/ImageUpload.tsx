import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Image, Progress, Space, Tooltip, Upload, message } from 'antd';
import { DeleteOutlined, PictureOutlined, PlayCircleOutlined, ReloadOutlined, StopOutlined, UploadOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { useProjectStore } from '../../stores/projectStore';
import { cancelGeneration, startGeneration } from '../../utils/generationJob';

export function ImageUpload() {
  const { currentImage, setImage, clearImage, geometry, isProcessing, progress, progressDetails, error,
    iterationImages } = useProjectStore();
  const [uploading, setUploading] = useState(false);
  const uploadId = useRef(0);
  useEffect(() => () => { uploadId.current++; }, []);

  const loadFile = async (file: File) => {
    const id = ++uploadId.current;
    setUploading(true);
    const url = URL.createObjectURL(file);
    try {
      const img = new window.Image();
      img.src = url;
      await img.decode();
      if (id !== uploadId.current) { URL.revokeObjectURL(url); return; }
      setImage({ file, url, name: file.name, size: file.size, width: img.naturalWidth, height: img.naturalHeight });
    } catch {
      URL.revokeObjectURL(url);
      if (id === uploadId.current) message.error('图片无法解码，请选择有效的图片文件');
    } finally {
      if (id === uploadId.current) setUploading(false);
    }
  };
  const props: UploadProps = {
    accept: 'image/png,image/jpeg,image/webp,image/gif', showUploadList: false, maxCount: 1,
    disabled: isProcessing || uploading,
    beforeUpload: file => {
      if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) {
        message.error('支持 PNG、JPEG、WebP 和 GIF 图片');
      } else if (file.size > 10 * 1024 * 1024) {
        message.error('图片大小不能超过 10 MB');
      } else { void loadFile(file); }
      return Upload.LIST_IGNORE;
    },
  };

  const loadSample = async () => {
    setUploading(true);
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}sample-target.png`);
      if (!response.ok) throw new Error('示例加载失败');
      await loadFile(new File([await response.blob()], 'sample-target.png', { type: 'image/png' }));
    } catch { message.error('示例图片加载失败'); }
    finally { setUploading(false); }
  };

  return <section className="image-panel">
    <div className="panel-heading"><h2>目标图像</h2>
      {currentImage && <Tooltip title="移除图像"><Button aria-label="移除图像" type="text" danger
        icon={<DeleteOutlined />} disabled={isProcessing || uploading} onClick={clearImage} /></Tooltip>}
    </div>
    {currentImage ? <>
      <div className="source-preview"><Image src={currentImage.url} alt={currentImage.name} /></div>
      <div className="file-meta"><strong title={currentImage.name}>{currentImage.name}</strong>
        <span>{currentImage.width} x {currentImage.height} px · {((currentImage.size ?? 0) / 1024).toFixed(0)} KB</span></div>
      <Upload {...props}><Button block icon={<UploadOutlined />} disabled={isProcessing || uploading} loading={uploading}>替换图像</Button></Upload>
    </> : <>
      <Upload.Dragger {...props} className="image-dropzone">
        <PictureOutlined /><p>上传目标图像</p><span>PNG / JPG / WebP / GIF · 10 MB</span>
      </Upload.Dragger>
      <Button className="sample-button" block icon={<PictureOutlined />} onClick={loadSample} loading={uploading}>载入示例图案</Button>
    </>}
    {error && <Alert type="error" showIcon message={error} />}
    {(isProcessing || progress > 0 || progressDetails) && <div className="generation-progress" aria-live="polite">
      <div className="progress-label"><span>{progressDetails?.phase}</span>
        {progressDetails?.elapsedTime !== undefined && <span>{(progressDetails.elapsedTime / 1000).toFixed(1)} s</span>}</div>
      <Progress percent={progress} size="small" status={error ? 'exception' : isProcessing ? 'active' : 'normal'} />
    </div>}
    {currentImage && <Space.Compact block>
      <Button type="primary" block aria-label={isProcessing ? '计算中' : geometry ? '重新计算' : '生成透镜'} icon={geometry ? <ReloadOutlined /> : <PlayCircleOutlined />}
        loading={isProcessing} disabled={uploading} onClick={() => void startGeneration()}>
        {isProcessing ? '计算中' : geometry ? '重新计算' : '生成透镜'}
      </Button>
      {isProcessing && <Tooltip title="取消计算"><Button aria-label="取消计算" icon={<StopOutlined />} onClick={cancelGeneration} /></Tooltip>}
    </Space.Compact>}
    {iterationImages.length > 0 && <div className="iteration-images"><h3>迭代误差</h3>
      <Image.PreviewGroup><div className="iteration-grid">{iterationImages.map((src, index) =>
        <figure key={index}><Image src={src} alt={`迭代 ${index + 1} 误差`} /><figcaption>{index + 1}</figcaption></figure>
      )}</div></Image.PreviewGroup>
    </div>}
  </section>;
}
