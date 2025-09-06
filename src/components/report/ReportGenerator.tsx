import React, { useState } from 'react';
import { Card, Button, Space, Typography, Progress, message, Descriptions } from 'antd';
import { FileTextOutlined, DownloadOutlined } from '@ant-design/icons';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, BarElement } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { useProjectStore } from '../../stores/projectStore';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const { Text } = Typography;

export const ReportGenerator: React.FC = () => {
  const { geometry, parameters, currentImage } = useProjectStore();
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  const generateAnalysisData = () => {
    if (!geometry) return null;

    // 分析几何数据
    const vertices = geometry.vertices;
    const faces = geometry.faces;
    
    // 计算高度分布
    const heights = vertices.map(v => v.z);
    const minHeight = Math.min(...heights);
    const maxHeight = Math.max(...heights);
    const avgHeight = heights.reduce((sum, h) => sum + h, 0) / heights.length;
    
    // 创建高度分布直方图数据
    const bins = 20;
    const binSize = (maxHeight - minHeight) / bins;
    const histogram = new Array(bins).fill(0);
    
    heights.forEach(height => {
      const binIndex = Math.min(Math.floor((height - minHeight) / binSize), bins - 1);
      histogram[binIndex]++;
    });
    
    // 计算表面积和体积
    let surfaceArea = 0;
    faces.forEach(face => {
      const v1 = vertices[face[0]];
      const v2 = vertices[face[1]];
      const v3 = vertices[face[2]];
      
      const edge1 = { x: v2.x - v1.x, y: v2.y - v1.y, z: v2.z - v1.z };
      const edge2 = { x: v3.x - v1.x, y: v3.y - v1.y, z: v3.z - v1.z };
      
      const cross = {
        x: edge1.y * edge2.z - edge1.z * edge2.y,
        y: edge1.z * edge2.x - edge1.x * edge2.z,
        z: edge1.x * edge2.y - edge1.y * edge2.x
      };
      
      const area = 0.5 * Math.sqrt(cross.x * cross.x + cross.y * cross.y + cross.z * cross.z);
      surfaceArea += area;
    });
    
    return {
      vertexCount: vertices.length,
      faceCount: faces.length,
      minHeight,
      maxHeight,
      avgHeight,
      surfaceArea,
      histogram,
      binLabels: Array.from({ length: bins }, (_, i) => 
        (minHeight + i * binSize).toFixed(2)
      )
    };
  };

  const generatePDF = async () => {
    if (!geometry || !currentImage) {
      message.error('缺少必要数据，无法生成报告');
      return;
    }

    setGenerating(true);
    setProgress(0);

    try {
      const analysisData = generateAnalysisData();
      if (!analysisData) throw new Error('分析数据生成失败');

      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      setProgress(20);

      // 标题页
      pdf.setFontSize(24);
      pdf.text('焦散透镜技术报告', pageWidth / 2, 30, { align: 'center' });
      
      pdf.setFontSize(12);
      pdf.text(`生成时间: ${new Date().toLocaleString()}`, pageWidth / 2, 45, { align: 'center' });
      pdf.text(`源图片: ${currentImage.name}`, pageWidth / 2, 55, { align: 'center' });
      
      setProgress(40);

      // 参数信息
      let yPos = 80;
      pdf.setFontSize(16);
      pdf.text('设计参数', 20, yPos);
      yPos += 15;
      
      pdf.setFontSize(12);
      const paramTexts = [
        `目标距离: ${parameters.targetDistance} mm`,
        `透镜厚度: ${parameters.lensThickness} mm`,
        `折射率: ${parameters.refractiveIndex}`,
        `网格分辨率: ${parameters.resolution} × ${parameters.resolution}`,
        `平滑因子: ${parameters.smoothingFactor}`
      ];
      
      paramTexts.forEach(text => {
        pdf.text(text, 25, yPos);
        yPos += 10;
      });
      
      setProgress(60);

      // 几何分析
      yPos += 10;
      pdf.setFontSize(16);
      pdf.text('几何分析', 20, yPos);
      yPos += 15;
      
      pdf.setFontSize(12);
      const analysisTexts = [
        `顶点数量: ${analysisData.vertexCount}`,
        `面数量: ${analysisData.faceCount}`,
        `最小高度: ${analysisData.minHeight.toFixed(3)} mm`,
        `最大高度: ${analysisData.maxHeight.toFixed(3)} mm`,
        `平均高度: ${analysisData.avgHeight.toFixed(3)} mm`,
        `表面积: ${analysisData.surfaceArea.toFixed(3)} mm²`
      ];
      
      analysisTexts.forEach(text => {
        pdf.text(text, 25, yPos);
        yPos += 10;
      });
      
      setProgress(80);

      // 新页面 - 制造建议
      pdf.addPage();
      yPos = 30;
      
      pdf.setFontSize(16);
      pdf.text('制造建议', 20, yPos);
      yPos += 15;
      
      pdf.setFontSize(12);
      const manufacturingTexts = [
        '3D打印建议:',
        '• 推荐使用透明树脂材料',
        '• 层高设置: 0.1-0.2mm',
        '• 打印速度: 慢速以确保精度',
        '• 后处理: 打磨和抛光以提高透明度',
        '',
        '质量控制:',
        '• 检查表面光滑度',
        '• 测量关键尺寸',
        '• 验证光学性能',
        '',
        '使用注意事项:',
        '• 避免划伤表面',
        '• 定期清洁以保持光学性能',
        '• 存放在干燥环境中'
      ];
      
      manufacturingTexts.forEach(text => {
        if (text === '') {
          yPos += 5;
        } else {
          pdf.text(text, 25, yPos);
          yPos += 8;
        }
      });
      
      setProgress(100);

      // 保存PDF
      const pdfBlob = pdf.output('blob');
      saveAs(pdfBlob, `caustic_lens_report_${Date.now()}.pdf`);
      
      message.success('技术报告生成成功！');
    } catch (error) {
      console.error('Report generation failed:', error);
      message.error('报告生成失败，请重试');
    } finally {
      setGenerating(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const analysisData = generateAnalysisData();

  if (!geometry || !analysisData) return null;

  // 图表数据
  const heightDistributionData = {
    labels: analysisData.binLabels,
    datasets: [
      {
        label: '高度分布',
        data: analysisData.histogram,
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: '透镜表面高度分布',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: '频次',
        },
      },
      x: {
        title: {
          display: true,
          text: '高度 (mm)',
        },
      },
    },
  };

  return (
    <Card 
      title={
        <Space>
          <FileTextOutlined />
          <span>技术报告</span>
        </Space>
      } 
      size="small"
    >
      <div className="space-y-4">
        {/* 几何统计 */}
        <Descriptions size="small" column={2} bordered>
          <Descriptions.Item label="顶点数">{analysisData.vertexCount}</Descriptions.Item>
          <Descriptions.Item label="面数">{analysisData.faceCount}</Descriptions.Item>
          <Descriptions.Item label="最小高度">{analysisData.minHeight.toFixed(3)} mm</Descriptions.Item>
          <Descriptions.Item label="最大高度">{analysisData.maxHeight.toFixed(3)} mm</Descriptions.Item>
          <Descriptions.Item label="平均高度">{analysisData.avgHeight.toFixed(3)} mm</Descriptions.Item>
          <Descriptions.Item label="表面积">{analysisData.surfaceArea.toFixed(3)} mm²</Descriptions.Item>
        </Descriptions>

        {/* 高度分布图表 */}
        <div className="h-64">
          <Bar data={heightDistributionData} options={chartOptions} />
        </div>

        {progress > 0 && (
          <Progress 
            percent={progress} 
            size="small" 
            status={progress === 100 ? 'success' : 'active'}
          />
        )}

        <Button
          type="primary"
          block
          icon={<DownloadOutlined />}
          onClick={generatePDF}
          loading={generating}
        >
          生成技术报告 (PDF)
        </Button>

        <Text className="text-xs text-gray-500">
          报告包含设计参数、几何分析、制造建议等详细信息
        </Text>
      </div>
    </Card>
  );
};