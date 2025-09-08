import { Point3D, LensGeometry, Point2D } from '../../types';
import * as THREE from 'three';

/**
 * 基于ShapeFromCaustics算法的透镜生成器
 * 实现了逆向光线追踪和迭代优化算法
 */
export class ShapeFromCausticsGenerator {
  private parameters: {
    heightFieldResolution: number;
    photonMapSize: number;
    maxIterations: number;
    convergenceThreshold: number;
    refractiveIndex: number;
    wavelengths: number[];
    lightPosition: THREE.Vector3;
    targetDistance: number;
    heightOffset: number;
    lensWidth: number;
    lensHeight: number;
    thickness: number;
  };

  constructor(params: Partial<typeof ShapeFromCausticsGenerator.prototype.parameters> = {}) {
    this.parameters = {
      heightFieldResolution: 64,
      photonMapSize: 256,
      maxIterations: 100,
      convergenceThreshold: 1e-4,
      refractiveIndex: 1.49, // 熔融石英
      wavelengths: [0.55], // 绿光波长 (μm)
      lightPosition: new THREE.Vector3(0, 0, 50),
      targetDistance: 100,
      heightOffset: 2.0,
      lensWidth: 50,
      lensHeight: 50,
      thickness: 5,
      ...params
    };
  }

  /**
   * 从目标图像生成透镜几何体
   */
  public async generateLens(targetImage: ImageData): Promise<LensGeometry> {
    console.log('开始基于ShapeFromCaustics算法生成透镜...');
    
    // 1. 预处理目标图像
    const targetShape = this.preprocessTargetImage(targetImage);
    
    // 2. 初始化高度场
    let heightField = this.initializeHeightField();
    
    // 3. 迭代优化
    heightField = await this.optimizeHeightField(heightField, targetShape);
    
    // 4. 生成3D几何体
    const geometry = this.generateGeometry(heightField);
    
    console.log('透镜生成完成');
    return geometry;
  }

  /**
   * 预处理目标图像，转换为强度分布
   */
  private preprocessTargetImage(imageData: ImageData): number[][] {
    const { width, height, data } = imageData;
    const { heightFieldResolution } = this.parameters;
    
    // 创建目标形状矩阵
    const targetShape: number[][] = [];
    
    for (let i = 0; i < heightFieldResolution; i++) {
      targetShape[i] = [];
      for (let j = 0; j < heightFieldResolution; j++) {
        // 将高度场坐标映射到图像坐标
        const imgX = Math.floor((i / heightFieldResolution) * width);
        const imgY = Math.floor((j / heightFieldResolution) * height);
        
        // 获取像素亮度 (RGBA -> 灰度)
        const pixelIndex = (imgY * width + imgX) * 4;
        const r = data[pixelIndex];
        const g = data[pixelIndex + 1];
        const b = data[pixelIndex + 2];
        const brightness = (r + g + b) / (3 * 255); // 归一化到 [0, 1]
        
        targetShape[i][j] = brightness;
      }
    }
    
    return targetShape;
  }

  /**
   * 初始化高度场
   */
  private initializeHeightField(): number[][] {
    const { heightFieldResolution, heightOffset } = this.parameters;
    const heightField: number[][] = [];
    
    for (let i = 0; i < heightFieldResolution; i++) {
      heightField[i] = [];
      for (let j = 0; j < heightFieldResolution; j++) {
        // 初始化为平面加上小的随机扰动
        heightField[i][j] = heightOffset + (Math.random() - 0.5) * 0.1;
      }
    }
    
    return heightField;
  }

  /**
   * 迭代优化高度场
   */
  private async optimizeHeightField(
    initialHeightField: number[][],
    targetShape: number[][]
  ): Promise<number[][]> {
    let heightField = this.copyHeightField(initialHeightField);
    let bestError = Infinity;
    
    console.log('开始迭代优化...');
    
    for (let iteration = 0; iteration < this.parameters.maxIterations; iteration++) {
      // 计算当前焦散图案
      const currentCaustics = this.computeCaustics(heightField);
      
      // 计算误差
      const error = this.calculateError(currentCaustics, targetShape);
      
      if (error < bestError) {
        bestError = error;
        
        // 检查收敛
        if (error < this.parameters.convergenceThreshold) {
          console.log(`算法在第${iteration}次迭代收敛，误差: ${error}`);
          break;
        }
      }
      
      // 计算梯度并更新高度场
      const gradient = this.computeGradient(heightField, currentCaustics, targetShape);
      heightField = this.updateHeightField(heightField, gradient, 0.01); // 学习率
      
      // 定期输出进度
      if (iteration % 10 === 0) {
        console.log(`迭代 ${iteration}, 误差: ${error.toFixed(6)}`);
      }
    }
    
    console.log(`优化完成，最终误差: ${bestError.toFixed(6)}`);
    return heightField;
  }

  /**
   * 计算焦散图案
   */
  private computeCaustics(heightField: number[][]): number[][] {
    const { heightFieldResolution, photonMapSize, refractiveIndex, lightPosition, targetDistance } = this.parameters;
    
    // 创建焦散图案矩阵
    const caustics: number[][] = [];
    for (let i = 0; i < photonMapSize; i++) {
      caustics[i] = new Array(photonMapSize).fill(0);
    }
    
    // 光线追踪
    const rayCount = 10000; // 光线数量
    
    for (let ray = 0; ray < rayCount; ray++) {
      // 在透镜表面随机采样
      const u = Math.random();
      const v = Math.random();
      
      // 计算光线起点和方向
      const rayOrigin = this.sampleLensSurface(u, v, heightField);
      const rayDirection = this.computeRayDirection(lightPosition, rayOrigin);
      
      // 计算表面法向量
      const normal = this.computeSurfaceNormal(u, v, heightField);
      
      // 计算折射方向
      const refractedDirection = this.computeRefraction(rayDirection, normal, 1.0, refractiveIndex);
      
      if (refractedDirection) {
        // 计算与目标平面的交点
        const intersection = this.computePlaneIntersection(rayOrigin, refractedDirection, targetDistance);
        
        if (intersection) {
          // 将交点映射到焦散图案
          this.splatPhoton(intersection, caustics, 1.0 / rayCount);
        }
      }
    }
    
    return caustics;
  }

  /**
   * 在透镜表面采样
   */
  private sampleLensSurface(u: number, v: number, heightField: number[][]): THREE.Vector3 {
    const { heightFieldResolution, lensWidth, lensHeight } = this.parameters;
    
    const x = (u - 0.5) * lensWidth;
    const y = (v - 0.5) * lensHeight;
    
    // 双线性插值获取高度
    const i = u * (heightFieldResolution - 1);
    const j = v * (heightFieldResolution - 1);
    const i0 = Math.floor(i);
    const j0 = Math.floor(j);
    const i1 = Math.min(i0 + 1, heightFieldResolution - 1);
    const j1 = Math.min(j0 + 1, heightFieldResolution - 1);
    
    const fx = i - i0;
    const fy = j - j0;
    
    const h00 = heightField[i0][j0];
    const h10 = heightField[i1][j0];
    const h01 = heightField[i0][j1];
    const h11 = heightField[i1][j1];
    
    const z = h00 * (1 - fx) * (1 - fy) +
              h10 * fx * (1 - fy) +
              h01 * (1 - fx) * fy +
              h11 * fx * fy;
    
    return new THREE.Vector3(x, y, z);
  }

  /**
   * 计算光线方向
   */
  private computeRayDirection(lightPos: THREE.Vector3, surfacePoint: THREE.Vector3): THREE.Vector3 {
    return surfacePoint.clone().sub(lightPos).normalize();
  }

  /**
   * 计算表面法向量
   */
  private computeSurfaceNormal(u: number, v: number, heightField: number[][]): THREE.Vector3 {
    const { heightFieldResolution, lensWidth, lensHeight } = this.parameters;
    
    const eps = 1.0 / heightFieldResolution;
    
    // 计算偏导数
    const h_center = this.sampleHeight(u, v, heightField);
    const h_right = this.sampleHeight(u + eps, v, heightField);
    const h_up = this.sampleHeight(u, v + eps, heightField);
    
    const dx = (h_right - h_center) / (eps * lensWidth);
    const dy = (h_up - h_center) / (eps * lensHeight);
    
    // 法向量 = (-dx, -dy, 1) 归一化
    const normal = new THREE.Vector3(-dx, -dy, 1).normalize();
    return normal;
  }

  /**
   * 采样高度值
   */
  private sampleHeight(u: number, v: number, heightField: number[][]): number {
    const { heightFieldResolution } = this.parameters;
    
    // 边界处理
    u = Math.max(0, Math.min(1, u));
    v = Math.max(0, Math.min(1, v));
    
    const i = Math.floor(u * (heightFieldResolution - 1));
    const j = Math.floor(v * (heightFieldResolution - 1));
    
    return heightField[i][j];
  }

  /**
   * 计算折射方向 (Snell定律)
   */
  private computeRefraction(
    incident: THREE.Vector3,
    normal: THREE.Vector3,
    n1: number,
    n2: number
  ): THREE.Vector3 | null {
    const eta = n1 / n2;
    const cosI = -normal.dot(incident);
    const sinT2 = eta * eta * (1.0 - cosI * cosI);
    
    // 全内反射检查
    if (sinT2 > 1.0) {
      return null;
    }
    
    const cosT = Math.sqrt(1.0 - sinT2);
    const refracted = incident.clone()
      .multiplyScalar(eta)
      .add(normal.clone().multiplyScalar(eta * cosI - cosT));
    
    return refracted.normalize();
  }

  /**
   * 计算与平面的交点
   */
  private computePlaneIntersection(
    rayOrigin: THREE.Vector3,
    rayDirection: THREE.Vector3,
    planeZ: number
  ): THREE.Vector3 | null {
    if (Math.abs(rayDirection.z) < 1e-6) {
      return null; // 光线平行于平面
    }
    
    const t = (planeZ - rayOrigin.z) / rayDirection.z;
    if (t < 0) {
      return null; // 交点在光线起点后面
    }
    
    return rayOrigin.clone().add(rayDirection.clone().multiplyScalar(t));
  }

  /**
   * 将光子能量分布到焦散图案
   */
  private splatPhoton(intersection: THREE.Vector3, caustics: number[][], energy: number): void {
    const { photonMapSize, lensWidth, lensHeight } = this.parameters;
    
    // 将世界坐标映射到图像坐标
    const u = (intersection.x / lensWidth + 0.5);
    const v = (intersection.y / lensHeight + 0.5);
    
    if (u >= 0 && u <= 1 && v >= 0 && v <= 1) {
      const i = Math.floor(u * photonMapSize);
      const j = Math.floor(v * photonMapSize);
      
      if (i >= 0 && i < photonMapSize && j >= 0 && j < photonMapSize) {
        caustics[i][j] += energy;
      }
    }
  }

  /**
   * 计算误差
   */
  private calculateError(current: number[][], target: number[][]): number {
    let error = 0;
    let count = 0;
    
    const currentSize = current.length;
    const targetSize = target.length;
    
    for (let i = 0; i < Math.min(currentSize, targetSize); i++) {
      for (let j = 0; j < Math.min(current[i].length, target[i].length); j++) {
        const diff = current[i][j] - target[i][j];
        error += diff * diff;
        count++;
      }
    }
    
    return count > 0 ? Math.sqrt(error / count) : Infinity;
  }

  /**
   * 计算梯度
   */
  private computeGradient(
    heightField: number[][],
    currentCaustics: number[][],
    targetShape: number[][]
  ): number[][] {
    const { heightFieldResolution } = this.parameters;
    const gradient: number[][] = [];
    
    for (let i = 0; i < heightFieldResolution; i++) {
      gradient[i] = [];
      for (let j = 0; j < heightFieldResolution; j++) {
        // 数值梯度计算
        const eps = 0.001;
        
        // 正向扰动
        const heightFieldPos = this.copyHeightField(heightField);
        heightFieldPos[i][j] += eps;
        const causticsPos = this.computeCaustics(heightFieldPos);
        const errorPos = this.calculateError(causticsPos, targetShape);
        
        // 负向扰动
        const heightFieldNeg = this.copyHeightField(heightField);
        heightFieldNeg[i][j] -= eps;
        const causticsNeg = this.computeCaustics(heightFieldNeg);
        const errorNeg = this.calculateError(causticsNeg, targetShape);
        
        // 计算梯度
        gradient[i][j] = (errorPos - errorNeg) / (2 * eps);
      }
    }
    
    return gradient;
  }

  /**
   * 更新高度场
   */
  private updateHeightField(
    heightField: number[][],
    gradient: number[][],
    learningRate: number
  ): number[][] {
    const { heightFieldResolution } = this.parameters;
    const newHeightField: number[][] = [];
    
    for (let i = 0; i < heightFieldResolution; i++) {
      newHeightField[i] = [];
      for (let j = 0; j < heightFieldResolution; j++) {
        newHeightField[i][j] = heightField[i][j] - learningRate * gradient[i][j];
      }
    }
    
    return newHeightField;
  }

  /**
   * 复制高度场
   */
  private copyHeightField(heightField: number[][]): number[][] {
    return heightField.map(row => [...row]);
  }

  /**
   * 从高度场生成3D几何体
   */
  private generateGeometry(heightField: number[][]): LensGeometry {
    const { heightFieldResolution, lensWidth, lensHeight, thickness } = this.parameters;
    
    const vertices: Point3D[] = [];
    const faces: number[][] = [];
    const normals: Point3D[] = [];
    const uvs: Point2D[] = [];
    
    // 生成顶面顶点
    for (let i = 0; i <= heightFieldResolution; i++) {
      for (let j = 0; j <= heightFieldResolution; j++) {
        const u = i / heightFieldResolution;
        const v = j / heightFieldResolution;
        
        const x = (u - 0.5) * lensWidth;
        const y = (v - 0.5) * lensHeight;
        const z = this.sampleHeight(u, v, heightField) + thickness / 2;
        
        vertices.push({ x, y, z });
        uvs.push({ x: u, y: v });
        
        // 计算法向量
        const normal = this.computeSurfaceNormal(u, v, heightField);
        normals.push({ x: normal.x, y: normal.y, z: normal.z });
      }
    }
    
    // 生成底面顶点
    const bottomOffset = vertices.length;
    for (let i = 0; i <= heightFieldResolution; i++) {
      for (let j = 0; j <= heightFieldResolution; j++) {
        const u = i / heightFieldResolution;
        const v = j / heightFieldResolution;
        
        const x = (u - 0.5) * lensWidth;
        const y = (v - 0.5) * lensHeight;
        const z = -thickness / 2;
        
        vertices.push({ x, y, z });
        uvs.push({ x: u, y: v });
        normals.push({ x: 0, y: 0, z: -1 }); // 底面法向量向下
      }
    }
    
    // 生成顶面三角形
    for (let i = 0; i < heightFieldResolution; i++) {
      for (let j = 0; j < heightFieldResolution; j++) {
        const idx = i * (heightFieldResolution + 1) + j;
        
        // 第一个三角形
        faces.push([idx, idx + 1, idx + heightFieldResolution + 1]);
        // 第二个三角形
        faces.push([idx + 1, idx + heightFieldResolution + 2, idx + heightFieldResolution + 1]);
      }
    }
    
    // 生成底面三角形 (顺序相反)
    for (let i = 0; i < heightFieldResolution; i++) {
      for (let j = 0; j < heightFieldResolution; j++) {
        const idx = bottomOffset + i * (heightFieldResolution + 1) + j;
        
        // 第一个三角形
        faces.push([idx, idx + heightFieldResolution + 1, idx + 1]);
        // 第二个三角形
        faces.push([idx + 1, idx + heightFieldResolution + 1, idx + heightFieldResolution + 2]);
      }
    }
    
    // 生成侧面 (简化版本，只连接边缘)
    // 这里可以添加更复杂的侧面生成逻辑
    
    console.log(`生成几何体: ${vertices.length} 顶点, ${faces.length} 面`);
    
    return {
      vertices,
      faces,
      normals,
      uvs
    };
  }
}