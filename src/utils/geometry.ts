import { BufferGeometry, Float32BufferAttribute } from 'three';
import type { LensGeometry } from '../types';

export function validateGeometry(geometry: LensGeometry): void {
  if (!geometry.vertices.length || !geometry.faces.length) throw new Error('模型没有有效的顶点或面片');
  for (const vertex of geometry.vertices) {
    if (![vertex.x, vertex.y, vertex.z].every(Number.isFinite)) throw new Error('模型包含无效顶点');
  }
  for (const face of geometry.faces) {
    if (face.length !== 3 || face.some(index => !Number.isInteger(index) || index < 0 || index >= geometry.vertices.length)) {
      throw new Error('模型包含无效面片索引');
    }
  }
}

export function toBufferGeometry(geometry: LensGeometry): BufferGeometry {
  validateGeometry(geometry);
  const buffer = new BufferGeometry();
  const positions = new Float32Array(geometry.vertices.length * 3);
  geometry.vertices.forEach((vertex, index) => positions.set([vertex.x, vertex.y, vertex.z], index * 3));
  const indices = new Uint32Array(geometry.faces.length * 3);
  geometry.faces.forEach((face, index) => indices.set(face, index * 3));
  buffer.setAttribute('position', new Float32BufferAttribute(positions, 3));
  buffer.setIndex(Array.from(indices));
  buffer.computeVertexNormals();
  buffer.computeBoundingBox();
  buffer.computeBoundingSphere();
  return buffer;
}
