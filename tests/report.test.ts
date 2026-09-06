import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GeometryAnalyzer, HTMLReportGenerator, ReportGenerator } from '../src/utils/reportGenerator';
import { defaultParameters } from '../src/stores/projectStore';
import type { LensGeometry } from '../src/types';

const tetrahedron: LensGeometry = {
  vertices: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }],
  faces: [[0, 2, 1], [0, 1, 3], [0, 3, 2], [1, 2, 3]], normals: [], uvs: [],
};

test('volume does not change when the model is translated away from the origin', () => {
  const translated = { ...tetrahedron, vertices: tetrahedron.vertices.map(v => ({ x: v.x + 10, y: v.y + 20, z: v.z + 30 })) };
  assert.ok(Math.abs(GeometryAnalyzer.calculateVolume(translated) - 1 / 6) < 1e-9);
  assert.ok(Math.abs(GeometryAnalyzer.calculateVolume(tetrahedron) - 1 / 6) < 1e-9);
});

test('HTML reports embed image bytes, escape user content and use actual geometry and settings', async () => {
  const file = new File([new Uint8Array([1, 2, 3])], 'source.png', { type: 'image/png' });
  const report = await ReportGenerator.generateReport('<script>alert(1)</script>',
    { url: 'blob:temporary', file, name: '<img onerror="alert(1)">' }, tetrahedron,
    { ...defaultParameters, focalLengthMeters: 2.5, optimization: { ...defaultParameters.optimization, iterations: 7 } }, 1.234);
  const html = HTMLReportGenerator.generate(report);
  assert.ok(html.includes('data:image/png;base64,AQID'));
  assert.ok(!html.includes('blob:temporary'));
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('&lt;img onerror=&quot;'));
  assert.ok(html.includes('>2.50<'));
  assert.ok(html.includes('>7<'));
  assert.ok(html.includes('>1.000<'));
});
