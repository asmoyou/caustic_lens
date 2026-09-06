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
  assert.equal(result.rayPaths.length, 49);
  for (const path of result.rayPaths) {
    assert.ok(Math.abs(path.entry.z + 5) < 1e-10);
    assert.ok(Math.abs(path.exit.z - 5) < 1e-10);
    assert.equal(path.target.z, 1005);
    assert.equal(path.entry.x, path.target.x);
    assert.equal(path.entry.y, path.target.y);
  }
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

test('point rays diverge from the configured origin and refract through both slab interfaces', () => {
  const source = { x: 12, y: -8, z: -155 };
  const result = traceCaustics(slab(), { refractiveIndex: 1.49, distance: 400, intensity: 1,
    resolution: 64, samples: 64, lightSource: { type: 'point', position: source } });
  assert.ok(result.rayPaths.length >= 20);
  for (const path of result.rayPaths) {
    assert.deepEqual(path.origin, source);
    if (Math.abs(path.entry.z + 5) > 1e-8 || Math.abs(path.exit.z - 5) > 1e-8) continue;
    const incident = new Vector3().copy(path.entry).sub(new Vector3().copy(source)).normalize();
    const insideZ = Math.sqrt(1 - (incident.x ** 2 + incident.y ** 2) / 1.49 ** 2);
    const expectedX = path.entry.x + 10 * (incident.x / 1.49) / insideZ + 400 * incident.x / incident.z;
    const expectedY = path.entry.y + 10 * (incident.y / 1.49) / insideZ + 400 * incident.y / incident.z;
    assert.ok(Math.abs(path.target.x - expectedX) < 1e-6);
    assert.ok(Math.abs(path.target.y - expectedY) < 1e-6);
  }
});

test('point illumination follows inverse-square falloff and conserves power over a full receiver', () => {
  const options = { refractiveIndex: 1.49, distance: 50, intensity: 1, resolution: 64, samples: 64 };
  const near = traceCaustics(slab(), { ...options, lightSource: { type: 'point', position: { x: 0, y: 0, z: -1005 } } });
  const far = traceCaustics(slab(), { ...options, lightSource: { type: 'point', position: { x: 0, y: 0, z: -2005 } } });
  assert.ok(Math.abs(far.receivedPower / near.receivedPower - 0.25) < 0.002);
  // Solid angle of a centered 100 x 100 mm rectangular aperture at 1000 mm.
  const analytic = 1e6 * 4 * Math.atan(2500 / (1000 * Math.sqrt(1000 ** 2 + 5000)));
  assert.ok(Math.abs(near.incidentPower / analytic - 1) < 1e-5);
  const distantScreen = traceCaustics(slab(), { ...options, distance: 1000,
    lightSource: { type: 'point', position: { x: 0, y: 0, z: -1005 } } });
  assert.ok(Math.abs(near.receivedPower / distantScreen.receivedPower - 1) < 1e-8);
  for (const result of [near, far, distantScreen]) {
    const integrated = result.irradiance.reduce((sum, value) => sum + value, 0) * (result.screenWidth / result.resolution) ** 2;
    assert.ok(Math.abs(integrated / result.receivedPower - 1) < 1e-6);
  }
});

test('point source position and receiver clipping change the computed result', () => {
  const options = { refractiveIndex: 1.49, distance: 400, intensity: 1, resolution: 64, samples: 64, screenWidth: 600 };
  const centered = traceCaustics(slab(), { ...options, lightSource: { type: 'point', position: { x: 0, y: 0, z: -155 } } });
  const shifted = traceCaustics(slab(), { ...options, lightSource: { type: 'point', position: { x: 25, y: 0, z: -155 } } });
  assert.notDeepEqual(centered.irradiance, shifted.irradiance);
  const clipped = traceCaustics(slab(), { ...options, screenWidth: 40,
    lightSource: { type: 'point', position: { x: 0, y: 0, z: -155 } } });
  assert.ok(clipped.receivedRays < centered.receivedRays / 10);
  for (const z of [-5, 0, 100]) {
    assert.throws(() => traceCaustics(slab(), { ...options, lightSource: { type: 'point', position: { x: 0, y: 0, z } } }));
  }
});
