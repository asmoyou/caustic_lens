import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeTarget, triangleCollapseTimes } from '../src/algorithms/causticsEngineering/numerics';
import { CausticsEngineeringAlgorithm } from '../src/algorithms/causticsEngineering';
import { useProjectStore } from '../src/stores/projectStore';

test('target normalization rejects black, malformed and nonfinite images', () => {
  for (const rows of [[], [[1]], [[1, 2], [3]], [[0, 0], [0, 0]], [[1, NaN], [0, 0]]]) {
    assert.throws(() => normalizeTarget(rows));
  }
  assert.deepEqual(normalizeTarget([[0, 1, 2], [3, 0, 0]]), [[0, 1, 2], [3, 0, 0]]);
});

test('collapse time uses the second edge vertical velocity', () => {
  assert.deepEqual(triangleCollapseTimes(1, 0, 0, 1, 0, 0, 0, -2), [0.5, 0.5]);
  assert.deepEqual(triangleCollapseTimes(1, 0, 0, 1, 0, 0, 0, 0), [Infinity, Infinity]);
});

test('generation honors iteration count, supports rectangular input and preserves 100mm dimensions', async () => {
  const parameters = structuredClone(useProjectStore.getState().parameters);
  parameters.optimization.iterations = 2;
  const progress: number[] = [];
  const iterations: number[] = [];
  const algorithm = new CausticsEngineeringAlgorithm(parameters);
  const geometry = await algorithm.generateLens([[1, 1, 1], [1, 1, 1]],
    value => progress.push(value), (_, iteration) => iterations.push(iteration));
  assert.deepEqual(iterations, [1, 2]);
  assert.equal(geometry.vertices.length, 2 * 4 * 3);
  for (const vertex of geometry.vertices) assert.ok(Object.values(vertex).every(Number.isFinite));
  assert.equal(Math.max(...geometry.vertices.map(v => v.x)), 50);
  assert.equal(Math.min(...geometry.vertices.map(v => v.x)), -50);
  assert.equal(Math.max(...geometry.vertices.map(v => v.y)), 50);
  assert.equal(Math.min(...geometry.vertices.map(v => v.y)), -50);
  assert.equal(progress.at(-1), 100);
  assert.ok(progress.every((value, index) => index === 0 || value >= progress[index - 1]));
});

test('cancellation rejects instead of returning a partial model', async () => {
  const algorithm = new CausticsEngineeringAlgorithm(useProjectStore.getState().parameters);
  await assert.rejects(algorithm.generateLens([[1, 2], [2, 1]], () => algorithm.stop()), { name: 'AbortError' });
});
