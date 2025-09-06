import { Point3D, LensGeometry } from '../../types';

export class GeometryGenerator {
  private smoothingIterations: number = 3;
  private subdivisionLevel: number = 2;

  constructor() {}

  // 网格生成
  generateMesh(vertices: Point3D[], resolution: number): LensGeometry {
    const faces = this.generateFaces(vertices, resolution);
    const smoothedVertices = this.smoothSurface(vertices, faces);
    const normals = this.calculateNormals(smoothedVertices, faces);
    const uvs = this.generateUVCoordinates(smoothedVertices, resolution);

    return {
      vertices: smoothedVertices,
      faces,
      normals,
      uvs
    };
  }

  // 生成面片
  private generateFaces(vertices: Point3D[], resolution: number): number[][] {
    const faces: number[][] = [];
    
    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        const idx = i * (resolution + 1) + j;
        const nextRow = (i + 1) * (resolution + 1) + j;
        
        // 创建两个三角形组成一个四边形
        faces.push([idx, nextRow, idx + 1]);
        faces.push([nextRow, nextRow + 1, idx + 1]);
      }
    }
    
    return faces;
  }

  // 表面平滑算法（拉普拉斯平滑）
  smoothSurface(vertices: Point3D[], faces: number[][]): Point3D[] {
    let smoothedVertices = [...vertices];
    
    for (let iteration = 0; iteration < this.smoothingIterations; iteration++) {
      const newVertices = [...smoothedVertices];
      
      for (let i = 0; i < vertices.length; i++) {
        const neighbors = this.getNeighbors(i, faces);
        if (neighbors.length === 0) continue;
        
        // 计算邻居顶点的平均位置
        let avgX = 0, avgY = 0, avgZ = 0;
        for (const neighborIdx of neighbors) {
          avgX += smoothedVertices[neighborIdx].x;
          avgY += smoothedVertices[neighborIdx].y;
          avgZ += smoothedVertices[neighborIdx].z;
        }
        
        avgX /= neighbors.length;
        avgY /= neighbors.length;
        avgZ /= neighbors.length;
        
        // 应用平滑因子
        const smoothingFactor = 0.1;
        newVertices[i] = {
          x: smoothedVertices[i].x + smoothingFactor * (avgX - smoothedVertices[i].x),
          y: smoothedVertices[i].y + smoothingFactor * (avgY - smoothedVertices[i].y),
          z: smoothedVertices[i].z + smoothingFactor * (avgZ - smoothedVertices[i].z)
        };
      }
      
      smoothedVertices = newVertices;
    }
    
    return smoothedVertices;
  }

  // 获取顶点的邻居
  private getNeighbors(vertexIndex: number, faces: number[][]): number[] {
    const neighbors = new Set<number>();
    
    for (const face of faces) {
      const idx = face.indexOf(vertexIndex);
      if (idx !== -1) {
        // 添加同一面片中的其他顶点
        for (let i = 0; i < face.length; i++) {
          if (i !== idx) {
            neighbors.add(face[i]);
          }
        }
      }
    }
    
    return Array.from(neighbors);
  }

  // 计算法向量
  calculateNormals(vertices: Point3D[], faces: number[][]): Point3D[] {
    const normals: Point3D[] = new Array(vertices.length).fill(null).map(() => ({ x: 0, y: 0, z: 0 }));
    
    // 计算每个面的法向量并累加到顶点
    for (const face of faces) {
      const v0 = vertices[face[0]];
      const v1 = vertices[face[1]];
      const v2 = vertices[face[2]];
      
      // 计算面法向量
      const faceNormal = this.calculateFaceNormal(v0, v1, v2);
      
      // 累加到每个顶点
      for (const vertexIdx of face) {
        normals[vertexIdx].x += faceNormal.x;
        normals[vertexIdx].y += faceNormal.y;
        normals[vertexIdx].z += faceNormal.z;
      }
    }
    
    // 归一化法向量
    return normals.map(normal => this.normalize(normal));
  }

  // 计算面法向量
  private calculateFaceNormal(v0: Point3D, v1: Point3D, v2: Point3D): Point3D {
    // 计算两个边向量
    const edge1 = {
      x: v1.x - v0.x,
      y: v1.y - v0.y,
      z: v1.z - v0.z
    };
    
    const edge2 = {
      x: v2.x - v0.x,
      y: v2.y - v0.y,
      z: v2.z - v0.z
    };
    
    // 计算叉积
    return {
      x: edge1.y * edge2.z - edge1.z * edge2.y,
      y: edge1.z * edge2.x - edge1.x * edge2.z,
      z: edge1.x * edge2.y - edge1.y * edge2.x
    };
  }

  // 向量归一化
  private normalize(vector: Point3D): Point3D {
    const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
    if (length === 0) return { x: 0, y: 0, z: 1 }; // 默认向上
    
    return {
      x: vector.x / length,
      y: vector.y / length,
      z: vector.z / length
    };
  }

  // 生成UV坐标
  private generateUVCoordinates(vertices: Point3D[], resolution: number): { x: number; y: number }[] {
    const uvs: { x: number; y: number }[] = [];
    
    for (let i = 0; i <= resolution; i++) {
      for (let j = 0; j <= resolution; j++) {
        uvs.push({
          x: j / resolution,
          y: i / resolution
        });
      }
    }
    
    return uvs;
  }

  // 网格细分
  subdivideMesh(geometry: LensGeometry): LensGeometry {
    const { vertices, faces } = geometry;
    const newVertices = [...vertices];
    const newFaces: number[][] = [];
    
    // 为每条边创建中点
    const edgeMap = new Map<string, number>();
    
    for (const face of faces) {
      const newFaceVertices: number[] = [];
      
      for (let i = 0; i < face.length; i++) {
        const v1 = face[i];
        const v2 = face[(i + 1) % face.length];
        
        // 添加原始顶点
        newFaceVertices.push(v1);
        
        // 创建或获取边的中点
        const edgeKey = `${Math.min(v1, v2)}-${Math.max(v1, v2)}`;
        if (!edgeMap.has(edgeKey)) {
          const midpoint = {
            x: (vertices[v1].x + vertices[v2].x) / 2,
            y: (vertices[v1].y + vertices[v2].y) / 2,
            z: (vertices[v1].z + vertices[v2].z) / 2
          };
          edgeMap.set(edgeKey, newVertices.length);
          newVertices.push(midpoint);
        }
        
        newFaceVertices.push(edgeMap.get(edgeKey)!);
      }
      
      // 创建细分后的面片
      this.createSubdividedFaces(newFaceVertices, newFaces);
    }
    
    // 重新计算法向量和UV坐标
    const normals = this.calculateNormals(newVertices, newFaces);
    const uvs = this.generateUVCoordinatesFromVertices(newVertices);
    
    return {
      vertices: newVertices,
      faces: newFaces,
      normals,
      uvs
    };
  }

  // 创建细分后的面片
  private createSubdividedFaces(vertices: number[], faces: number[][]): void {
    if (vertices.length === 6) { // 三角形细分
      // 创建4个新三角形
      faces.push([vertices[0], vertices[1], vertices[5]]);
      faces.push([vertices[1], vertices[2], vertices[3]]);
      faces.push([vertices[3], vertices[4], vertices[5]]);
      faces.push([vertices[1], vertices[3], vertices[5]]);
    }
  }

  // 从顶点生成UV坐标
  private generateUVCoordinatesFromVertices(vertices: Point3D[]): { x: number; y: number }[] {
    // 找到边界
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    for (const vertex of vertices) {
      minX = Math.min(minX, vertex.x);
      maxX = Math.max(maxX, vertex.x);
      minY = Math.min(minY, vertex.y);
      maxY = Math.max(maxY, vertex.y);
    }
    
    const rangeX = maxX - minX;
    const rangeY = maxY - minY;
    
    return vertices.map(vertex => ({
      x: rangeX > 0 ? (vertex.x - minX) / rangeX : 0,
      y: rangeY > 0 ? (vertex.y - minY) / rangeY : 0
    }));
  }

  // 网格质量检查
  checkMeshQuality(geometry: LensGeometry): {
    hasDegenerate: boolean;
    hasNonManifold: boolean;
    aspectRatio: number;
    vertexCount: number;
    faceCount: number;
  } {
    const { vertices, faces } = geometry;
    
    let hasDegenerate = false;
    let totalAspectRatio = 0;
    
    // 检查退化面片
    for (const face of faces) {
      const v0 = vertices[face[0]];
      const v1 = vertices[face[1]];
      const v2 = vertices[face[2]];
      
      const area = this.calculateTriangleArea(v0, v1, v2);
      if (area < 1e-10) {
        hasDegenerate = true;
      }
      
      // 计算纵横比
      const aspectRatio = this.calculateAspectRatio(v0, v1, v2);
      totalAspectRatio += aspectRatio;
    }
    
    return {
      hasDegenerate,
      hasNonManifold: false, // 简化实现
      aspectRatio: totalAspectRatio / faces.length,
      vertexCount: vertices.length,
      faceCount: faces.length
    };
  }

  // 计算三角形面积
  private calculateTriangleArea(v0: Point3D, v1: Point3D, v2: Point3D): number {
    const edge1 = {
      x: v1.x - v0.x,
      y: v1.y - v0.y,
      z: v1.z - v0.z
    };
    
    const edge2 = {
      x: v2.x - v0.x,
      y: v2.y - v0.y,
      z: v2.z - v0.z
    };
    
    const cross = this.calculateFaceNormal(v0, v1, v2);
    const length = Math.sqrt(cross.x * cross.x + cross.y * cross.y + cross.z * cross.z);
    
    return length / 2;
  }

  // 计算纵横比
  private calculateAspectRatio(v0: Point3D, v1: Point3D, v2: Point3D): number {
    const edge1Length = this.distance(v0, v1);
    const edge2Length = this.distance(v1, v2);
    const edge3Length = this.distance(v2, v0);
    
    const maxEdge = Math.max(edge1Length, edge2Length, edge3Length);
    const minEdge = Math.min(edge1Length, edge2Length, edge3Length);
    
    return minEdge > 0 ? maxEdge / minEdge : Infinity;
  }

  // 计算两点距离
  private distance(p1: Point3D, p2: Point3D): number {
    return Math.sqrt(
      (p1.x - p2.x) ** 2 + 
      (p1.y - p2.y) ** 2 + 
      (p1.z - p2.z) ** 2
    );
  }

  // 设置平滑参数
  setSmoothingParameters(iterations: number, subdivisionLevel: number) {
    this.smoothingIterations = iterations;
    this.subdivisionLevel = subdivisionLevel;
  }

  // 应用多级细分
  applyMultiLevelSubdivision(geometry: LensGeometry): LensGeometry {
    let result = geometry;
    
    for (let level = 0; level < this.subdivisionLevel; level++) {
      result = this.subdivideMesh(result);
    }
    
    return result;
  }
}