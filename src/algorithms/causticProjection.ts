import { DoubleSide, Ray, Vector3 } from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import type { LensGeometry, Point3D } from '../types';
import { toBufferGeometry } from '../utils/geometry';
import { receiverImageCoordinates } from './receiverCoordinates';
import { estimateReceiverWidth } from './projectionSetup';
import type { ProjectionSource } from './projectionSetup';

export interface ProjectionOptions {
  refractiveIndex: number;
  distance: number;
  intensity: number;
  resolution?: number;
  samples?: number;
  lightSource?: ProjectionSource;
  screenWidth?: number;
}

export interface ProjectionResult {
  pixels: Uint8ClampedArray;
  resolution: number;
  tracedRays: number;
  receivedRays: number;
  totalInternalReflections: number;
  screenWidth: number;
  rayPaths: ProjectionRayPath[];
  irradiance: Float32Array;
  incidentPower: number;
  receivedPower: number;
  peakIrradiance: number;
}

export interface ProjectionRayPath { origin: Point3D; entry: Point3D; exit: Point3D; target: Point3D }

// One point-source intensity unit gives unit normal irradiance at 1000 mm.
export const POINT_REFERENCE_DISTANCE_MM = 1000;

export function refract(incident: Vector3, outwardNormal: Vector3, ratio: number): Vector3 | null {
  const normal = outwardNormal.clone().normalize();
  const direction = incident.clone().normalize();
  if (normal.dot(direction) > 0) normal.negate();
  const cosine = -normal.dot(direction);
  const discriminant = 1 - ratio * ratio * (1 - cosine * cosine);
  if (discriminant < 0) return null;
  return direction.multiplyScalar(ratio).addScaledVector(normal, ratio * cosine - Math.sqrt(discriminant)).normalize();
}

// Aperture samples carry incident power through two mesh interfaces to the receiver.
// Units are mm. BVH intersections use the actual exported mesh, not the target image.
export function traceCaustics(geometry: LensGeometry, options: ProjectionOptions,
  onProgress?: (progress: number) => void): ProjectionResult {
  const { refractiveIndex, distance, intensity, resolution = 256, samples = 256 } = options;
  const sourceType = options.lightSource?.type ?? 'parallel';
  if (!(refractiveIndex > 1 && refractiveIndex <= 2) || !Number.isFinite(distance) || distance <= 0 ||
    !Number.isFinite(intensity) || intensity < 0 || !Number.isInteger(resolution) || resolution < 8 || resolution > 512 ||
    !Number.isInteger(samples) || samples < 8 || samples > 512) throw new Error('投影参数无效');
  if (sourceType !== 'parallel' && sourceType !== 'point') throw new Error('当前仿真支持平行光和点光源');
  if (options.screenWidth !== undefined && (!Number.isFinite(options.screenWidth) || options.screenWidth <= 0)) {
    throw new Error('接收屏宽度必须为正数');
  }
  const buffer = toBufferGeometry(geometry);
  try {
    const bounds = buffer.boundingBox!;
    const size = bounds.getSize(new Vector3());
    const center = bounds.getCenter(new Vector3());
    if (size.x <= 0 || size.y <= 0 || size.z <= 0) throw new Error('投影需要封闭的实体透镜');
    const bvh = new MeshBVH(buffer);
    const source = sourceType === 'point' ? new Vector3().copy(options.lightSource!.position) :
      new Vector3(center.x, center.y, bounds.min.z - 75);
    if (!source.toArray().every(Number.isFinite) || source.z >= bounds.min.z) {
      throw new Error('点光源必须位于透镜入射面之前');
    }
    const sourceDistance = bounds.min.z - source.z;
    const screenWidth = options.screenWidth ?? estimateReceiverWidth(bounds, distance, options.lightSource);
    const screenZ = bounds.max.z + distance;
    // Project the model's bounding box onto the entrance plane to cover side silhouettes too.
    let minX = bounds.min.x, maxX = bounds.max.x, minY = bounds.min.y, maxY = bounds.max.y;
    if (sourceType === 'point') {
      for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
        const factor = sourceDistance / (z - source.z);
        const px = source.x + (x - source.x) * factor;
        const py = source.y + (y - source.y) * factor;
        minX = Math.min(minX, px); maxX = Math.max(maxX, px);
        minY = Math.min(minY, py); maxY = Math.max(maxY, py);
      }
    }
    const sampleArea = (maxX - minX) * (maxY - minY) / (samples * samples);
    const energy = new Float32Array(resolution * resolution);
    const ray = new Ray(new Vector3(), new Vector3(0, 0, 1));
    const aperturePoint = new Vector3();
    let receivedRays = 0, totalInternalReflections = 0;
    let incidentPower = 0, receivedPower = 0;
    const rayPaths: ProjectionRayPath[] = [];
    const pathSamples = new Set(Array.from({ length: 7 }, (_, i) => Math.floor((i + 0.5) * samples / 7)));
    const epsilon = Math.max(size.length() * 1e-6, 1e-4);
    for (let y = 0; y < samples; y++) {
      for (let x = 0; x < samples; x++) {
        aperturePoint.set(minX + (x + 0.5) / samples * (maxX - minX),
          minY + (y + 0.5) / samples * (maxY - minY), bounds.min.z);
        let power = intensity * sampleArea;
        if (sourceType === 'point') {
          ray.origin.copy(source);
          ray.direction.copy(aperturePoint).sub(source).normalize();
          // dPower = I * cos(theta) / r^2 * dArea for uniform entrance-plane samples.
          power *= POINT_REFERENCE_DISTANCE_MM ** 2 * ray.direction.z / aperturePoint.distanceToSquared(source);
        } else {
          ray.origin.set(aperturePoint.x, aperturePoint.y, source.z);
          ray.direction.set(0, 0, 1);
        }
        const entry = bvh.raycastFirst(ray, DoubleSide);
        if (!entry?.face) continue;
        incidentPower += power;
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
        receivedPower += power;
        if (pathSamples.has(x) && pathSamples.has(y)) {
          rayPaths.push({
            origin: sourceType === 'point' ? { x: source.x, y: source.y, z: source.z } :
              { x: aperturePoint.x, y: aperturePoint.y, z: source.z },
            entry: { x: entry.point.x, y: entry.point.y, z: entry.point.z },
            exit: { x: exit.point.x, y: exit.point.y, z: exit.point.z },
            target: { x: exit.point.x + outgoing.x * t, y: exit.point.y + outgoing.y * t, z: screenZ },
          });
        }
        const ix = Math.floor(px), iy = Math.floor(py), fx = px - ix, fy = py - iy;
        energy[iy * resolution + ix] += power * (1 - fx) * (1 - fy);
        energy[iy * resolution + ix + 1] += power * fx * (1 - fy);
        energy[(iy + 1) * resolution + ix] += power * (1 - fx) * fy;
        energy[(iy + 1) * resolution + ix + 1] += power * fx * fy;
      }
      if (y % 16 === 0) onProgress?.(Math.round((y + 1) / samples * 100));
    }
    const pixels = new Uint8ClampedArray(resolution * resolution * 4);
    const pixelArea = (screenWidth / resolution) ** 2;
    const irradiance = new Float32Array(energy.length);
    let peakIrradiance = 0;
    for (let i = 0; i < energy.length; i++) {
      irradiance[i] = energy[i] / pixelArea;
      peakIrradiance = Math.max(peakIrradiance, irradiance[i]);
      const brightness = Math.round(255 * (1 - Math.exp(-irradiance[i])));
      pixels.set([brightness, brightness, brightness, 255], i * 4);
    }
    onProgress?.(100);
    return { pixels, resolution, tracedRays: samples * samples, receivedRays, totalInternalReflections,
      screenWidth, rayPaths, irradiance, incidentPower, receivedPower, peakIrradiance };
  } finally { buffer.dispose(); }
}
