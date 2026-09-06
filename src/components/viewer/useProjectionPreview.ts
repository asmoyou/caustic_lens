import { useCallback, useEffect, useRef, useState } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import type { ProjectionResult } from '../../algorithms/causticProjection';
import type { ProjectionMessage } from '../../workers/projection.worker';

export interface ProjectionPreview { result: ProjectionResult; imageData: string; revision: number }
interface ProjectionJob { worker: Worker; id: string; revision: number }

export function useProjectionPreview() {
  const geometry = useProjectStore(state => state.geometry);
  const revision = useProjectStore(state => state.revision);
  const [preview, setPreview] = useState<ProjectionPreview | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const jobRef = useRef<ProjectionJob | null>(null);
  const autoTimer = useRef<number | undefined>(undefined);

  const cancel = useCallback(() => {
    const job = jobRef.current;
    jobRef.current = null;
    job?.worker.terminate();
    if (job) useProjectStore.getState().deleteCausticsRenderResult(job.id);
    setProgress(null);
  }, []);

  const render = useCallback(() => {
    const state = useProjectStore.getState();
    if (!state.geometry || state.isProcessing || jobRef.current) return;
    window.clearTimeout(autoTimer.current);
    const id = crypto.randomUUID();
    const started = performance.now();
    setProgress(0);
    setError(null);
    const finish = () => {
      jobRef.current?.worker.terminate();
      jobRef.current = null;
      setProgress(null);
    };
    const fail = (errorMessage: string) => {
      useProjectStore.getState().updateCausticsRenderResult(id, { status: 'error', errorMessage });
      setError(errorMessage);
      finish();
    };
    state.addCausticsRenderResult({ id, timestamp: Date.now(), status: 'processing', imageData: '', renderTime: 0,
      parameters: { focalLength: state.parameters.focalLengthMeters * 1000,
        targetDistance: state.parameters.targetDistance, material: state.parameters.material } });
    try {
      const worker = new Worker(new URL('../../workers/projection.worker.ts', import.meta.url), { type: 'module' });
      const job = { worker, id, revision: state.revision };
      jobRef.current = job;
      const isCurrent = () => jobRef.current === job && useProjectStore.getState().revision === job.revision
        && useProjectStore.getState().geometry === state.geometry;
      worker.onerror = () => { if (isCurrent()) fail('投影计算线程异常'); };
      worker.onmessage = (event: MessageEvent<ProjectionMessage>) => {
        if (!isCurrent()) return;
        if (event.data.type === 'progress') return setProgress(event.data.progress);
        if (event.data.type === 'error') return fail(event.data.error);
        try {
          const { result } = event.data;
          const canvas = document.createElement('canvas');
          canvas.width = canvas.height = result.resolution;
          const ctx = canvas.getContext('2d')!;
          const pixels = ctx.createImageData(result.resolution, result.resolution);
          pixels.data.set(result.pixels);
          ctx.putImageData(pixels, 0, 0);
          const imageData = canvas.toDataURL('image/png');
          setPreview({ result, imageData, revision: job.revision });
          useProjectStore.getState().updateCausticsRenderResult(id, { status: 'success', imageData,
            renderTime: performance.now() - started, statistics: {
              tracedRays: result.tracedRays, receivedRays: result.receivedRays,
              totalInternalReflections: result.totalInternalReflections, screenWidth: result.screenWidth,
            } });
          finish();
        } catch { fail('投影图像生成失败'); }
      };
      worker.postMessage({ geometry: state.geometry, options: { refractiveIndex: state.parameters.refractiveIndex,
        distance: state.parameters.targetDistance, intensity: state.parameters.lightSource.intensity } });
    } catch { fail('无法启动投影计算线程'); }
  }, []);

  useEffect(() => {
    setPreview(null);
    setError(null);
    // Debounce parameter edits; cleanup also cancels StrictMode's initial effect replay.
    const timer = geometry ? window.setTimeout(render, 180) : undefined;
    autoTimer.current = timer;
    return () => { window.clearTimeout(timer); cancel(); };
  }, [geometry, revision, render, cancel]);

  return { preview: preview?.revision === revision ? preview : null, progress, error, render, cancel };
}
