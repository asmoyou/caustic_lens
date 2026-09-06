import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { defaultParameters, useProjectStore } from '../src/stores/projectStore';

beforeEach(() => useProjectStore.getState().reset());
const geometry = { vertices: [{ x: 0, y: 0, z: 0 }], faces: [], normals: [], uvs: [] };

test('replacing an image clears derived data and invalidates ongoing jobs', () => {
  useProjectStore.setState({ geometry, isProcessing: true, progress: 80, iterationImages: ['old'] });
  const previous = useProjectStore.getState().revision;
  useProjectStore.getState().setImage({ url: 'sample.png', name: 'sample' });
  const state = useProjectStore.getState();
  assert.equal(state.geometry, null);
  assert.equal(state.isProcessing, false);
  assert.deepEqual(state.iterationImages, []);
  assert.ok(state.revision > previous);
});

test('geometry parameters invalidate the model, projection distance does not', () => {
  useProjectStore.getState().setGeometry(geometry);
  useProjectStore.getState().setParameters({ targetDistance: 500 });
  assert.equal(useProjectStore.getState().geometry, geometry);
  useProjectStore.getState().setParameters({ resolution: 64 });
  assert.equal(useProjectStore.getState().geometry, null);
});

test('removing an image preserves settings and resetting restores shared defaults', () => {
  useProjectStore.getState().setParameters({ resolution: 64 });
  useProjectStore.getState().clearImage();
  assert.equal(useProjectStore.getState().parameters.resolution, 64);
  useProjectStore.getState().reset();
  assert.deepEqual(useProjectStore.getState().parameters, defaultParameters);
  assert.notEqual(useProjectStore.getState().parameters, defaultParameters);
});

test('light source changes invalidate projections without regenerating the lens', () => {
  useProjectStore.getState().setGeometry(geometry);
  const before = useProjectStore.getState();
  useProjectStore.getState().setParameters({ lightSource: { ...before.parameters.lightSource, type: 'point' } });
  const after = useProjectStore.getState();
  assert.equal(after.geometry, geometry);
  assert.ok(after.revision > before.revision);
  assert.deepEqual(after.causticsRenderResults, []);
});
