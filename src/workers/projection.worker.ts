import { traceCaustics } from '../algorithms/causticProjection';
import type { ProjectionOptions, ProjectionResult } from '../algorithms/causticProjection';
import type { LensGeometry } from '../types';

export type ProjectionMessage = { type: 'progress'; progress: number }
  | { type: 'complete'; result: ProjectionResult } | { type: 'error'; error: string };

self.onmessage = (event: MessageEvent<{ geometry: LensGeometry; options: ProjectionOptions }>) => {
  const send = (data: ProjectionMessage) => self.postMessage(data);
  try {
    const result = traceCaustics(event.data.geometry, event.data.options,
      progress => send({ type: 'progress', progress }));
    send({ type: 'complete', result });
  } catch (error) { send({ type: 'error', error: error instanceof Error ? error.message : '投影计算失败' }); }
};
