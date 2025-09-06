// TypeScript 类型定义
export interface ImageData {
  file: File;
  url: string;
  width: number;
  height: number;
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
  lensWidth: number;
  lensHeight: number;
  focalLength: number;
  resolution: number;
  thickness: number;
  material: string;
  refractiveIndex: number;
  targetDistance: number;
  rayCount?: number;
  convergenceThreshold?: number;
  maxIterations?: number;
  lightSource: {
    type: string;
    intensity: number;
    wavelength: number;
    position: { x: number; y: number; z: number };
  };
  optimization: {
    iterations: number;
    tolerance: number;
    algorithm: string;
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