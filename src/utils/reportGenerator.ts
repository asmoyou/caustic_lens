import type { LensGeometry, ImageData, CausticParameters } from '../types';
import type { CausticsRenderResult } from '../stores/projectStore';
import { validateGeometry } from './geometry';
import { renderReport } from './reportTemplate';

export interface ReportContext {
  projection?: CausticsRenderResult;
  logoDataUrl?: string;
}

export interface ReportData extends ReportContext {
  projectName: string;
  generatedAt: Date;
  image: ImageData;
  geometry: LensGeometry;
  parameters: CausticParameters;
  statistics: {
    vertexCount: number;
    faceCount: number;
    surfaceArea: number;
    volume: number;
    processingTime: number;
    bounds: ReturnType<typeof GeometryAnalyzer.getBoundingBox>;
  };
}

export class HTMLReportGenerator {
  static generate(data: ReportData): string { return renderReport(data); }

  static download(data: ReportData, filename = 'caustic-lens-report.html'): void {
    const url = URL.createObjectURL(new Blob([this.generate(data)], { type: 'text/html;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export class GeometryAnalyzer {
  static calculateSurfaceArea(geometry: LensGeometry): number {
    let totalArea = 0;
    for (const face of geometry.faces) {
      const v1 = geometry.vertices[face[0]];
      const v2 = geometry.vertices[face[1]];
      const v3 = geometry.vertices[face[2]];
      const a = Math.sqrt((v2.x - v1.x) ** 2 + (v2.y - v1.y) ** 2 + (v2.z - v1.z) ** 2);
      const b = Math.sqrt((v3.x - v2.x) ** 2 + (v3.y - v2.y) ** 2 + (v3.z - v2.z) ** 2);
      const c = Math.sqrt((v1.x - v3.x) ** 2 + (v1.y - v3.y) ** 2 + (v1.z - v3.z) ** 2);
      const s = (a + b + c) / 2;
      const area = Math.sqrt(s * (s - a) * (s - b) * (s - c));
      if (!isNaN(area)) totalArea += area;
    }
    return totalArea;
  }

  static calculateVolume(geometry: LensGeometry): number {
    let volume = 0;
    for (const face of geometry.faces) {
      const v1 = geometry.vertices[face[0]];
      const v2 = geometry.vertices[face[1]];
      const v3 = geometry.vertices[face[2]];
      volume += (v1.x * (v2.y * v3.z - v2.z * v3.y) +
        v2.x * (v3.y * v1.z - v3.z * v1.y) + v3.x * (v1.y * v2.z - v1.z * v2.y)) / 6;
    }
    return Math.abs(volume);
  }

  static getBoundingBox(geometry: LensGeometry) {
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (const vertex of geometry.vertices) {
      minX = Math.min(minX, vertex.x); minY = Math.min(minY, vertex.y); minZ = Math.min(minZ, vertex.z);
      maxX = Math.max(maxX, vertex.x); maxY = Math.max(maxY, vertex.y); maxZ = Math.max(maxZ, vertex.z);
    }
    return { min: { x: minX, y: minY, z: minZ }, max: { x: maxX, y: maxY, z: maxZ },
      size: { x: maxX - minX, y: maxY - minY, z: maxZ - minZ } };
  }
}

export class ReportGenerator {
  static createSnapshot(projectName: string, image: ImageData, geometry: LensGeometry,
    parameters: CausticParameters, processingTime: number, context: ReportContext = {}): ReportData {
    validateGeometry(geometry);
    return {
      projectName, generatedAt: new Date(), image: { ...image }, geometry,
      parameters: structuredClone(parameters),
      projection: context.projection ? structuredClone(context.projection) : undefined,
      logoDataUrl: context.logoDataUrl,
      statistics: {
        vertexCount: geometry.vertices.length, faceCount: geometry.faces.length,
        surfaceArea: GeometryAnalyzer.calculateSurfaceArea(geometry), volume: GeometryAnalyzer.calculateVolume(geometry),
        processingTime, bounds: GeometryAnalyzer.getBoundingBox(geometry),
      },
    };
  }

  static async prepareDownload(report: ReportData): Promise<ReportData> {
    const { image } = report;
    let blob: Blob;
    if (image.file) {
      blob = image.file;
    } else {
      const response = await fetch(image.url);
      if (!response.ok) throw new Error('源图像读取失败');
      blob = await response.blob();
    }
    if (!/^image\/(png|jpeg|webp|gif)$/.test(blob.type)) throw new Error('报告仅支持光栅图片');
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return { ...report, image: { ...image, file: undefined, url: `data:${blob.type};base64,${btoa(binary)}` } };
  }

  static async generateReport(projectName: string, image: ImageData, geometry: LensGeometry,
    parameters: CausticParameters, processingTime: number, context: ReportContext = {}): Promise<ReportData> {
    return this.prepareDownload(this.createSnapshot(projectName, image, geometry, parameters, processingTime, context));
  }

  static downloadHTMLReport(reportData: ReportData, filename?: string): void { HTMLReportGenerator.download(reportData, filename); }
  static getReportHTML(reportData: ReportData): string { return HTMLReportGenerator.generate(reportData); }
}
