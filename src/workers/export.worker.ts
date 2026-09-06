import { serializeGeometry } from '../utils/exportUtils';
import type { ExportOptions } from '../utils/exportUtils';
import type { LensGeometry } from '../types';

self.onmessage = (event: MessageEvent<{ geometry: LensGeometry; options: ExportOptions }>) => {
  try { self.postMessage({ content: serializeGeometry(event.data.geometry, event.data.options) }); }
  catch (error) { self.postMessage({ error: error instanceof Error ? error.message : '模型导出失败' }); }
};
