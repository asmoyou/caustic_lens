import { create } from 'zustand';
import { ProjectState, ImageData, CausticParameters, LensGeometry } from '../types';

interface ProjectStore extends ProjectState {
  targetShape: number[][] | null;
  setImage: (image: ImageData) => void;
  setParameters: (params: Partial<CausticParameters>) => void;
  setGeometry: (geometry: LensGeometry) => void;
  setTargetShape: (targetShape: number[][]) => void;
  setProcessing: (processing: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const defaultParameters: CausticParameters = {
  lensWidth: 100,
  lensHeight: 100,
  focalLength: 50,
  resolution: 128,
  thickness: 10,
  material: 'acrylic',
  refractiveIndex: 1.49,
  targetDistance: 200,
  lightSource: {
    type: 'parallel',
    intensity: 1.0,
    wavelength: 550,
    position: { x: 0, y: 0, z: -100 }
  },
  optimization: {
    iterations: 100,
    tolerance: 0.001,
    algorithm: 'gradient_descent'
  }
};

export const useProjectStore = create<ProjectStore>((set) => ({
  currentImage: null,
  parameters: defaultParameters,
  geometry: null,
  targetShape: null,
  isProcessing: false,
  error: null,
  
  setImage: (image) => set({ currentImage: image, error: null }),
  setParameters: (params) => set((state) => ({ 
    parameters: { ...state.parameters, ...params } 
  })),
  setGeometry: (geometry) => set({ geometry }),
  setTargetShape: (targetShape) => set({ targetShape }),
  setProcessing: (processing) => set({ isProcessing: processing }),
  setError: (error) => set({ error }),
  reset: () => set({
    currentImage: null,
    geometry: null,
    targetShape: null,
    isProcessing: false,
    error: null,
    parameters: defaultParameters,
  }),
}));