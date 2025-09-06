import { CausticParameters, Point3D, LensGeometry, Point2D } from '../../types';

export class CausticEngine {
  private parameters: CausticParameters;
  private rayCount: number = 10000;
  private convergenceThreshold: number = 0.001;
  private maxIterations: number = 100;

  constructor(parameters: CausticParameters) {
    this.parameters = parameters;
  }

  generateLensGeometry(targetShape: number[][]): LensGeometry {
    if (targetShape.length === 0) {
      console.warn('Target shape is empty, creating default geometry');
      // 创建一个默认的简单几何体
      return this.createDefaultGeometry();
    }

    console.log('Generating lens geometry with target shape:', targetShape.length, 'points');
    console.log('Parameters:', this.parameters);
    
    const vertices = this.calculateLensSurface(targetShape);
    console.log('Generated vertices:', vertices.length);
    
    // 验证顶点数据
    const invalidVertices = vertices.filter(v => !isFinite(v.x) || !isFinite(v.y) || !isFinite(v.z));
    if (invalidVertices.length > 0) {
      console.error('Found invalid vertices:', invalidVertices.slice(0, 5));
    }
    
    const faces = this.generateFaces(vertices);
    console.log('Generated faces:', faces.length);
    
    const normals = this.calculateNormals(vertices, faces);
    console.log('Generated normals:', normals.length);
    
    // 验证法向量数据
    const invalidNormals = normals.filter(n => !isFinite(n.x) || !isFinite(n.y) || !isFinite(n.z));
    if (invalidNormals.length > 0) {
      console.error('Found invalid normals:', invalidNormals.slice(0, 5));
    }
    
    const uvs = this.generateUVCoordinates(vertices);
    console.log('Generated UVs:', uvs.length);

    const geometry = { vertices, faces, normals, uvs };
    
    // 验证几何体数据
    if (vertices.length === 0 || faces.length === 0) {
      console.warn('Generated geometry is invalid, using default');
      return this.createDefaultGeometry();
    }
    
    return geometry;
  }
  
  private createDefaultGeometry(): LensGeometry {
    // 创建一个简单的平面几何体作为默认值
    const vertices = [
      { x: -50, y: -50, z: 0 },
      { x: 50, y: -50, z: 0 },
      { x: 50, y: 50, z: 0 },
      { x: -50, y: 50, z: 0 }
    ];
    
    const faces = [
      [0, 1, 2],
      [0, 2, 3]
    ];
    
    const normals = [
      { x: 0, y: 0, z: 1 },
      { x: 0, y: 0, z: 1 },
      { x: 0, y: 0, z: 1 },
      { x: 0, y: 0, z: 1 }
    ];
    
    const uvs = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 }
    ];
    
    return { vertices, faces, normals, uvs };
  }

  private calculateLensSurface(targetShape: number[][]): Point3D[] {
    const { resolution, targetDistance, thickness, refractiveIndex, lensWidth, lensHeight } = this.parameters;
    const vertices: Point3D[] = [];
    const actualThickness = Math.max(thickness, 2); // 确保最小厚度

    console.log('Generating 3D lens with parameters:', {
      width: lensWidth,
      height: lensHeight,
      thickness: actualThickness,
      resolution
    });

    // 创建顶面网格（焦散表面）
    for (let i = 0; i <= resolution; i++) {
      for (let j = 0; j <= resolution; j++) {
        const u = i / resolution;
        const v = j / resolution;
        
        // 将UV坐标映射到目标形状
        const targetPoint = this.sampleTargetShape(targetShape, u, v);
        
        // 计算透镜表面高度
        const height = this.calculateSurfaceHeight(targetPoint, targetDistance, refractiveIndex);
        
        const x = (u - 0.5) * lensWidth;
        const y = (v - 0.5) * lensHeight;
        
        // 验证顶点坐标是否有效
        if (!isFinite(x) || !isFinite(y) || !isFinite(height)) {
          console.warn('Invalid vertex coordinates:', { x, y, z: height, u, v });
          vertices.push({
            x: isFinite(x) ? x : 0,
            y: isFinite(y) ? y : 0,
            z: isFinite(height) ? height : actualThickness / 2
          });
        } else {
          vertices.push({ x, y, z: height + actualThickness / 2 });
        }
      }
    }

    // 创建底面网格（平面）
    for (let i = 0; i <= resolution; i++) {
      for (let j = 0; j <= resolution; j++) {
        const u = i / resolution;
        const v = j / resolution;
        
        const x = (u - 0.5) * lensWidth;
        const y = (v - 0.5) * lensHeight;
        const z = -actualThickness / 2; // 底面位置
        
        vertices.push({ x, y, z });
      }
    }

    console.log('Generated vertices count:', vertices.length);
    return vertices;
  }

  private sampleTargetShape(targetShape: number[][], u: number, v: number): Point3D {
    // 验证输入参数
    if (!isFinite(u) || !isFinite(v)) {
      console.warn('Invalid UV coordinates:', { u, v });
      return { x: 0, y: 0, z: 0.5 };
    }
    
    const x = (u - 0.5) * 100; // 映射到透镜坐标系
    const y = (v - 0.5) * 100;
    
    // 如果目标形状为空，创建一个默认的焦散图案
    if (!targetShape || targetShape.length === 0) {
      const r = Math.sqrt(x * x + y * y) / 50;
      const intensity = Math.exp(-r * r) * (1 + 0.5 * Math.sin(r * 10)); // 高斯分布加波纹
      return { x, y, z: Math.max(0.1, intensity) };
    }
    
    const height = targetShape.length;
    const width = targetShape[0]?.length || 0;
    
    if (width === 0) {
      return { x, y, z: 1 };
    }
    
    // 使用双线性插值获得更平滑的采样
    const fi = u * (height - 1);
    const fj = v * (width - 1);
    
    const i0 = Math.floor(fi);
    const i1 = Math.min(i0 + 1, height - 1);
    const j0 = Math.floor(fj);
    const j1 = Math.min(j0 + 1, width - 1);
    
    const wu = fi - i0;
    const wv = fj - j0;
    
    // 双线性插值
    const v00 = (targetShape[i0] && targetShape[i0][j0]) ? targetShape[i0][j0] : 0;
    const v01 = (targetShape[i0] && targetShape[i0][j1]) ? targetShape[i0][j1] : 0;
    const v10 = (targetShape[i1] && targetShape[i1][j0]) ? targetShape[i1][j0] : 0;
    const v11 = (targetShape[i1] && targetShape[i1][j1]) ? targetShape[i1][j1] : 0;
    
    const intensity = v00 * (1 - wu) * (1 - wv) +
                     v01 * (1 - wu) * wv +
                     v10 * wu * (1 - wv) +
                     v11 * wu * wv;
    
    return {
      x,
      y,
      z: Math.max(0.1, Math.min(intensity / 255, 3.0)) // 归一化并限制强度范围
    };
  }

  private calculateSurfaceHeight(targetPoint: Point3D, targetDistance: number, refractiveIndex: number): number {
    // 基于Snell定律和几何光学计算透镜表面高度
    // 增强版本，产生更明显的表面变化
    
    const intensity = targetPoint.z;
    const baseHeight = this.parameters.thickness / 2;
    const x = targetPoint.x;
    const y = targetPoint.y;
    
    // 验证输入参数
    if (!isFinite(intensity) || !isFinite(baseHeight) || !isFinite(refractiveIndex) || refractiveIndex === 0) {
      console.warn('Invalid parameters in calculateSurfaceHeight:', { intensity, baseHeight, refractiveIndex });
      return baseHeight;
    }
    
    // 计算径向距离
    const radialDistance = Math.sqrt(x * x + y * y);
    const maxRadius = Math.max(this.parameters.lensWidth, this.parameters.lensHeight) / 2; // 透镜半径
    const normalizedRadius = Math.min(radialDistance / maxRadius, 1.0);
    
    // 使用更复杂的公式计算表面曲率
    // 结合强度和径向位置的影响
    const intensityFactor = Math.max(0.1, Math.min(intensity, 2.0)); // 限制强度范围
    const radialFactor = 1.0 - normalizedRadius * normalizedRadius; // 抛物面形状
    
    // 计算表面高度变化
    const heightVariation = intensityFactor * radialFactor * 10.0 * (refractiveIndex - 1) / refractiveIndex;
    
    // 添加一些波纹效果以增强视觉效果
    const rippleEffect = Math.sin(normalizedRadius * Math.PI * 4) * intensityFactor * 0.5;
    
    const result = baseHeight + heightVariation + rippleEffect;
    
    // 确保结果是有效数值且在合理范围内
    if (!isFinite(result)) {
      console.warn('Invalid result in calculateSurfaceHeight:', result);
      return baseHeight;
    }
    
    // 限制高度变化范围
    const minHeight = -this.parameters.thickness;
    const maxHeight = this.parameters.thickness * 2;
    
    return Math.max(minHeight, Math.min(maxHeight, result));
  }

  private generateFaces(vertices: Point3D[]): number[][] {
    const faces: number[][] = [];
    const resolution = this.parameters.resolution;
    const verticesPerSurface = (resolution + 1) * (resolution + 1);
    const totalVertices = vertices.length;
    
    console.log('Generating faces for 3D lens geometry');
    console.log('Vertices per surface:', verticesPerSurface);
    console.log('Total vertices:', totalVertices);
    console.log('Expected total vertices:', verticesPerSurface * 2);

    // 验证顶点数量
    if (totalVertices < verticesPerSurface * 2) {
      console.error('Insufficient vertices for face generation');
      return [];
    }

    // 生成顶面（焦散表面）
    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        const a = i * (resolution + 1) + j;
        const b = a + 1;
        const c = (i + 1) * (resolution + 1) + j;
        const d = c + 1;

        // 验证索引范围
        if (a < verticesPerSurface && b < verticesPerSurface && c < verticesPerSurface && d < verticesPerSurface) {
          // 顶面三角形（法向量向上）
          faces.push([a, c, b]);
          faces.push([b, c, d]);
        } else {
          console.warn(`Top face indices out of range: a=${a}, b=${b}, c=${c}, d=${d}, max=${verticesPerSurface - 1}`);
        }
      }
    }

    // 生成底面（平面）
    const bottomOffset = verticesPerSurface;
    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        const a = bottomOffset + i * (resolution + 1) + j;
        const b = a + 1;
        const c = bottomOffset + (i + 1) * (resolution + 1) + j;
        const d = c + 1;

        // 验证索引范围
        if (a < totalVertices && b < totalVertices && c < totalVertices && d < totalVertices) {
          // 底面三角形（法向量向下）
          faces.push([a, b, c]);
          faces.push([b, d, c]);
        } else {
          console.warn(`Bottom face indices out of range: a=${a}, b=${b}, c=${c}, d=${d}, max=${totalVertices - 1}`);
        }
      }
    }

    // 生成侧面（连接顶面和底面的边缘）
    // 前边缘
    for (let j = 0; j < resolution; j++) {
      const topA = j;
      const topB = j + 1;
      const bottomA = bottomOffset + j;
      const bottomB = bottomOffset + j + 1;
      
      if (topA < verticesPerSurface && topB < verticesPerSurface && 
          bottomA < totalVertices && bottomB < totalVertices) {
        faces.push([topA, bottomA, topB]);
        faces.push([topB, bottomA, bottomB]);
      }
    }
    
    // 后边缘
    for (let j = 0; j < resolution; j++) {
      const topA = resolution * (resolution + 1) + j;
      const topB = topA + 1;
      const bottomA = bottomOffset + resolution * (resolution + 1) + j;
      const bottomB = bottomA + 1;
      
      if (topA < verticesPerSurface && topB < verticesPerSurface && 
          bottomA < totalVertices && bottomB < totalVertices) {
        faces.push([topA, topB, bottomA]);
        faces.push([topB, bottomB, bottomA]);
      }
    }
    
    // 左边缘
    for (let i = 0; i < resolution; i++) {
      const topA = i * (resolution + 1);
      const topB = (i + 1) * (resolution + 1);
      const bottomA = bottomOffset + i * (resolution + 1);
      const bottomB = bottomOffset + (i + 1) * (resolution + 1);
      
      if (topA < verticesPerSurface && topB < verticesPerSurface && 
          bottomA < totalVertices && bottomB < totalVertices) {
        faces.push([topA, topB, bottomA]);
        faces.push([topB, bottomB, bottomA]);
      }
    }
    
    // 右边缘
    for (let i = 0; i < resolution; i++) {
      const topA = i * (resolution + 1) + resolution;
      const topB = (i + 1) * (resolution + 1) + resolution;
      const bottomA = bottomOffset + i * (resolution + 1) + resolution;
      const bottomB = bottomOffset + (i + 1) * (resolution + 1) + resolution;
      
      if (topA < verticesPerSurface && topB < verticesPerSurface && 
          bottomA < totalVertices && bottomB < totalVertices) {
        faces.push([topA, bottomA, topB]);
        faces.push([topB, bottomA, bottomB]);
      }
    }

    console.log('Generated faces count:', faces.length);
    console.log('Face generation completed successfully');
    return faces;
  }

  private calculateNormals(vertices: Point3D[], faces: number[][]): Point3D[] {
    const normals: Point3D[] = new Array(vertices.length).fill(null).map(() => ({ x: 0, y: 0, z: 0 }));

    // 计算每个面的法向量并累加到顶点
    for (const face of faces) {
      const [a, b, c] = face;
      const va = vertices[a];
      const vb = vertices[b];
      const vc = vertices[c];

      // 计算面法向量
      const ab = { x: vb.x - va.x, y: vb.y - va.y, z: vb.z - va.z };
      const ac = { x: vc.x - va.x, y: vc.y - va.y, z: vc.z - va.z };
      
      const normal = {
        x: ab.y * ac.z - ab.z * ac.y,
        y: ab.z * ac.x - ab.x * ac.z,
        z: ab.x * ac.y - ab.y * ac.x
      };

      // 归一化
      const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
      if (length > 0) {
        normal.x /= length;
        normal.y /= length;
        normal.z /= length;
      }

      // 累加到顶点法向量
      normals[a].x += normal.x;
      normals[a].y += normal.y;
      normals[a].z += normal.z;
      
      normals[b].x += normal.x;
      normals[b].y += normal.y;
      normals[b].z += normal.z;
      
      normals[c].x += normal.x;
      normals[c].y += normal.y;
      normals[c].z += normal.z;
    }

    // 归一化顶点法向量
    for (const normal of normals) {
      const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
      if (length > 0) {
        normal.x /= length;
        normal.y /= length;
        normal.z /= length;
      }
    }

    return normals;
  }

  private generateUVCoordinates(vertices: Point3D[]): Point2D[] {
    const uvs: Point2D[] = [];
    const { resolution } = this.parameters;
    const verticesPerSurface = (resolution + 1) * (resolution + 1);
    
    console.log('Generating UV coordinates for', vertices.length, 'vertices');
    
    // 为顶面生成UV坐标
    for (let i = 0; i <= resolution; i++) {
      for (let j = 0; j <= resolution; j++) {
        uvs.push({
          x: j / resolution,
          y: i / resolution
        });
      }
    }
    
    // 为底面生成UV坐标（如果有底面顶点）
    if (vertices.length > verticesPerSurface) {
      for (let i = 0; i <= resolution; i++) {
        for (let j = 0; j <= resolution; j++) {
          uvs.push({
            x: j / resolution,
            y: i / resolution
          });
        }
      }
    }
    
    // 确保UV数组长度与顶点数组长度匹配
    while (uvs.length < vertices.length) {
      const lastUV = uvs[uvs.length - 1] || { x: 0, y: 0 };
      uvs.push({ x: lastUV.x, y: lastUV.y });
    }
    
    // 如果UV数组过长，截断到正确长度
    if (uvs.length > vertices.length) {
      uvs.splice(vertices.length);
    }
    
    console.log('Generated', uvs.length, 'UV coordinates');
    return uvs;
  }

  // 光线追踪方法
  public traceRays(geometry: LensGeometry, targetShape: number[][]): Point3D[] {
    const causticPoints: Point3D[] = [];
    const { targetDistance, refractiveIndex } = this.parameters;

    for (let i = 0; i < this.rayCount; i++) {
      // 生成随机入射光线
      const ray = this.generateRandomRay();
      
      // 计算光线与透镜表面的交点
      const intersection = this.rayLensIntersection(ray, geometry);
      if (!intersection) continue;

      // 计算折射光线
      const refractedRay = this.refractRay(ray, intersection, refractiveIndex);
      
      // 计算焦散点
      const causticPoint = this.calculateCausticPoint(refractedRay, targetDistance);
      if (causticPoint) {
        causticPoints.push(causticPoint);
      }
    }

    return causticPoints;
  }

  private generateRandomRay(): { origin: Point3D; direction: Point3D } {
    // 生成平行光线（模拟太阳光）
    const x = (Math.random() - 0.5) * 200;
    const y = (Math.random() - 0.5) * 200;
    
    return {
      origin: { x, y, z: 100 },
      direction: { x: 0, y: 0, z: -1 }
    };
  }

  private rayLensIntersection(ray: { origin: Point3D; direction: Point3D }, geometry: LensGeometry): Point3D | null {
    // 简化的光线-表面交点计算
    // 在实际应用中，这里需要更精确的几何计算
    const t = (0 - ray.origin.z) / ray.direction.z;
    if (t < 0) return null;

    const intersection = {
      x: ray.origin.x + t * ray.direction.x,
      y: ray.origin.y + t * ray.direction.y,
      z: 0
    };

    // 检查交点是否在透镜范围内
    const distance = Math.sqrt(intersection.x * intersection.x + intersection.y * intersection.y);
    if (distance > 50) return null; // 透镜半径限制

    return intersection;
  }

  private refractRay(incidentRay: { origin: Point3D; direction: Point3D }, intersection: Point3D, n: number): { origin: Point3D; direction: Point3D } {
    // 计算表面法向量（简化为垂直向上）
    const normal = { x: 0, y: 0, z: 1 };
    
    // 斯涅尔定律计算折射方向
    const cosI = -this.dotProduct(incidentRay.direction, normal);
    const sinT2 = (1 - cosI * cosI) / (n * n);
    
    if (sinT2 > 1) {
      // 全反射
      return {
        origin: intersection,
        direction: this.reflect(incidentRay.direction, normal)
      };
    }
    
    const cosT = Math.sqrt(1 - sinT2);
    const refractedDirection = {
      x: incidentRay.direction.x / n + (cosI / n - cosT) * normal.x,
      y: incidentRay.direction.y / n + (cosI / n - cosT) * normal.y,
      z: incidentRay.direction.z / n + (cosI / n - cosT) * normal.z
    };

    return {
      origin: intersection,
      direction: this.normalize(refractedDirection)
    };
  }

  private calculateCausticPoint(ray: { origin: Point3D; direction: Point3D }, targetDistance: number): Point3D | null {
    const t = (targetDistance - ray.origin.z) / ray.direction.z;
    if (t < 0) return null;

    return {
      x: ray.origin.x + t * ray.direction.x,
      y: ray.origin.y + t * ray.direction.y,
      z: targetDistance
    };
  }

  // 透镜优化方法
  public optimizeLens(targetShape: number[][], initialGeometry: LensGeometry): LensGeometry {
    let currentGeometry = initialGeometry;
    let bestError = this.calculateError(currentGeometry, targetShape);
    
    for (let iteration = 0; iteration < this.maxIterations; iteration++) {
      // 生成扰动的几何体
      const perturbedGeometry = this.perturbGeometry(currentGeometry);
      
      // 计算误差
      const error = this.calculateError(perturbedGeometry, targetShape);
      
      // 如果误差更小，接受新的几何体
      if (error < bestError) {
        currentGeometry = perturbedGeometry;
        bestError = error;
        
        // 检查收敛
        if (bestError < this.convergenceThreshold) {
          break;
        }
      }
    }
    
    return currentGeometry;
  }

  private calculateError(geometry: LensGeometry, targetShape: number[][]): number {
    const causticPoints = this.traceRays(geometry, targetShape);
    
    // 计算焦散图案与目标形状的差异
    let totalError = 0;
    const gridSize = 100;
    
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const x = (i / gridSize - 0.5) * 200;
        const y = (j / gridSize - 0.5) * 200;
        
        // 计算该点的光强度
        const intensity = this.calculateIntensity(causticPoints, x, y);
        
        // 获取目标强度
        const targetIntensity = this.getTargetIntensity(targetShape, i, j, gridSize);
        
        // 累加误差
        totalError += Math.abs(intensity - targetIntensity);
      }
    }
    
    return totalError / (gridSize * gridSize);
  }

  private perturbGeometry(geometry: LensGeometry): LensGeometry {
    const perturbedVertices = geometry.vertices.map(vertex => ({
      x: vertex.x + (Math.random() - 0.5) * 0.1,
      y: vertex.y + (Math.random() - 0.5) * 0.1,
      z: vertex.z + (Math.random() - 0.5) * 0.1
    }));
    
    return {
      ...geometry,
      vertices: perturbedVertices
    };
  }

  private calculateIntensity(causticPoints: Point3D[], x: number, y: number): number {
    const radius = 5; // 影响半径
    let intensity = 0;
    
    for (const point of causticPoints) {
      const distance = Math.sqrt((point.x - x) ** 2 + (point.y - y) ** 2);
      if (distance < radius) {
        intensity += Math.exp(-distance * distance / (2 * radius * radius));
      }
    }
    
    return intensity;
  }

  private getTargetIntensity(targetShape: number[][], i: number, j: number, gridSize: number): number {
    const row = Math.floor(i * targetShape.length / gridSize);
    const col = Math.floor(j * targetShape[0].length / gridSize);
    
    if (row >= 0 && row < targetShape.length && col >= 0 && col < targetShape[0].length) {
      return targetShape[row][col] / 255; // 归一化到0-1
    }
    
    return 0;
  }

  // 辅助数学方法
  private dotProduct(a: Point3D, b: Point3D): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }

  private reflect(incident: Point3D, normal: Point3D): Point3D {
    const dot = this.dotProduct(incident, normal);
    return {
      x: incident.x - 2 * dot * normal.x,
      y: incident.y - 2 * dot * normal.y,
      z: incident.z - 2 * dot * normal.z
    };
  }

  private normalize(vector: Point3D): Point3D {
    const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
    if (length === 0) return { x: 0, y: 0, z: 0 };
    
    return {
      x: vector.x / length,
      y: vector.y / length,
      z: vector.z / length
    };
  }

  // 设置优化参数
  public setOptimizationParameters(rayCount: number, convergenceThreshold: number, maxIterations: number) {
    this.rayCount = rayCount;
    this.convergenceThreshold = convergenceThreshold;
    this.maxIterations = maxIterations;
  }
}