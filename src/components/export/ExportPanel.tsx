import React, { useState } from 'react';
import { Card, Button, Select, Space, Typography, message, Progress } from 'antd';
import { DownloadOutlined, FileOutlined } from '@ant-design/icons';
import { saveAs } from 'file-saver';
import { useProjectStore } from '../../stores/projectStore';
import { LensGeometry } from '../../types';

const { Text } = Typography;
const { Option } = Select;

type ExportFormat = 'stl' | 'obj' | 'gcode' | 'json';

interface ExportOptions {
  format: ExportFormat;
  scale: number;
  units: 'mm' | 'cm' | 'inch';
}

export const ExportPanel: React.FC = () => {
  const { geometry, currentImage } = useProjectStore();
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'stl',
    scale: 1,
    units: 'mm',
  });
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const generateSTL = (geometry: LensGeometry, scale: number): string => {
    let stl = 'solid lens\n';
    
    for (const face of geometry.faces) {
      const v1 = geometry.vertices[face[0]];
      const v2 = geometry.vertices[face[1]];
      const v3 = geometry.vertices[face[2]];
      
      // 计算法向量
      const edge1 = {
        x: (v2.x - v1.x) * scale,
        y: (v2.y - v1.y) * scale,
        z: (v2.z - v1.z) * scale,
      };
      const edge2 = {
        x: (v3.x - v1.x) * scale,
        y: (v3.y - v1.y) * scale,
        z: (v3.z - v1.z) * scale,
      };
      
      const normal = {
        x: edge1.y * edge2.z - edge1.z * edge2.y,
        y: edge1.z * edge2.x - edge1.x * edge2.z,
        z: edge1.x * edge2.y - edge1.y * edge2.x,
      };
      
      const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
      if (length > 0) {
        normal.x /= length;
        normal.y /= length;
        normal.z /= length;
      }
      
      stl += `  facet normal ${normal.x.toFixed(6)} ${normal.y.toFixed(6)} ${normal.z.toFixed(6)}\n`;
      stl += '    outer loop\n';
      stl += `      vertex ${(v1.x * scale).toFixed(6)} ${(v1.y * scale).toFixed(6)} ${(v1.z * scale).toFixed(6)}\n`;
      stl += `      vertex ${(v2.x * scale).toFixed(6)} ${(v2.y * scale).toFixed(6)} ${(v2.z * scale).toFixed(6)}\n`;
      stl += `      vertex ${(v3.x * scale).toFixed(6)} ${(v3.y * scale).toFixed(6)} ${(v3.z * scale).toFixed(6)}\n`;
      stl += '    endloop\n';
      stl += '  endfacet\n';
    }
    
    stl += 'endsolid lens\n';
    return stl;
  };

  const generateOBJ = (geometry: LensGeometry, scale: number): string => {
    let obj = '# Caustic Lens\n';
    obj += `# Generated from ${currentImage?.name || 'image'}\n\n`;
    
    // 顶点
    for (const vertex of geometry.vertices) {
      obj += `v ${(vertex.x * scale).toFixed(6)} ${(vertex.y * scale).toFixed(6)} ${(vertex.z * scale).toFixed(6)}\n`;
    }
    
    obj += '\n';
    
    // UV坐标
    for (const uv of geometry.uvs) {
      obj += `vt ${uv.x.toFixed(6)} ${uv.y.toFixed(6)}\n`;
    }
    
    obj += '\n';
    
    // 法向量
    for (const normal of geometry.normals) {
      obj += `vn ${normal.x.toFixed(6)} ${normal.y.toFixed(6)} ${normal.z.toFixed(6)}\n`;
    }
    
    obj += '\n';
    
    // 面
    for (const face of geometry.faces) {
      const f1 = face[0] + 1; // OBJ索引从1开始
      const f2 = face[1] + 1;
      const f3 = face[2] + 1;
      obj += `f ${f1}/${f1}/${f1} ${f2}/${f2}/${f2} ${f3}/${f3}/${f3}\n`;
    }
    
    return obj;
  };

  const generateGCode = (geometry: LensGeometry, scale: number): string => {
    let gcode = '; Caustic Lens G-Code\n';
    gcode += '; Generated for 3D printing\n\n';
    gcode += 'G21 ; Set units to millimeters\n';
    gcode += 'G90 ; Use absolute positioning\n';
    gcode += 'M82 ; Use absolute distances for extrusion\n';
    gcode += 'G28 ; Home all axes\n\n';
    
    // 简化的G-Code生成（实际应用中需要更复杂的切片算法）
    gcode += '; Start printing\n';
    gcode += 'M104 S200 ; Set extruder temperature\n';
    gcode += 'M140 S60 ; Set bed temperature\n';
    gcode += 'M109 S200 ; Wait for extruder temperature\n';
    gcode += 'M190 S60 ; Wait for bed temperature\n\n';
    
    // 这里应该实现实际的切片算法
    gcode += '; Layer data would be generated here\n';
    gcode += '; This is a simplified example\n\n';
    
    gcode += 'M104 S0 ; Turn off extruder\n';
    gcode += 'M140 S0 ; Turn off bed\n';
    gcode += 'G28 X0 ; Home X axis\n';
    gcode += 'M84 ; Disable steppers\n';
    
    return gcode;
  };

  const generateJSON = (geometry: LensGeometry): string => {
    const data = {
      metadata: {
        type: 'CausticLens',
        version: '1.0',
        generator: 'Caustic Lens Generator',
        sourceImage: currentImage?.name || 'unknown',
        timestamp: new Date().toISOString(),
      },
      geometry,
      parameters: useProjectStore.getState().parameters,
    };
    
    return JSON.stringify(data, null, 2);
  };

  const handleExport = async () => {
    if (!geometry) {
      message.error('没有可导出的几何数据');
      return;
    }

    setExporting(true);
    setProgress(0);

    try {
      let content: string;
      let filename: string;
      let mimeType: string;

      const scaleFactors = {
        mm: 1,
        cm: 0.1,
        inch: 0.0393701,
      };
      
      const scale = exportOptions.scale * scaleFactors[exportOptions.units];
      setProgress(25);

      switch (exportOptions.format) {
        case 'stl':
          content = generateSTL(geometry, scale);
          filename = `lens.stl`;
          mimeType = 'application/octet-stream';
          break;
        case 'obj':
          content = generateOBJ(geometry, scale);
          filename = `lens.obj`;
          mimeType = 'text/plain';
          break;
        case 'gcode':
          content = generateGCode(geometry, scale);
          filename = `lens.gcode`;
          mimeType = 'text/plain';
          break;
        case 'json':
          content = generateJSON(geometry);
          filename = `lens.json`;
          mimeType = 'application/json';
          break;
        default:
          throw new Error('不支持的导出格式');
      }

      setProgress(75);

      const blob = new Blob([content], { type: mimeType });
      saveAs(blob, filename);
      
      setProgress(100);
      message.success(`${exportOptions.format.toUpperCase()} 文件导出成功！`);
    } catch (error) {
      console.error('Export failed:', error);
      message.error('导出失败，请重试');
    } finally {
      setExporting(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  if (!geometry) return null;

  return (
    <Card 
      title={
        <Space>
          <FileOutlined />
          <span>文件导出</span>
        </Space>
      } 
      size="small"
    >
      <div className="space-y-4">
        <div>
          <Text className="text-sm font-medium">导出格式</Text>
          <Select
            value={exportOptions.format}
            onChange={(format) => setExportOptions({ ...exportOptions, format })}
            className="w-full mt-1"
          >
            <Option value="stl">STL (3D打印)</Option>
            <Option value="obj">OBJ (通用3D)</Option>
            <Option value="gcode">G-Code (打印机)</Option>
            <Option value="json">JSON (数据)</Option>
          </Select>
        </div>

        <div>
          <Text className="text-sm font-medium">单位</Text>
          <Select
            value={exportOptions.units}
            onChange={(units) => setExportOptions({ ...exportOptions, units })}
            className="w-full mt-1"
          >
            <Option value="mm">毫米 (mm)</Option>
            <Option value="cm">厘米 (cm)</Option>
            <Option value="inch">英寸 (inch)</Option>
          </Select>
        </div>

        <div>
          <Text className="text-sm font-medium">缩放比例</Text>
          <Select
            value={exportOptions.scale}
            onChange={(scale) => setExportOptions({ ...exportOptions, scale })}
            className="w-full mt-1"
          >
            <Option value={0.1}>0.1x</Option>
            <Option value={0.5}>0.5x</Option>
            <Option value={1}>1x</Option>
            <Option value={2}>2x</Option>
            <Option value={5}>5x</Option>
            <Option value={10}>10x</Option>
          </Select>
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
          onClick={handleExport}
          loading={exporting}
        >
          导出 {exportOptions.format.toUpperCase()} 文件
        </Button>

        <div className="text-xs text-gray-500">
          <div>顶点数: {geometry.vertices.length}</div>
          <div>面数: {geometry.faces.length}</div>
        </div>
      </div>
    </Card>
  );
};