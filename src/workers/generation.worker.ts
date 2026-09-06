import { CausticsEngineeringAlgorithm } from '../algorithms/causticsEngineering';
import type { CausticParameters, LensGeometry } from '../types';

export type GenerationMessage =
  | { type: 'progress'; progress: number; phase: string }
  | { type: 'iteration'; loss: number[][]; iteration: number }
  | { type: 'complete'; geometry: LensGeometry }
  | { type: 'error'; error: string };

self.onmessage = async (event: MessageEvent<{ targetShape: number[][]; parameters: CausticParameters }>) => {
  const send = (message: GenerationMessage) => self.postMessage(message);
  try {
    const algorithm = new CausticsEngineeringAlgorithm(event.data.parameters);
    const geometry = await algorithm.generateLens(event.data.targetShape,
      (progress, phase) => send({ type: 'progress', progress, phase }),
      (loss, iteration) => send({ type: 'iteration', loss, iteration }));
    send({ type: 'complete', geometry });
  } catch (error) {
    send({ type: 'error', error: error instanceof Error ? error.message : '透镜生成失败' });
  }
};
