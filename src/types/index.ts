// TypeScript 类型定义
export interface ImageData {
  file?: File;
  url: string;
  name: string;
  width?: number;
  height?: number;
  data?: number[][];
  processedData?: ImageProcessingResult;
}

export interface ImageProcessingResult {
  edges: number[][];
  contours: Contour[];
  targetShape: number[][];
}

export interface Contour {
  points: Point2D[];
  area: number;
  perimeter: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface LensGeometry {
  vertices: Point3D[];
  faces: number[][];
  normals: Point3D[];
  uvs: Point2D[];
}

export interface CausticParameters {
  focalLength: number;
  resolution: number;
  material: string;
  refractiveIndex: number;
  targetDistance: number;
  rayCount?: number;
  convergenceThreshold?: number;
  maxIterations?: number;
  lightSource: {
    type: 'point' | 'area' | 'parallel';
    intensity: number;
    wavelength: number;
    position: { x: number; y: number; z: number };
    // 面光源特有参数
    width?: number;  // 面光源宽度
    height?: number; // 面光源高度
    // 光线方向（用于平行光和面光源）
    direction?: { x: number; y: number; z: number };
  };
  optimization: {
    iterations?: number;
    tolerance?: number;
    maxIterations?: number;
    convergenceTolerance?: number;
    algorithm: string;
    useGPUAcceleration?: boolean;
    photonMapSize?: number;
    relaxationFactor?: number;  // SOR算法的松弛因子
    learningRate?: number;
  };
}

export interface ExportOptions {
  format: 'stl' | 'obj' | 'ply' | 'gcode';
  quality: 'low' | 'medium' | 'high';
  scale: number;
}

export interface ProjectState {
  currentImage: ImageData | null;
  parameters: CausticParameters;
  geometry: LensGeometry | null;
  isProcessing: boolean;
  error: string | null;
}