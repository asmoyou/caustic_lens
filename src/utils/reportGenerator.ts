import type { LensGeometry, ImageData, CausticParameters } from '../types';
import { validateGeometry } from './geometry';

// 报告数据接口
export interface ReportData {
  projectName: string;
  generatedAt: Date;
  image: ImageData;
  geometry: LensGeometry;
  parameters: CausticParameters;
  statistics: {
    vertexCount: number;
    faceCount: number;
    surfaceArea: number;
    volume: number;
    processingTime: number;
  };
}

// HTML报告生成器
export class HTMLReportGenerator {
  static generate(data: ReportData): string {
    const { generatedAt, parameters, statistics } = data;
    const projectName = escapeHTML(data.projectName);
    const image = { ...data.image, name: escapeHTML(data.image.name), url: escapeHTML(data.image.url) };
    const dimensions = GeometryAnalyzer.getBoundingBox(data.geometry).size;
    
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>焦散透镜设计报告 - ${projectName}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Microsoft YaHei', 'SimSun', sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: white;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        
        .header {
            text-align: center;
            border-bottom: 3px solid #1890ff;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        
        .header h1 {
            color: #1890ff;
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .header .subtitle {
            color: #666;
            font-size: 1.2em;
        }
        
        .meta-info {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 30px;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }
        
        .meta-item {
            display: flex;
            align-items: center;
        }
        
        .meta-label {
            font-weight: bold;
            color: #1890ff;
            margin-right: 10px;
        }
        
        .section {
            margin-bottom: 40px;
        }
        
        .section-title {
            font-size: 1.8em;
            color: #1890ff;
            border-left: 4px solid #1890ff;
            padding-left: 15px;
            margin-bottom: 20px;
        }
        
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }
        
        .card {
            background: #fff;
            border: 1px solid #e8e8e8;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .card-title {
            font-size: 1.3em;
            color: #333;
            margin-bottom: 15px;
            font-weight: bold;
        }
        
        .param-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
        }
        
        .param-item {
            text-align: center;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 6px;
        }
        
        .param-value {
            font-size: 1.5em;
            font-weight: bold;
            color: #1890ff;
            margin-bottom: 5px;
        }
        
        .param-label {
            font-size: 0.9em;
            color: #666;
        }
        
        .image-preview {
            text-align: center;
            margin: 20px 0;
        }
        
        .image-preview img {
            max-width: 100%;
            max-height: 300px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .stats-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        
        .stats-table th,
        .stats-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e8e8e8;
        }
        
        .stats-table th {
            background: #f8f9fa;
            font-weight: bold;
            color: #1890ff;
        }
        
        .highlight {
            background: linear-gradient(120deg, #a8edea 0%, #fed6e3 100%);
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: bold;
        }
        
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e8e8e8;
            color: #666;
            font-size: 0.9em;
        }
        
        @media print {
            body {
                background: white;
            }
            
            .container {
                box-shadow: none;
                max-width: none;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>焦散透镜设计报告</h1>
            <div class="subtitle">Caustic Lens Design Report</div>
        </div>
        
        <div class="meta-info">
            <div class="meta-item">
                <span class="meta-label">项目名称:</span>
                <span>${projectName}</span>
            </div>
            <div class="meta-item">
                <span class="meta-label">生成时间:</span>
                <span>${generatedAt.toLocaleString('zh-CN')}</span>
            </div>
            <div class="meta-item">
                <span class="meta-label">源图像:</span>
                <span>${image.name}</span>
            </div>
            <div class="meta-item">
                <span class="meta-label">图像尺寸:</span>
                <span>${image.width} × ${image.height} px</span>
            </div>
        </div>
        
        <div class="section">
            <h2 class="section-title">📷 源图像</h2>
            <div class="card">
                <div class="image-preview">
                    <img src="${image.url}" alt="源图像" />
                    <p style="margin-top: 10px; color: #666;">源图像: ${image.name}</p>
                </div>
            </div>
        </div>
        
        <div class="section">
            <h2 class="section-title">⚙️ 设计参数</h2>
            <div class="card">
                <div class="param-grid">
                    <div class="param-item">
                        <div class="param-value">${dimensions.x.toFixed(2)}</div>
                        <div class="param-label">透镜宽度 (mm)</div>
                    </div>
                    <div class="param-item">
                        <div class="param-value">${dimensions.y.toFixed(2)}</div>
                        <div class="param-label">透镜高度 (mm)</div>
                    </div>
                    <div class="param-item">
                        <div class="param-value">${dimensions.z.toFixed(3)}</div>
                        <div class="param-label">厚度 (mm)</div>
                    </div>
                    <div class="param-item">
                        <div class="param-value">${parameters.focalLengthMeters.toFixed(2)}</div>
                        <div class="param-label">算法焦距 (m)</div>
                    </div>
                    <div class="param-item">
                        <div class="param-value">${(parameters.refractiveIndex || 1.49).toFixed(3)}</div>
                        <div class="param-label">折射率</div>
                    </div>
                    <div class="param-item">
                        <div class="param-value">${parameters.resolution || 0}</div>
                        <div class="param-label">分辨率</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="section">
            <h2 class="section-title">🔬 计算参数</h2>
            <div class="card">
                <div class="param-grid">
                    <div class="param-item">
                        <div class="param-value">${(parameters.resolution ** 2).toLocaleString()}</div>
                        <div class="param-label">目标网格单元</div>
                    </div>
                    <div class="param-item">
                        <div class="param-value">${(parameters.optimization.tolerance ?? 0.00001).toExponential(2)}</div>
                        <div class="param-label">收敛阈值</div>
                    </div>
                    <div class="param-item">
                        <div class="param-value">${parameters.optimization.iterations ?? 4}</div>
                        <div class="param-label">迭代次数</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="section">
            <h2 class="section-title">📊 模型统计</h2>
            <div class="card">
                <table class="stats-table">
                    <thead>
                        <tr>
                            <th>属性</th>
                            <th>数值</th>
                            <th>单位</th>
                            <th>说明</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>顶点数量</td>
                            <td class="highlight">${statistics.vertexCount.toLocaleString()}</td>
                            <td>个</td>
                            <td>3D模型的顶点总数</td>
                        </tr>
                        <tr>
                            <td>面片数量</td>
                            <td class="highlight">${statistics.faceCount.toLocaleString()}</td>
                            <td>个</td>
                            <td>3D模型的三角面片总数</td>
                        </tr>
                        <tr>
                            <td>表面积</td>
                            <td class="highlight">${(statistics.surfaceArea || 0).toFixed(2)}</td>
                            <td>mm²</td>
                            <td>透镜表面的总面积</td>
                        </tr>
                        <tr>
                            <td>体积</td>
                            <td class="highlight">${(statistics.volume || 0).toFixed(3)}</td>
                            <td>mm³</td>
                            <td>透镜的总体积</td>
                        </tr>
                        <tr>
                            <td>处理时间</td>
                            <td class="highlight">${(statistics.processingTime || 0).toFixed(2)}</td>
                            <td>秒</td>
                            <td>从图像到3D模型的计算时间</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
        
        <div class="section">
            <h2 class="section-title">🔍 技术说明</h2>
            <div class="grid">
                <div class="card">
                    <div class="card-title">算法原理</div>
                    <p>本系统采用逆向光线追踪算法，通过分析目标图像的亮度分布，计算出能够产生相应焦散图案的透镜表面形状。算法包括以下步骤：</p>
                    <ul style="margin-top: 10px; padding-left: 20px;">
                        <li>图像预处理和边缘检测</li>
                        <li>光线追踪和折射计算</li>
                        <li>表面优化和网格生成</li>
                        <li>几何平滑和法向量计算</li>
                    </ul>
                </div>
                
                <div class="card">
                    <div class="card-title">材料建议</div>
                    <p>根据设计参数，推荐使用以下材料制作透镜：</p>
                    <ul style="margin-top: 10px; padding-left: 20px;">
                        <li><strong>PMMA (亚克力):</strong> 透明度高，易加工</li>
                        <li><strong>PC (聚碳酸酯):</strong> 强度高，耐冲击</li>
                        <li><strong>光学玻璃:</strong> 光学性能最佳</li>
                        <li><strong>透明树脂:</strong> 适合3D打印</li>
                    </ul>
                </div>
                
                <div class="card">
                    <div class="card-title">制造工艺</div>
                    <p>可采用以下工艺制造透镜：</p>
                    <ul style="margin-top: 10px; padding-left: 20px;">
                        <li><strong>CNC加工:</strong> 精度高，适合小批量</li>
                        <li><strong>3D打印:</strong> 快速原型，复杂形状</li>
                        <li><strong>注塑成型:</strong> 大批量生产</li>
                        <li><strong>热压成型:</strong> 适合薄片透镜</li>
                    </ul>
                </div>
                
                <div class="card">
                    <div class="card-title">应用场景</div>
                    <p>焦散透镜可应用于：</p>
                    <ul style="margin-top: 10px; padding-left: 20px;">
                        <li><strong>艺术装置:</strong> 光影艺术创作</li>
                        <li><strong>建筑照明:</strong> 装饰性照明效果</li>
                        <li><strong>教学演示:</strong> 光学原理展示</li>
                        <li><strong>产品设计:</strong> 创新光学产品</li>
                    </ul>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <p>本报告由 <strong>Caustic Lens Designer</strong> 自动生成</p>
            <p>生成时间: ${generatedAt.toLocaleString('zh-CN')}</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  static download(data: ReportData, filename: string = 'caustic-lens-report.html'): void {
    const htmlContent = this.generate(data);
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

// 统计计算工具
export class GeometryAnalyzer {
  static calculateSurfaceArea(geometry: LensGeometry): number {
    let totalArea = 0;
    
    for (const face of geometry.faces) {
      const v1 = geometry.vertices[face[0]];
      const v2 = geometry.vertices[face[1]];
      const v3 = geometry.vertices[face[2]];
      
      // 计算三角形面积
      const a = Math.sqrt(
        Math.pow(v2.x - v1.x, 2) + 
        Math.pow(v2.y - v1.y, 2) + 
        Math.pow(v2.z - v1.z, 2)
      );
      const b = Math.sqrt(
        Math.pow(v3.x - v2.x, 2) + 
        Math.pow(v3.y - v2.y, 2) + 
        Math.pow(v3.z - v2.z, 2)
      );
      const c = Math.sqrt(
        Math.pow(v1.x - v3.x, 2) + 
        Math.pow(v1.y - v3.y, 2) + 
        Math.pow(v1.z - v3.z, 2)
      );
      
      // 海伦公式
      const s = (a + b + c) / 2;
      const area = Math.sqrt(s * (s - a) * (s - b) * (s - c));
      
      if (!isNaN(area)) {
        totalArea += area;
      }
    }
    
    return totalArea;
  }

  static calculateVolume(geometry: LensGeometry): number {
    let volume = 0;
    
    // 使用散度定理计算体积
    for (const face of geometry.faces) {
      const v1 = geometry.vertices[face[0]];
      const v2 = geometry.vertices[face[1]];
      const v3 = geometry.vertices[face[2]];
      
      // 计算四面体体积（以原点为顶点）
      const tetraVolume = (
        v1.x * (v2.y * v3.z - v2.z * v3.y) +
        v2.x * (v3.y * v1.z - v3.z * v1.y) +
        v3.x * (v1.y * v2.z - v1.z * v2.y)
      ) / 6;
      
      volume += tetraVolume;
    }
    
    return Math.abs(volume);
  }

  static getBoundingBox(geometry: LensGeometry): {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
    size: { x: number; y: number; z: number };
  } {
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    
    for (const vertex of geometry.vertices) {
      minX = Math.min(minX, vertex.x);
      minY = Math.min(minY, vertex.y);
      minZ = Math.min(minZ, vertex.z);
      maxX = Math.max(maxX, vertex.x);
      maxY = Math.max(maxY, vertex.y);
      maxZ = Math.max(maxZ, vertex.z);
    }
    
    return {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ },
      size: { x: maxX - minX, y: maxY - minY, z: maxZ - minZ }
    };
  }
}

// 报告生成器主类
export class ReportGenerator {
  static async generateReport(
    projectName: string,
    image: ImageData,
    geometry: LensGeometry,
    parameters: ReportData['parameters'],
    processingTime: number
  ): Promise<ReportData> {
    validateGeometry(geometry);
    let blob: Blob;
    if (image.file) {
      blob = image.file;
    } else {
      const response = await fetch(image.url);
      if (!response.ok) throw new Error('源图像读取失败');
      blob = await response.blob();
    }
    if (!/^image\/(png|jpeg|webp|gif)$/.test(blob.type)) throw new Error('报告仅支持光栅图片');
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    const embeddedImage = { ...image, file: undefined, url: `data:${blob.type};base64,${btoa(binary)}` };
    const statistics = {
      vertexCount: geometry.vertices.length,
      faceCount: geometry.faces.length,
      surfaceArea: GeometryAnalyzer.calculateSurfaceArea(geometry),
      volume: GeometryAnalyzer.calculateVolume(geometry),
      processingTime
    };

    return {
      projectName,
      generatedAt: new Date(),
      image: embeddedImage,
      geometry,
      parameters: structuredClone(parameters),
      statistics
    };
  }

  static downloadHTMLReport(reportData: ReportData, filename?: string): void {
    HTMLReportGenerator.download(reportData, filename);
  }

  static getReportHTML(reportData: ReportData): string {
    return HTMLReportGenerator.generate(reportData);
  }
}

function escapeHTML(value: string): string {
  const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return value.replace(/[&<>"']/g, character => entities[character]);
}
