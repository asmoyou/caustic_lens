import { Mesh, MeshBasicMaterial, Vector3 } from 'three';
import { STLExporter as ThreeSTLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { OBJExporter as ThreeOBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import { PLYExporter as ThreePLYExporter } from 'three/examples/jsm/exporters/PLYExporter.js';
import type { CausticParameters, LensGeometry } from '../types';
import { toBufferGeometry, validateGeometry } from './geometry';

export type ExportFormat = 'stl' | 'obj' | 'ply' | 'step' | 'json';
export type ExportUnits = 'mm' | 'cm' | 'inch';
export interface ExportOptions {
  format: ExportFormat;
  scale?: number;
  units?: ExportUnits;
  filename?: string;
  sourceImage?: string;
  parameters?: CausticParameters;
}
const unitScales: Record<ExportUnits, number> = { mm: 1, cm: 0.1, inch: 1 / 25.4 };

export function scaleGeometry(geometry: LensGeometry, scale = 1, units: ExportUnits = 'mm'): LensGeometry {
  validateGeometry(geometry);
  if (!Number.isFinite(scale) || scale <= 0 || !(units in unitScales)) throw new Error('导出比例或单位无效');
  const factor = scale * unitScales[units];
  const scaled = { ...geometry, vertices: geometry.vertices.map(v => ({ x: v.x * factor, y: v.y * factor, z: v.z * factor })) };
  validateGeometry(scaled);
  return scaled;
}

function stepReal(value: number): string { return value.toExponential(12).replace('e', 'E'); }

export function generateSTEP(geometry: LensGeometry, units: ExportUnits = 'mm'): string {
  validateGeometry(geometry);
  const lines = ['ISO-10303-21;', 'HEADER;', "FILE_DESCRIPTION(('Caustic Lens faceted model'),'2;1');",
    `FILE_NAME('lens.step','${new Date().toISOString()}',('Caustic Lens Designer'),(''),'','','');`,
    "FILE_SCHEMA(('CONFIG_CONTROL_DESIGN'));", 'ENDSEC;', 'DATA;'];
  let id = 0;
  const add = (entity: string) => { const ref = `#${++id}`; lines.push(`${ref}=${entity};`); return ref; };
  const app = add("APPLICATION_CONTEXT('configuration controlled 3d designs of mechanical parts and assemblies')");
  add(`APPLICATION_PROTOCOL_DEFINITION('international standard','config_control_design',1994,${app})`);
  const productContext = add(`PRODUCT_CONTEXT('',${app},'mechanical')`);
  const product = add(`PRODUCT('CausticLens','Caustic Lens','',(${productContext}))`);
  const formation = add(`PRODUCT_DEFINITION_FORMATION('','',${product})`);
  const definitionContext = add(`PRODUCT_DEFINITION_CONTEXT('part definition',${app},'design')`);
  const definition = add(`PRODUCT_DEFINITION('design','',${formation},${definitionContext})`);
  const lengthSI = add(`(LENGTH_UNIT() NAMED_UNIT(*) SI_UNIT(${units === 'cm' ? '.CENTI.' : '.MILLI.'},.METRE.))`);
  let length = lengthSI;
  if (units === 'inch') {
    const dimensions = add('DIMENSIONAL_EXPONENTS(1.,0.,0.,0.,0.,0.,0.)');
    const conversion = add(`LENGTH_MEASURE_WITH_UNIT(LENGTH_MEASURE(25.4),${lengthSI})`);
    length = add(`(CONVERSION_BASED_UNIT('INCH',${conversion}) LENGTH_UNIT() NAMED_UNIT(${dimensions}))`);
  }
  const angle = add('(NAMED_UNIT(*) PLANE_ANGLE_UNIT() SI_UNIT($,.RADIAN.))');
  const solidAngle = add('(NAMED_UNIT(*) SI_UNIT($,.STERADIAN.) SOLID_ANGLE_UNIT())');
  const uncertainty = add(`UNCERTAINTY_MEASURE_WITH_UNIT(LENGTH_MEASURE(1.E-7),${length},'distance_accuracy_value','')`);
  const context = add(`(GEOMETRIC_REPRESENTATION_CONTEXT(3) GLOBAL_UNCERTAINTY_ASSIGNED_CONTEXT((${uncertainty})) GLOBAL_UNIT_ASSIGNED_CONTEXT((${length},${angle},${solidAngle})) REPRESENTATION_CONTEXT('','3D'))`);
  const points = new Map<string, string>();
  const refs = geometry.vertices.map(v => {
    const key = [v.x, v.y, v.z].map(stepReal).join(',');
    if (!points.has(key)) points.set(key, add(`CARTESIAN_POINT('',(${key}))`));
    return points.get(key)!;
  });
  const edges = new Map<string, { count: number; orientation: number }>();
  const faces: string[] = [];
  for (const face of geometry.faces) {
    const [a, b, c] = face.map(index => new Vector3().copy(geometry.vertices[index]));
    const edge = b.clone().sub(a).normalize();
    const normal = b.sub(a).cross(c.sub(a));
    if (normal.lengthSq() < 1e-24) throw new Error('STEP 导出遇到退化面片');
    normal.normalize();
    for (let i = 0; i < 3; i++) {
      const from = refs[face[i]], to = refs[face[(i + 1) % 3]];
      const key = from < to ? `${from}:${to}` : `${to}:${from}`;
      const previous = edges.get(key) ?? { count: 0, orientation: 0 };
      edges.set(key, { count: previous.count + 1, orientation: previous.orientation + (from < to ? 1 : -1) });
    }
    const axis = add(`DIRECTION('',(${normal.toArray().map(stepReal).join(',')}))`);
    const reference = add(`DIRECTION('',(${edge.toArray().map(stepReal).join(',')}))`);
    const placement = add(`AXIS2_PLACEMENT_3D('',${refs[face[0]]},${axis},${reference})`);
    const plane = add(`PLANE('',${placement})`);
    const loop = add(`POLY_LOOP('',(${face.map(index => refs[index]).join(',')}))`);
    const bound = add(`FACE_OUTER_BOUND('',${loop},.T.)`);
    // POLY_LOOP bounds belong to FACE_SURFACE in a faceted BREP, not ADVANCED_FACE.
    faces.push(add(`FACE_SURFACE('',(${bound}),${plane},.T.)`));
  }
  if ([...edges.values()].some(edge => edge.count !== 2 || edge.orientation !== 0)) throw new Error('STEP 导出需要方向一致的封闭模型');
  const shell = add(`CLOSED_SHELL('',(${faces.join(',')}))`);
  const solid = add(`FACETED_BREP('',${shell})`);
  const representation = add(`FACETED_BREP_SHAPE_REPRESENTATION('',(${solid}),${context})`);
  const shape = add(`PRODUCT_DEFINITION_SHAPE('','',${definition})`);
  add(`SHAPE_DEFINITION_REPRESENTATION(${shape},${representation})`);
  lines.push('ENDSEC;', 'END-ISO-10303-21;');
  return lines.join('\n');
}

export function serializeGeometry(geometry: LensGeometry, options: ExportOptions): string | ArrayBuffer {
  const units = options.units ?? 'mm';
  const scaled = scaleGeometry(geometry, options.scale, units);
  if (options.format === 'step') return generateSTEP(scaled, units);
  if (options.format === 'json') return JSON.stringify({
    metadata: { type: 'CausticLens', version: '1.1', units, scale: options.scale ?? 1,
      sourceImage: options.sourceImage, timestamp: new Date().toISOString() },
    geometry: scaled, parameters: options.parameters,
  }, null, 2);
  const buffer = toBufferGeometry(scaled);
  const material = new MeshBasicMaterial();
  const mesh = new Mesh(buffer, material);
  try {
    if (options.format === 'stl') return new ThreeSTLExporter().parse(mesh, { binary: true }).buffer;
    if (options.format === 'obj') return new ThreeOBJExporter().parse(mesh);
    if (options.format === 'ply') return new ThreePLYExporter().parse(mesh, undefined!, { binary: false })!;
    throw new Error('不支持的导出格式');
  } finally { buffer.dispose(); material.dispose(); }
}

export function downloadExport(content: string | ArrayBuffer, filename: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: 'application/octet-stream' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportGeometry(geometry: LensGeometry, options: ExportOptions): void {
  downloadExport(serializeGeometry(geometry, options), options.filename ?? `lens.${options.format}`);
}
