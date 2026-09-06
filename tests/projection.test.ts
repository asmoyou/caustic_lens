import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BoxGeometry, Vector3 } from 'three';
import { refract, traceCaustics } from '../src/algorithms/causticProjection';
import { toBufferGeometry } from '../src/utils/geometry';
import type { LensGeometry } from '../src/types';

function slab(): LensGeometry {
  const box = new BoxGeometry(100, 100, 10);
  const positions = box.getAttribute('position');
  const indices = Array.from(box.index!.array);
  const geometry = {
    vertices: Array.from({ length: positions.count }, (_, i) => ({ x: positions.getX(i), y: positions.getY(i), z: positions.getZ(i) })),
    faces: Array.from({ length: indices.length / 3 }, (_, i) => indices.slice(i * 3, i * 3 + 3)), normals: [], uvs: [],
  };
  box.dispose();
  return geometry;
}

test('normal incidence is unchanged and total internal reflection is rejected', () => {
  assert.deepEqual(refract(new Vector3(0, 0, 1), new Vector3(0, 0, 1), 1.5), new Vector3(0, 0, 1));
  assert.equal(refract(new Vector3(Math.sqrt(3) / 2, 0, 0.5), new Vector3(0, 0, 1), 1.5), null);
  const incident = new Vector3(0.5, 0, Math.sqrt(3) / 2);
  assert.ok(Math.abs(refract(incident, new Vector3(0, 0, -1), 1 / 1.5)!.x - 1 / 3) < 1e-12);
});

test('flat slab transmits all sampled rays and creates a nonblank projection', () => {
  const options = { refractiveIndex: 1.49, distance: 1000, intensity: 1, resolution: 32, samples: 32 };
  const result = traceCaustics(slab(), options);
  assert.equal(result.receivedRays, 1024);
  assert.equal(result.totalInternalReflections, 0);
  assert.ok(result.pixels[(16 * 32 + 16) * 4] > 100);
  assert.equal(result.pixels[0], 0);
  assert.deepEqual(result.pixels, traceCaustics(slab(), options).pixels);
  assert.ok(traceCaustics(slab(), { ...options, intensity: 0 }).pixels.every((value, i) => i % 4 === 3 ? value === 255 : value === 0));
});

test('invalid vertices fail without silently shifting face indices', () => {
  const geometry = slab();
  geometry.vertices[0].x = NaN;
  assert.throws(() => toBufferGeometry(geometry));
});
