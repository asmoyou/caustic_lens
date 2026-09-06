import type { Box3 } from 'three';
import type { CausticParameters } from '../types';

export type ProjectionSource = Pick<CausticParameters['lightSource'], 'type' | 'position'>;

export function estimateReceiverWidth(bounds: Box3, distance: number, source?: ProjectionSource): number {
  const width = Math.max(bounds.max.x - bounds.min.x, bounds.max.y - bounds.min.y);
  if (source?.type !== 'point' || source.position.z >= bounds.min.z) return width * 1.3;
  const magnification = 1 + (distance + bounds.max.z - bounds.min.z) / (bounds.min.z - source.position.z);
  const centerX = (bounds.min.x + bounds.max.x) / 2;
  const centerY = (bounds.min.y + bounds.max.y) / 2;
  const offset = Math.max(Math.abs(source.position.x - centerX), Math.abs(source.position.y - centerY)) * (magnification - 1);
  return (width * magnification + offset * 2) * 1.3;
}
