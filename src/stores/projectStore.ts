import { create } from 'zustand';
import type { ProjectState, ImageData, CausticParameters, LensGeometry } from '../types';

// 焦散渲染结果接口
interface CausticsRenderResult {
  id: string;
  timestamp: number;
  imageData: string; // base64 图像数据
  parameters: {
    focalLength: number;
    targetDistance: number;
    material: string;
  };
  renderTime: number; // 渲染耗时（毫秒）
  status: 'success' | 'error' | 'processing';
  errorMessage?: string;
}

interface ProgressDetails {
  iteration?: number;
  totalIterations?: number;
  currentError?: number;
  bestError?: number;
  converged?: boolean;
  discrepancy?: number;
  gradientNorm?: number;
  phase?: string;
  // 时间相关字段
  estimatedTimeRemaining?: number; // 预计剩余时间（毫秒）
  avgIterationTime?: number; // 平均每次迭代时间（毫秒）
  startTime?: number; // 开始时间戳
  elapsedTime?: number; // 已用时间（毫秒）
  // 性能相关字段
  memoryUsage?: number; // 内存使用量（MB）
  cpuUsage?: number; // CPU使用率（百分比）
  processingSpeed?: number; // 处理速度（像素/秒）
}

interface ProjectStore extends ProjectState {
  targetShape: number[][] | null;
  progressDetails: ProgressDetails | null;
  iterationImages: string[]; // 存储迭代过程的图像base64数据
  causticsRenderResults: CausticsRenderResult[]; // 焦散渲染结果列表
  setImage: (image: ImageData) => void;
  setParameters: (params: Partial<CausticParameters>) => void;
  setGeometry: (geometry: LensGeometry) => void;
  setTargetShape: (targetShape: number[][]) => void;
  setProcessing: (processing: boolean) => void;
  setProgressDetails: (details: ProgressDetails | null) => void;
  setError: (error: string | null) => void;
  addIterationImage: (imageData: string) => void;
  clearIterationImages: () => void;
  addCausticsRenderResult: (result: CausticsRenderResult) => void;
  updateCausticsRenderResult: (id: string, updates: Partial<CausticsRenderResult>) => void;
  deleteCausticsRenderResult: (id: string) => void;
  clearCausticsRenderResults: () => void;
  reset: () => void;
}

const defaultParameters: CausticParameters = {
  focalLength: 200, // mm (0.2m, 基于Julia实现)
  resolution: 512,  // 网格分辨率，匹配Julia实现的512x512
  material: 'acrylic',
  refractiveIndex: 1.49, // 典型的光学玻璃
  targetDistance: 1000,  // mm，调整为1000mm
  lightSource: {
     type: 'parallel',
     intensity: 1.0,
     wavelength: 550,  // nm (绿光)
     position: { x: 0, y: 0, z: 150 }, // mm (光源在透镜前方，距离透镜150mm)
     width: 50,  // 面光源默认宽度
     height: 50, // 面光源默认高度
     direction: { x: 0, y: 0, z: 1 } // 默认向前方向
   },
  optimization: {
    iterations: 4,  // Julia中使用4次oneIteration调用
    tolerance: 0.00001,  // Julia中使用0.00001收敛阈值
    algorithm: 'sor',  // Julia实现使用SOR算法
    useGPUAcceleration: true,   // 默认启用GPU加速
    photonMapSize: 262144,  // 512*512，匹配Julia实现
    relaxationFactor: 1.99,  // Julia中omega = 1.99 (SOR松弛因子)
    learningRate: 0.1  // 基础学习率，算法中会自适应调整
  }
};

export const useProjectStore = create<ProjectStore>((set) => ({
  currentImage: null,
  parameters: defaultParameters,
  geometry: null,
  targetShape: null,
  isProcessing: false,
  progressDetails: null,
  error: null,
  iterationImages: [],
  causticsRenderResults: [],

  setImage: (image) => set({ currentImage: image, error: null }),
  setParameters: (params) => set((state) => ({ 
    parameters: { ...state.parameters, ...params } 
  })),
  setGeometry: (geometry) => set({ geometry }),
  setTargetShape: (targetShape) => set({ targetShape }),
  setProcessing: (processing) => set({ isProcessing: processing }),
  setProgressDetails: (details) => set({ progressDetails: details }),
  setError: (error) => set({ error }),
  addIterationImage: (imageData) => set((state) => ({
    iterationImages: [...state.iterationImages, imageData]
  })),
  clearIterationImages: () => set({ iterationImages: [] }),
  addCausticsRenderResult: (result) => set((state) => ({
    causticsRenderResults: [...state.causticsRenderResults, result]
  })),
  updateCausticsRenderResult: (id, updates) => set((state) => ({
    causticsRenderResults: state.causticsRenderResults.map(result => 
      result.id === id ? { ...result, ...updates } : result
    )
  })),
  deleteCausticsRenderResult: (id) => set((state) => ({
    causticsRenderResults: state.causticsRenderResults.filter(result => result.id !== id)
  })),
  clearCausticsRenderResults: () => set({ causticsRenderResults: [] }),
  reset: () => set({
    currentImage: null,
    geometry: null,
    targetShape: null,
    isProcessing: false,
    progressDetails: null,
    error: null,
    iterationImages: [],
    causticsRenderResults: [],
    parameters: defaultParameters,
  }),
}));