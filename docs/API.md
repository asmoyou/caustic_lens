# 📚 API 文档

Caustic Lens Designer 的核心 API 文档，包含所有主要接口、类型定义和使用示例。

## 📋 目录

- [核心算法 API](#核心算法-api)
- [组件 API](#组件-api)
- [状态管理 API](#状态管理-api)
- [类型定义](#类型定义)
- [工具函数 API](#工具函数-api)
- [使用示例](#使用示例)

## 🔬 核心算法 API

### CausticEngine

主要的焦散引擎类，连接图像处理和透镜生成。

```typescript
import { CausticEngine } from './algorithms/causticEngine';

class CausticEngine {
  constructor(parameters: CausticParameters);
  
  // 生成透镜几何体
  async generateLensGeometry(
    targetShape: number[][],
    onProgress?: (progress: number, status: string) => void,
    options?: {
      useGPUAcceleration?: boolean;
      photonMapSize?: number;
    }
  ): Promise<LensGeometry>;
  
  // 停止生成过程
  stop(): void;
  
  // 检查是否正在生成
  isGenerating(): boolean;
  
  // 更新参数
  updateParameters(parameters: CausticParameters): void;
}
```

**使用示例：**
```typescript
const engine = new CausticEngine({
  focalLength: 50,
  resolution: 256,
  material: 'acrylic',
  refractiveIndex: 1.49,
  targetDistance: 100
});

const geometry = await engine.generateLensGeometry(
  targetImageData,
  (progress, status) => console.log(`${progress}%: ${status}`)
);
```

### CausticsEngineeringAlgorithm

核心的焦散工程算法实现。

```typescript
class CausticsEngineeringAlgorithm {
  constructor(parameters: any);
  
  // 主算法入口
  async generateLens(
    targetImage: number[][],
    onProgress?: (progress: number, status: string) => void
  ): Promise<LensGeometry>;
  
  // 停止算法执行
  stop(): void;
}
```

### CausticsEngineeringGenerator

包装类，保持与现有系统的兼容性。

```typescript
class CausticsEngineeringGenerator {
  constructor(parameters: any);
  
  async generateLens(
    imageData: { data: number[][] },
    onProgress?: (progress: number, status: string) => void
  ): Promise<LensGeometry>;
  
  stop(): void;
  isGenerating(): boolean;
}
```

## 🧩 组件 API

### LensViewer

3D透镜查看器组件，基于 React Three Fiber。

```typescript
interface LensViewerProps {
  geometry?: LensGeometry;
  parameters: CausticParameters;
  onParameterChange?: (params: CausticParameters) => void;
  onCalculatingChange?: (isCalculating: boolean) => void;
}

const LensViewer: React.FC<LensViewerProps>;
```

**主要功能：**
- 实时3D渲染
- 焦散效果模拟
- 参数调整响应
- 光线追踪可视化

### ParameterPanel

参数控制面板组件。

```typescript
interface ParameterPanelProps {
  parameters: CausticParameters;
  onChange: (params: CausticParameters) => void;
  disabled?: boolean;
}

const ParameterPanel: React.FC<ParameterPanelProps>;
```

### CausticsRenderArea

焦散渲染结果显示区域。

```typescript
interface CausticsRenderAreaProps {
  results: CausticsRenderResult[];
  onClear?: () => void;
  onDelete?: (id: string) => void;
  onDownload?: (result: CausticsRenderResult) => void;
}

const CausticsRenderArea: React.FC<CausticsRenderAreaProps>;
```

### ImageUpload

图像上传组件。

```typescript
interface ImageUploadProps {
  onImageSelect: (imageData: ImageData) => void;
  accept?: string;
  maxSize?: number;
}

const ImageUpload: React.FC<ImageUploadProps>;
```

## 🗄️ 状态管理 API

### useProjectStore

基于 Zustand 的项目状态管理。

```typescript
interface ProjectStore {
  // 状态
  currentImage: ImageData | null;
  parameters: CausticParameters;
  geometry: LensGeometry | null;
  isProcessing: boolean;
  error: string | null;
  causticsRenderResults: CausticsRenderResult[];
  
  // 动作
  setCurrentImage: (image: ImageData | null) => void;
  setParameters: (params: CausticParameters) => void;
  setGeometry: (geometry: LensGeometry | null) => void;
  setProcessing: (processing: boolean) => void;
  setError: (error: string | null) => void;
  addCausticsRenderResult: (result: CausticsRenderResult) => void;
  clearCausticsRenderResults: () => void;
  deleteCausticsRenderResult: (id: string) => void;
}

const useProjectStore = create<ProjectStore>((set, get) => ({ ... }));
```

**使用示例：**
```typescript
const { 
  parameters, 
  setParameters, 
  currentImage, 
  setCurrentImage 
} = useProjectStore();

// 更新参数
setParameters({
  ...parameters,
  focalLength: 75
});
```

## 📝 类型定义

### 核心类型

```typescript
// 图像数据
interface ImageData {
  file?: File;
  url: string;
  name: string;
  width?: number;
  height?: number;
  data?: number[][];
  processedData?: ImageProcessingResult;
}

// 透镜几何体
interface LensGeometry {
  vertices: Point3D[];
  faces: number[][];
  normals: Point3D[];
  uvs: Point2D[];
}

// 焦散参数
interface CausticParameters {
  focalLength: number;
  resolution: number;
  material: string;
  refractiveIndex: number;
  targetDistance: number;
  rayCount?: number;
  convergenceThreshold?: number;
  maxIterations?: number;
  lightSource: LightSource;
  optimization: OptimizationSettings;
}

// 光源配置
interface LightSource {
  type: 'point' | 'area' | 'parallel';
  intensity: number;
  wavelength: number;
  position: { x: number; y: number; z: number };
  width?: number;
  height?: number;
  direction?: { x: number; y: number; z: number };
}

// 优化设置
interface OptimizationSettings {
  iterations?: number;
  tolerance?: number;
  maxIterations?: number;
  convergenceTolerance?: number;
  algorithm: string;
  useGPUAcceleration?: boolean;
  photonMapSize?: number;
  relaxationFactor?: number;
  learningRate?: number;
}
```

### 几何类型

```typescript
interface Point2D {
  x: number;
  y: number;
}

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface Contour {
  points: Point2D[];
  area: number;
  perimeter: number;
}
```

### 导出类型

```typescript
interface ExportOptions {
  format: 'stl' | 'obj' | 'ply' | 'gcode';
  quality: 'low' | 'medium' | 'high';
  scale: number;
}

interface CausticsRenderResult {
  id: string;
  timestamp: number;
  imageData: string; // base64 图像数据
  parameters: {
    focalLength: number;
    targetDistance: number;
    material: string;
  };
  renderTime: number;
  status: 'success' | 'error' | 'processing';
  errorMessage?: string;
}
```

## 🛠️ 工具函数 API

### exportUtils

导出功能工具函数。

```typescript
// 导出STL文件
export function exportSTL(
  geometry: LensGeometry, 
  filename: string
): void;

// 导出OBJ文件
export function exportOBJ(
  geometry: LensGeometry, 
  filename: string
): void;

// 导出报告
export function exportReport(
  projectData: ProjectState,
  format: 'html' | 'pdf'
): void;
```

### reportGenerator

报告生成工具。

```typescript
// 生成HTML报告
export function generateHTMLReport(
  projectData: ProjectState
): string;

// 生成PDF报告
export function generatePDFReport(
  projectData: ProjectState
): Blob;

// 生成技术参数报告
export function generateTechnicalReport(
  parameters: CausticParameters,
  geometry: LensGeometry
): TechnicalReport;
```

## 🔧 调试工具 API

### CausticDebugger

焦散渲染调试器。

```typescript
class CausticDebugger {
  constructor();
  
  // 调试光线追踪
  debugRayTracing(
    geometry: LensGeometry,
    parameters: CausticParameters
  ): DebugResult;
  
  // 验证几何体
  validateGeometry(geometry: LensGeometry): ValidationResult;
  
  // 性能分析
  profilePerformance(
    algorithm: () => Promise<any>
  ): PerformanceReport;
  
  // 可视化调试信息
  visualizeDebugInfo(
    debugData: DebugResult,
    canvas: HTMLCanvasElement
  ): void;
}
```

## 📖 使用示例

### 完整的透镜生成流程

```typescript
import { CausticEngine } from './algorithms/causticEngine';
import { useProjectStore } from './stores/projectStore';

// 1. 初始化引擎
const parameters: CausticParameters = {
  focalLength: 50,
  resolution: 256,
  material: 'acrylic',
  refractiveIndex: 1.49,
  targetDistance: 100,
  lightSource: {
    type: 'point',
    intensity: 1.0,
    wavelength: 550,
    position: { x: 0, y: 0, z: -100 }
  },
  optimization: {
    algorithm: 'caustics_engineering',
    iterations: 4,
    useGPUAcceleration: true
  }
};

const engine = new CausticEngine(parameters);

// 2. 生成透镜
async function generateLens(targetImage: number[][]) {
  try {
    const geometry = await engine.generateLensGeometry(
      targetImage,
      (progress, status) => {
        console.log(`进度: ${progress}% - ${status}`);
      }
    );
    
    // 3. 保存结果
    const { setGeometry } = useProjectStore.getState();
    setGeometry(geometry);
    
    return geometry;
  } catch (error) {
    console.error('生成失败:', error);
    throw error;
  }
}
```

### React组件集成

```typescript
import React from 'react';
import { LensViewer, ParameterPanel } from './components';
import { useProjectStore } from './stores/projectStore';

function App() {
  const { 
    parameters, 
    setParameters, 
    geometry, 
    isProcessing 
  } = useProjectStore();

  return (
    <div className="app">
      <ParameterPanel
        parameters={parameters}
        onChange={setParameters}
        disabled={isProcessing}
      />
      
      <LensViewer
        geometry={geometry}
        parameters={parameters}
        onParameterChange={setParameters}
      />
    </div>
  );
}
```

### 自定义算法集成

```typescript
import { CausticsEngineeringAlgorithm } from './algorithms/causticsEngineering';

// 扩展算法类
class CustomCausticAlgorithm extends CausticsEngineeringAlgorithm {
  constructor(parameters: any) {
    super(parameters);
  }
  
  // 重写生成方法
  async generateLens(
    targetImage: number[][],
    onProgress?: (progress: number, status: string) => void
  ): Promise<LensGeometry> {
    // 自定义算法实现
    onProgress?.(0, '开始自定义算法');
    
    // 调用父类方法或完全自定义
    const result = await super.generateLens(targetImage, onProgress);
    
    // 后处理
    onProgress?.(100, '自定义算法完成');
    return result;
  }
}
```

## 🚨 错误处理

### 常见错误类型

```typescript
// 算法错误
class CausticAlgorithmError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'CausticAlgorithmError';
  }
}

// 几何体错误
class GeometryError extends Error {
  constructor(message: string, public geometry?: LensGeometry) {
    super(message);
    this.name = 'GeometryError';
  }
}

// 参数错误
class ParameterError extends Error {
  constructor(message: string, public parameter: string) {
    super(message);
    this.name = 'ParameterError';
  }
}
```

### 错误处理示例

```typescript
try {
  const geometry = await engine.generateLensGeometry(targetImage);
} catch (error) {
  if (error instanceof CausticAlgorithmError) {
    console.error('算法错误:', error.message, error.code);
  } else if (error instanceof GeometryError) {
    console.error('几何体错误:', error.message);
  } else {
    console.error('未知错误:', error);
  }
}
```

## 📊 性能优化

### GPU 加速

```typescript
// 启用GPU加速
const parameters: CausticParameters = {
  // ... 其他参数
  optimization: {
    algorithm: 'caustics_engineering',
    useGPUAcceleration: true,
    photonMapSize: 1024 * 1024
  }
};
```

### 内存管理

```typescript
// 清理资源
engine.stop(); // 停止算法
geometry = null; // 清理几何体
```

## 🔗 相关链接

- [开发指南](../DEVELOPMENT.md)
- [部署指南](../DEPLOYMENT.md)
- [贡献指南](../CONTRIBUTING.md)
- [项目主页](../README.md)

---

**注意**: 此API文档会随着项目发展持续更新。如有疑问或建议，请提交 Issue 或 Pull Request。