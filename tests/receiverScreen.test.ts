import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Raycaster, Texture, Vector3 } from 'three';
import { createReceiverScreen } from '../src/components/viewer/receiverScreen';
import { receiverImageCoordinates } from '../src/algorithms/receiverCoordinates';

test('incoming rays hit the textured illuminated face before the opaque backing', () => {
  const screen = createReceiverScreen(100, new Texture());
  try {
    screen.object.updateMatrixWorld(true);
    const hits = new Raycaster(new Vector3(20, 10, -10), new Vector3(0, 0, 1)).intersectObject(screen.object);
    assert.equal(hits[0].object.name, 'caustic-screen');
    assert.ok(hits[0].face!.normal.z < -0.99);
    assert.ok(Math.abs(hits[0].point.z) < 1e-10);
    const coordinates = receiverImageCoordinates(20, 10, 0, 0, 100);
    assert.ok(Math.abs(hits[0].uv!.x - coordinates.u) < 1e-10);
    assert.ok(Math.abs(1 - hits[0].uv!.y - coordinates.v) < 1e-10);
    assert.ok(hits[1].point.z > hits[0].point.z);
  } finally { screen.dispose(); }
});

test('the back is opaque and never shows the projection texture', () => {
  const screen = createReceiverScreen(100, null);
  try {
    screen.object.updateMatrixWorld(true);
    const hits = new Raycaster(new Vector3(0, 0, 10), new Vector3(0, 0, -1)).intersectObject(screen.object);
    assert.equal(hits[0].object.name, 'receiver-backing');
    assert.equal(hits.some(hit => hit.object.name === 'caustic-screen'), false);
  } finally { screen.dispose(); }
});
