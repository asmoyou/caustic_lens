import { DoubleSide, Ray, Vector3 } from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import type { LensGeometry, Point3D } from '../types';
import { toBufferGeometry } from '../utils/geometry';
import { receiverImageCoordinates } from './receiverCoordinates';

export interface ProjectionOptions {
  refractiveIndex: number;
  distance: number;
  intensity: number;
  resolution?: number;
  samples?: number;
}

export interface ProjectionResult {
  pixels: Uint8ClampedArray;
  resolution: number;
  tracedRays: number;
  receivedRays: number;
  totalInternalReflections: number;
  screenWidth: number;
  rayPaths: ProjectionRayPath[];
}

export interface ProjectionRayPath { entry: Point3D; exit: Point3D; target: Point3D }

export function refract(incident: Vector3, outwardNormal: Vector3, ratio: number): Vector3 | null {
  const normal = outwardNormal.clone().normalize();
  const direction = incident.clone().normalize();
  if (normal.dot(direction) > 0) normal.negate();
  const cosine = -normal.dot(direction);
  const discriminant = 1 - ratio * ratio * (1 - cosine * cosine);
  if (discriminant < 0) return null;
  return direction.multiplyScalar(ratio).addScaledVector(normal, ratio * cosine - Math.sqrt(discriminant)).normalize();
}

// Parallel illumination enters the planar back surface, then exits the shaped front.
// Units are mm. BVH intersections use the actual exported mesh, not the target image.
export function traceCaustics(geometry: LensGeometry, options: ProjectionOptions,
  onProgress?: (progress: number) => void): ProjectionResult {
  const { refractiveIndex, distance, intensity, resolution = 256, samples = 256 } = options;
  if (!(refractiveIndex > 1 && refractiveIndex <= 2) || !Number.isFinite(distance) || distance <= 0 ||
    !Number.isFinite(intensity) || intensity < 0 || !Number.isInteger(resolution) || resolution < 8 || resolution > 512 ||
    !Number.isInteger(samples) || samples < 8 || samples > 512) throw new Error('投影参数无效');
  const buffer = toBufferGeometry(geometry);
  try {
    const bounds = buffer.boundingBox!;
    const size = bounds.getSize(new Vector3());
    const center = bounds.getCenter(new Vector3());
    if (size.x <= 0 || size.y <= 0 || size.z <= 0) throw new Error('投影需要封闭的实体透镜');
    const bvh = new MeshBVH(buffer);
    const screenWidth = Math.max(size.x, size.y) * 1.3;
    const screenZ = bounds.max.z + distance;
    const energy = new Float32Array(resolution * resolution);
    const ray = new Ray(new Vector3(), new Vector3(0, 0, 1));
    let receivedRays = 0, totalInternalReflections = 0;
    const rayPaths: ProjectionRayPath[] = [];
    const pathSamples = new Set(Array.from({ length: 7 }, (_, i) => Math.floor((i + 0.5) * samples / 7)));
    const epsilon = Math.max(size.length() * 1e-6, 1e-4);
    for (let y = 0; y < samples; y++) {
      for (let x = 0; x < samples; x++) {
        ray.origin.set(bounds.min.x + (x + 0.5) / samples * size.x,
          bounds.min.y + (y + 0.5) / samples * size.y, bounds.min.z - 1);
        ray.direction.set(0, 0, 1);
        const entry = bvh.raycastFirst(ray, DoubleSide);
        if (!entry?.face) continue;
        const inside = refract(ray.direction, entry.face.normal, 1 / refractiveIndex);
        if (!inside) continue;
        ray.direction.copy(inside);
        ray.origin.copy(entry.point).addScaledVector(inside, epsilon);
        const exit = bvh.raycastFirst(ray, DoubleSide);
        if (!exit?.face) continue;
        const outgoing = refract(inside, exit.face.normal, refractiveIndex);
        if (!outgoing) { totalInternalReflections++; continue; }
        if (outgoing.z <= 1e-8) continue;
        const t = (screenZ - exit.point.z) / outgoing.z;
        const coordinates = receiverImageCoordinates(exit.point.x + outgoing.x * t,
          exit.point.y + outgoing.y * t, center.x, center.y, screenWidth);
        const px = coordinates.u * resolution - 0.5;
        const py = coordinates.v * resolution - 0.5;
        if (px < 0 || px >= resolution - 1 || py < 0 || py >= resolution - 1) continue;
        receivedRays++;
        if (pathSamples.has(x) && pathSamples.has(y)) {
          rayPaths.push({
            entry: { x: entry.point.x, y: entry.point.y, z: entry.point.z },
            exit: { x: exit.point.x, y: exit.point.y, z: exit.point.z },
            target: { x: exit.point.x + outgoing.x * t, y: exit.point.y + outgoing.y * t, z: screenZ },
          });
        }
        const ix = Math.floor(px), iy = Math.floor(py), fx = px - ix, fy = py - iy;
        energy[iy * resolution + ix] += (1 - fx) * (1 - fy);
        energy[iy * resolution + ix + 1] += fx * (1 - fy);
        energy[(iy + 1) * resolution + ix] += (1 - fx) * fy;
        energy[(iy + 1) * resolution + ix + 1] += fx * fy;
      }
      if (y % 16 === 0) onProgress?.(Math.round((y + 1) / samples * 100));
    }
    const pixels = new Uint8ClampedArray(resolution * resolution * 4);
    const density = samples * samples / (resolution * resolution * size.x * size.y / (screenWidth * screenWidth));
    for (let i = 0; i < energy.length; i++) {
      const brightness = Math.round(255 * (1 - Math.exp(-energy[i] / density * intensity)));
      pixels.set([brightness, brightness, brightness, 255], i * 4);
    }
    onProgress?.(100);
    return { pixels, resolution, tracedRays: samples * samples, receivedRays, totalInternalReflections, screenWidth, rayPaths };
  } finally { buffer.dispose(); }
}
