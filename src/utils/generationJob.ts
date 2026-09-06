import { ImageProcessor } from '../algorithms/imageProcessing';
import { useProjectStore } from '../stores/projectStore';
import type { GenerationMessage } from '../workers/generation.worker';

let cancelActive: (() => void) | null = null;

export function cancelGeneration() { cancelActive?.(); }

function lossImage(loss: number[][]): string {
  const canvas = document.createElement('canvas');
  canvas.width = loss.length;
  canvas.height = loss[0].length;
  const ctx = canvas.getContext('2d')!;
  const pixels = ctx.createImageData(canvas.width, canvas.height);
  let min = Infinity, max = -Infinity;
  for (const column of loss) for (const value of column) {
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
    const i = (y * canvas.width + x) * 4;
    const value = max === min ? 128 : Math.round((loss[x][y] - min) / (max - min) * 255);
    pixels.data.set([value, value, value, 255], i);
  }
  ctx.putImageData(pixels, 0, 0);
  return canvas.toDataURL('image/png');
}

export async function startGeneration(): Promise<void> {
  const { currentImage, parameters, revision, isProcessing } = useProjectStore.getState();
  if (!currentImage || isProcessing) return;
  cancelGeneration();
  const started = performance.now();
  let active = true;
  let worker: Worker | null = null;
  let unsubscribe = () => {};
  const cleanup = () => {
    active = false;
    worker?.terminate();
    unsubscribe();
    cancelActive = null;
  };
  const fail = (error: string) => {
    if (!active) return;
    cleanup();
    useProjectStore.setState({ isProcessing: false, progress: 0, progressDetails: null, error });
  };
  cancelActive = () => {
    cleanup();
    useProjectStore.setState({ isProcessing: false, progress: 0, progressDetails: { phase: '已取消' } });
  };
  useProjectStore.setState({ isProcessing: true, geometry: null, targetShape: null,
    error: null, progress: 2, processingTime: 0, iterationImages: [], causticsRenderResults: [],
    progressDetails: { phase: '预处理图像', totalIterations: parameters.optimization.iterations } });
  unsubscribe = useProjectStore.subscribe(state => {
    if (state.revision !== revision || !state.isProcessing) {
      cleanup();
      if (state.isProcessing) useProjectStore.setState({ isProcessing: false, progress: 0, progressDetails: null });
    }
  });
  try {
    const { targetShape } = await new ImageProcessor().processImage(currentImage, parameters.resolution);
    if (!active) return;
    worker = new Worker(new URL('../workers/generation.worker.ts', import.meta.url), { type: 'module' });
    worker.onerror = () => fail('计算线程异常，请重新计算');
    worker.onmessage = (event: MessageEvent<GenerationMessage>) => {
      if (!active) return;
      const data = event.data;
      const elapsedTime = performance.now() - started;
      if (data.type === 'error') return fail(data.error);
      if (data.type === 'progress') {
        const progress = Math.min(99, Math.round(10 + data.progress * 0.89));
        useProjectStore.setState(state => ({ progress: Math.max(state.progress, progress),
          progressDetails: { ...state.progressDetails, phase: data.phase, elapsedTime,
            totalIterations: parameters.optimization.iterations } }));
      } else if (data.type === 'iteration') {
        useProjectStore.setState(state => ({
          iterationImages: [...state.iterationImages, lossImage(data.loss)],
          progressDetails: { ...state.progressDetails, iteration: data.iteration },
        }));
      } else {
        cleanup();
        useProjectStore.setState({ geometry: data.geometry, targetShape, isProcessing: false,
          progress: 100, processingTime: elapsedTime / 1000,
          progressDetails: { phase: '计算完成', elapsedTime,
            iteration: parameters.optimization.iterations, totalIterations: parameters.optimization.iterations } });
      }
    };
    worker.postMessage({ targetShape, parameters });
  } catch (error) { fail(error instanceof Error ? error.message : '图片处理失败'); }
}
