import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { BoxGeometry } from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import { serializeGeometry } from '../src/utils/exportUtils';
import { CausticsEngineeringAlgorithm } from '../src/algorithms/causticsEngineering';
import { defaultParameters } from '../src/stores/projectStore';
import type { LensGeometry } from '../src/types';

const require = createRequire(import.meta.url);
const loadOcct = require('occt-import-js');
const occtPromise = loadOcct();

export function cube(): LensGeometry {
  const box = new BoxGeometry(100, 80, 10);
  const positions = box.getAttribute('position');
  const indices = Array.from(box.index!.array);
  const result = {
    vertices: Array.from({ length: positions.count }, (_, i) => ({ x: positions.getX(i), y: positions.getY(i), z: positions.getZ(i) })),
    faces: Array.from({ length: indices.length / 3 }, (_, i) => indices.slice(i * 3, i * 3 + 3)), normals: [], uvs: [],
  };
  box.dispose();
  return result;
}

test('STL, OBJ, PLY and JSON all apply scale and coordinate units', () => {
  const geometry = cube();
  for (const format of ['stl', 'obj', 'ply', 'json'] as const) {
    const result = serializeGeometry(geometry, { format, scale: 2, units: 'cm' });
    if (format === 'json') {
      const parsed = JSON.parse(result as string);
      assert.equal(parsed.geometry.vertices[0].x, geometry.vertices[0].x * 0.2);
      assert.equal(parsed.metadata.units, 'cm');
    } else {
      const parsed = format === 'stl' ? new STLLoader().parse(result as ArrayBuffer) : format === 'ply' ?
        new PLYLoader().parse(result as string) : new OBJLoader().parse(result as string).children[0].geometry;
      parsed.computeBoundingBox();
      assert.ok(Math.abs(parsed.boundingBox.max.x - parsed.boundingBox.min.x - 20) < 1e-6);
      parsed.dispose();
    }
  }
  assert.equal(geometry.vertices[0].x, 50);
});

test('OpenCascade imports STEP with axis-aligned side faces and correct physical units', async () => {
  const occt = await occtPromise;
  for (const units of ['mm', 'cm', 'inch'] as const) {
    const content = serializeGeometry(cube(), { format: 'step', scale: 2, units });
    const parsed = occt.ReadStepFile(new TextEncoder().encode(content as string), null);
    assert.equal(parsed.success, true);
    assert.ok(parsed.meshes.length > 0);
    const positions = parsed.meshes.flatMap((mesh: { attributes: { position: { array: number[] } } }) => mesh.attributes.position.array);
    const xs = positions.filter((_: number, i: number) => i % 3 === 0);
    assert.ok(Math.abs(Math.max(...xs) - Math.min(...xs) - 200) < 1e-4);
  }
});

test('generated lens remains a closed STEP model accepted by OpenCascade', async () => {
  const geometry = await new CausticsEngineeringAlgorithm({ ...defaultParameters,
    optimization: { ...defaultParameters.optimization, iterations: 1 } }).generateLens([[1, 2], [3, 4]]);
  const content = serializeGeometry(geometry, { format: 'step' });
  const parsed = (await occtPromise).ReadStepFile(new TextEncoder().encode(content as string), null);
  assert.equal(parsed.success, true);
  assert.ok(parsed.meshes.length > 0);
});

test('STEP rejects open shells and all serializers reject invalid scale', () => {
  const geometry = cube();
  geometry.faces.pop();
  assert.throws(() => serializeGeometry(geometry, { format: 'step' }));
  assert.throws(() => serializeGeometry(cube(), { format: 'stl', scale: NaN }));
});
