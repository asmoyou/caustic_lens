import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GeometryAnalyzer, HTMLReportGenerator, ReportGenerator } from '../src/utils/reportGenerator';
import { defaultParameters } from '../src/stores/projectStore';
import type { LensGeometry } from '../src/types';
import { JSDOM } from 'jsdom';
import type { CausticsRenderResult } from '../src/stores/projectStore';

const tetrahedron: LensGeometry = {
  vertices: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }],
  faces: [[0, 2, 1], [0, 1, 3], [0, 3, 2], [1, 2, 3]], normals: [], uvs: [],
};

test('volume does not change when the model is translated away from the origin', () => {
  const translated = { ...tetrahedron, vertices: tetrahedron.vertices.map(v => ({ x: v.x + 10, y: v.y + 20, z: v.z + 30 })) };
  assert.ok(Math.abs(GeometryAnalyzer.calculateVolume(translated) - 1 / 6) < 1e-9);
  assert.ok(Math.abs(GeometryAnalyzer.calculateVolume(tetrahedron) - 1 / 6) < 1e-9);
});

test('report snapshots retain point-source settings and successful projection data', () => {
  const parameters = structuredClone(defaultParameters);
  parameters.lightSource.type = 'point';
  parameters.lightSource.position = { x: 12, y: -4, z: -150 };
  const projection: CausticsRenderResult = {
    id: 'projection', timestamp: 1, imageData: 'data:image/png;base64,AQID', renderTime: 520, status: 'success',
    parameters: { focalLength: 1500, targetDistance: 1000, material: 'acrylic', lightSourceType: 'point' },
    statistics: { tracedRays: 100, receivedRays: 64, totalInternalReflections: 3, screenWidth: 640, peakIrradiance: 0.87 },
  };
  const snapshot = ReportGenerator.createSnapshot('设计', { url: 'data:image/png;base64,AQID', name: 'source.png' },
    tetrahedron, parameters, 1.23, { projection, logoDataUrl: 'data:image/svg+xml,%3Csvg%2F%3E' });
  parameters.lightSource.position.x = 999;
  parameters.focalLengthMeters = 4;
  projection.imageData = '';
  projection.statistics!.receivedRays = 0;
  const document = new JSDOM(HTMLReportGenerator.generate(snapshot)).window.document;
  const fields = new Map(Array.from(document.querySelectorAll('.parameter-grid > div')).map(row => [
    row.querySelector('dt')!.textContent, row.querySelector('strong')!.textContent,
  ]));
  assert.equal(fields.get('算法焦距'), '1.50');
  assert.equal(fields.get('仿真光源'), '理想点光源');
  assert.equal(fields.get('光源 X'), '12.0');
  assert.equal(fields.get('光源到入射面'), '150.0');
  assert.equal(fields.get('接收屏宽度'), '640.0');
  assert.equal(fields.get('接收样本 / 总样本'), '64 / 100');
  assert.equal(document.querySelector('img[alt="焦散投影（受光面）"]')!.getAttribute('src'), 'data:image/png;base64,AQID');
  assert.ok(document.querySelector('.report-brand img')!.getAttribute('src')!.startsWith('data:image/svg+xml,'));
});

test('unfinished projections are not presented as completed simulation images', () => {
  const snapshot = ReportGenerator.createSnapshot('设计', { url: 'data:image/png;base64,AQID', name: 'source.png' },
    tetrahedron, defaultParameters, 1, { projection: {
      id: 'pending', timestamp: 1, imageData: 'data:image/png;base64,AQID', renderTime: 0, status: 'processing',
      parameters: { focalLength: 1500, targetDistance: 1000, material: 'acrylic' },
    } });
  const document = new JSDOM(HTMLReportGenerator.generate(snapshot)).window.document;
  assert.equal(document.querySelector('img[alt="焦散投影（受光面）"]'), null);
  assert.equal(document.querySelector('.report-status')!.textContent, '投影计算中');
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
