import { LensGeometry, Point2D, Point3D } from '../../types';

/**
 * Caustics Engineering Algorithm Implementation
 * 完全基于Julia版本重新实现
 * 参考: c:\Users\36527\Downloads\caustic_lens\causticsEngineering-main
 */
export class CausticsEngineeringAlgorithm {
  private shouldStop = false;
  private parameters: any;

  constructor(parameters: any) {
    this.parameters = parameters;
  }

  /**
   * 停止算法执行
   */
  stop(): void {
    this.shouldStop = true;
  }

  /**
   * 主算法入口
   * 对应Julia中的engineer_caustics函数
   */
  async generateLens(
    targetImage: number[][],
    onProgress?: (progress: number, status: string) => void
  ): Promise<LensGeometry> {
    console.log('开始Caustics Engineering算法');
    
    // 使用图像的实际尺寸创建网格，对应Julia版本的逻辑
    const imageHeight = targetImage.length;
    const imageWidth = targetImage[0].length;
    const iterations = this.parameters.iterations || 4;
    
    console.log(`算法参数 - 图像尺寸: ${imageWidth}x${imageHeight}, 网格尺寸: ${imageWidth + 1}x${imageHeight + 1}, 迭代次数: ${iterations}`);
    
    // 创建初始正方形网格 - 对应Julia的squareMesh(width + 1, height + 1)
    const mesh = this.squareMesh(imageWidth + 1, imageHeight + 1);
    console.log(`初始网格创建完成 - 节点数: ${mesh.nodes.length}, 三角形数: ${mesh.triangles.length}`);
    
    // 能量归一化 - 对应Julia版本的boost_ratio逻辑
    const meshSum = imageWidth * imageHeight;
    let imageSum = 0;
    for (let x = 0; x < imageWidth; x++) {
      for (let y = 0; y < imageHeight; y++) {
        imageSum += targetImage[x][y];
      }
    }
    const boostRatio = meshSum / imageSum;
    
    // 应用能量归一化到目标图像
    const normalizedImage: number[][] = [];
    for (let x = 0; x < imageWidth; x++) {
      normalizedImage[x] = [];
      for (let y = 0; y < imageHeight; y++) {
        normalizedImage[x][y] = targetImage[x][y] * boostRatio;
      }
    }
    
    console.log(`能量归一化完成 - 原始图像总和: ${imageSum.toFixed(2)}, 网格总和: ${meshSum}, 增强比例: ${boostRatio.toFixed(4)}`);
    
    // 迭代优化
    for (let i = 0; i < iterations; i++) {
      if (this.shouldStop) break;
      
      console.log(`开始第 ${i + 1} 次迭代`);
      // 迭代进度占总进度的60%（从20%到80%）
      const iterationProgress = 20 + (i / iterations) * 60;
      onProgress?.(iterationProgress, `执行第 ${i + 1} 次迭代...`);
      
      await this.oneIteration(mesh, normalizedImage, onProgress, i + 1);
      
      const iterationCompleteProgress = 20 + ((i + 1) / iterations) * 60;
      onProgress?.(iterationCompleteProgress, `第 ${i + 1} 次迭代完成`);
    }
    
    onProgress?.(85, '计算透镜表面高度...');
    
    // 计算透镜表面高度 - 对应Julia的findSurface函数
    const { heights, metersPerPixel } = await this.findSurface(mesh, normalizedImage, onProgress);
    
    onProgress?.(90, '设置网格高度...');
    
    // 设置网格高度 - 对应Julia的setHeights!函数
    this.setHeights(mesh, heights, metersPerPixel);
    
    onProgress?.(95, '构建实体网格...');
    
    // 构建实体网格 - 对应Julia的solidify函数
    const solidMesh = this.solidify(mesh);
    
    onProgress?.(100, '算法完成');
    
    // 转换为LensGeometry格式
    return this.meshToLensGeometry(solidMesh);
  }

  /**
   * 创建正方形网格
   * 对应Julia中的squareMesh函数
   */
  private squareMesh(width: number, height: number): Mesh {
    console.log(`创建正方形网格: ${width}x${height}`);
    
    const nodes: Point3D[] = [];
    const nodeArray: Point3D[][] = [];
    const triangles: Triangle[] = [];
    
    // 初始化nodeArray
    for (let x = 0; x < width; x++) {
      nodeArray[x] = [];
    }
    
    // 创建节点 - 与Julia版本完全一致
    let nodeIndex = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const node: Point3D = {
          x: x,
          y: y,
          z: 0,
          ix: x,
          iy: y
        };
        nodes[nodeIndex] = node;
        nodeArray[x][y] = node;
        nodeIndex++;
      }
    }
    
    // 创建三角形 - 与Julia版本完全一致
    let triangleIndex = 0;
    for (let y = 0; y < height - 1; y++) {
      for (let x = 0; x < width - 1; x++) {
        const indexUL = y * width + x;        // 左上
        const indexUR = indexUL + 1;          // 右上
        const indexLL = (y + 1) * width + x;  // 左下
        const indexLR = indexLL + 1;          // 右下
        
        // 第一个三角形: UL -> LL -> UR
        triangles[triangleIndex++] = { pt1: indexUL, pt2: indexLL, pt3: indexUR };
        // 第二个三角形: LR -> UR -> LL
        triangles[triangleIndex++] = { pt1: indexLR, pt2: indexUR, pt3: indexLL };
      }
    }
    
    console.log(`网格创建完成 - 节点: ${nodes.length}, 三角形: ${triangles.length}`);
    
    return {
      nodes,
      nodeArray,
      triangles,
      width,
      height
    };
  }

  /**
   * 执行一次迭代
   * 对应Julia中的oneIteration函数
   */
  private async oneIteration(
    mesh: Mesh,
    targetImage: number[][],
    onProgress?: (progress: number, status: string) => void,
    iterationNumber: number = 1
  ): Promise<void> {
    console.log(`第${iterationNumber}次迭代 - 目标图像尺寸: ${targetImage.length}x${targetImage[0].length}`);
    
    // 计算基础进度（每次迭代占总进度的20%，从前一次迭代结束位置开始）
    const baseProgress = (iterationNumber - 1) * 20;
    
    // 计算像素面积 - 对应Julia的getPixelArea函数
    const pixelAreas = this.getPixelArea(mesh);
    
    // 计算差值矩阵D
    const D = this.calculateDifferenceMatrix(pixelAreas, targetImage);
    
    // 输出Loss统计信息（完全对应Julia版本）
    this.outputLossStatistics(D);
    
    onProgress?.(baseProgress + 2, `第${iterationNumber}次迭代: 构建Phi矩阵...`);
    
    // 构建Phi矩阵 - 对应Julia的relax!函数
    const phi = this.createZeroMatrix(D.length, D[0].length);
    console.log('Building Phi');
    await this.buildPhi(phi, D, onProgress, iterationNumber);
    
    onProgress?.(baseProgress + 15, `第${iterationNumber}次迭代: 更新网格位置...`);
    
    // 更新网格位置 - 对应Julia的marchMesh!函数
    this.marchMesh(mesh, phi);
    
    onProgress?.(baseProgress + 18, `第${iterationNumber}次迭代: 生成可视化图像...`);
    
    // 生成可视化图像 - 对应Julia的quantifyLoss!函数
    const iterationImage = this.quantifyLoss(mesh, D, phi);
    console.log('生成迭代可视化图像:', iterationImage.substring(0, 50) + '...');
    
    // 立即通过自定义事件将图像传递给前端
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('iterationImageGenerated', {
        detail: { imageData: iterationImage, iteration: iterationNumber }
      }));
    }
    
    onProgress?.(baseProgress + 20, `第${iterationNumber}次迭代: 迭代完成，已生成可视化图像`);
  }

  /**
   * 输出Loss统计信息
   * 完全对应Julia版本的输出格式
   */
  private outputLossStatistics(D: number[][]): void {
    let minLoss = Infinity;
    let maxLoss = -Infinity;
    let sumLoss = 0;
    
    for (let x = 0; x < D.length; x++) {
      for (let y = 0; y < D[x].length; y++) {
        const loss = D[x][y];
        minLoss = Math.min(minLoss, loss);
        maxLoss = Math.max(maxLoss, loss);
        sumLoss += loss;
      }
    }
    
    console.log(minLoss);
    console.log(maxLoss);
    console.log('Loss:');
    console.log(`Minimum: ${minLoss}`);
    console.log(`Maximum: ${maxLoss}`);
    console.log(`SUM: ${sumLoss}`);
    console.log(`(${D.length - 1}, ${D[0].length - 1})`);
    
    // 计算D范围
    let minD = D[0][0];
    let maxD = D[0][0];
    for (let i = 0; i < D.length; i++) {
      for (let j = 0; j < D[i].length; j++) {
        if (D[i][j] < minD) minD = D[i][j];
        if (D[i][j] > maxD) maxD = D[i][j];
      }
    }
    console.log(`D范围 [${minD}, ${maxD}]`);
  }

  /**
   * 计算像素面积
   * 对应Julia中的getPixelArea函数
   */
  private getPixelArea(mesh: Mesh): number[][] {
    // 使用网格的实际尺寸，对应Julia版本的逻辑
    const width = mesh.width - 1;  // 像素数量比节点数量少1
    const height = mesh.height - 1;
    const pixelAreas: number[][] = [];
    
    // 初始化像素面积矩阵
    for (let x = 0; x < width; x++) {
      pixelAreas[x] = new Array(height).fill(0);
    }
    
    // 遍历每个三角形，计算其对像素面积的贡献
    for (const triangle of mesh.triangles) {
      const p1 = mesh.nodes[triangle.pt1];
      const p2 = mesh.nodes[triangle.pt2];
      const p3 = mesh.nodes[triangle.pt3];
      
      // 计算三角形面积
      const area = this.triangleArea(p1, p2, p3);
      
      // 计算三角形质心
      const centroid = this.centroid(p1, p2, p3);
      
      // 将面积分配到对应的像素
      const pixelX = Math.floor(centroid.x);
      const pixelY = Math.floor(centroid.y);
      
      if (pixelX >= 0 && pixelX < width && pixelY >= 0 && pixelY < height) {
        pixelAreas[pixelX][pixelY] += area;
      }
    }
    
    return pixelAreas;
  }

  /**
   * 计算三角形面积
   * 对应Julia中的triangle_area函数
   */
  private triangleArea(p1: Point3D, p2: Point3D, p3: Point3D): number {
    const x1 = p2.x - p1.x;
    const y1 = p2.y - p1.y;
    const x2 = p3.x - p1.x;
    const y2 = p3.y - p1.y;
    
    return Math.abs(x1 * y2 - x2 * y1) / 2;
  }

  /**
   * 计算三角形质心
   * 对应Julia中的centroid函数
   */
  private centroid(p1: Point3D, p2: Point3D, p3: Point3D): Point3D {
    return {
      x: (p1.x + p2.x + p3.x) / 3,
      y: (p1.y + p2.y + p3.y) / 3,
      z: (p1.z + p2.z + p3.z) / 3
    };
  }

  /**
   * 计算差值矩阵
   * 完全对应Julia版本的逻辑
   */
  private calculateDifferenceMatrix(pixelAreas: number[][], targetImage: number[][]): number[][] {
    const width = pixelAreas.length;
    const height = pixelAreas[0].length;
    const D: number[][] = [];
    let sum = 0;
    
    // 计算差值（对应Julia: D = Float64.(LJ - img)）
    for (let x = 0; x < width; x++) {
      D[x] = [];
      for (let y = 0; y < height; y++) {
        const targetValue = (targetImage[x] && targetImage[x][y]) ? targetImage[x][y] : 0;
        D[x][y] = pixelAreas[x][y] - targetValue;
        sum += D[x][y];
      }
    }
    
    // 确保总和为零（对应Julia: D .-= sum(D) / (width * height)）
    const avgDiff = sum / (width * height);
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        D[x][y] -= avgDiff;
      }
    }
    
    return D;
  }

  /**
   * 创建零矩阵
   */
  private createZeroMatrix(width: number, height: number): number[][] {
    const matrix: number[][] = [];
    for (let x = 0; x < width; x++) {
      matrix[x] = new Array(height).fill(0);
    }
    return matrix;
  }

  /**
   * 构建Phi矩阵
   * 对应Julia中的relax!函数
   */
  private async buildPhi(
    phi: number[][],
    D: number[][],
    onProgress?: (progress: number, status: string) => void,
    iterationNumber: number = 1
  ): Promise<void> {
    const omega = 1.99; // 松弛因子，与Julia版本一致
    const maxIterations = 10000; // 最大迭代次数，与Julia版本一致
    const tolerance = 0.00001;
    
    // 执行松弛法迭代（完全对应Julia版本）
    for (let i = 1; i <= maxIterations; i++) {
      if (this.shouldStop) break;
      
      const maxUpdate = this.relaxStep(phi, D, omega);
      
      // 检查NaN（对应Julia版本）
      if (isNaN(maxUpdate)) {
        console.log('MAX UPDATE WAS NaN. CANNOT BUILD PHI');
        return;
      }
      
      // 每500次迭代输出一次（对应Julia版本）
      if (i % 500 === 0) {
        console.log(maxUpdate);
      }
      
      // 检查收敛（对应Julia版本）
      if (maxUpdate < tolerance) {
        console.log(`Convergence reached at step ${i} with max_update of ${maxUpdate}`);
        break;
      }
      
      // 更新进度（每100次迭代更新一次以避免过于频繁）
      if (i % 100 === 0) {
        // 计算基础进度（每次迭代占总进度的20%）
        const baseProgress = (iterationNumber - 1) * 20;
        // 松弛法迭代在每次迭代中占2-15的进度范围
        const relaxProgress = 2 + (i / maxIterations) * 13;
        const totalProgress = baseProgress + relaxProgress;
        onProgress?.(totalProgress, `第${iterationNumber}次迭代: 松弛法迭代: ${i}/${maxIterations}`);
      }
      
      // 小延迟以允许UI更新（每100次迭代一次）
      if (i % 100 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    }
  }

  /**
   * 松弛法单步
   * 完全对应Julia中的relax!函数实现
   */
  private relaxStep(phi: number[][], D: number[][], omega: number): number {
    const width = phi.length;
    const height = phi[0].length;
    let maxUpdate = 0;
    
    // 遍历所有点（完全对应Julia版本的双重循环）
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const val = phi[x][y];
        let delta = 0;
        
        if (x === 0 && y === 0) {
          // 左上角
          const valDown = phi[x][y + 1];
          const valRight = phi[x + 1][y];
          delta = omega / 2 * (valDown + valRight - 2 * val - D[x][y]);
        } else if (x === 0 && y === height - 1) {
          // 左下角
          const valUp = phi[x][y - 1];
          const valRight = phi[x + 1][y];
          delta = omega / 2 * (valUp + valRight - 2 * val - D[x][y]);
        } else if (x === width - 1 && y === 0) {
          // 右上角
          const valDown = phi[x][y + 1];
          const valLeft = phi[x - 1][y];
          delta = omega / 2 * (valDown + valLeft - 2 * val - D[x][y]);
        } else if (x === width - 1 && y === height - 1) {
          // 右下角
          const valUp = phi[x][y - 1];
          const valLeft = phi[x - 1][y];
          delta = omega / 2 * (valUp + valLeft - 2 * val - D[x][y]);
        } else if (x === 0) {
          // 左边界（非角点）
          const valUp = phi[x][y - 1];
          const valDown = phi[x][y + 1];
          const valRight = phi[x + 1][y];
          delta = omega / 3 * (valUp + valDown + valRight - 3 * val - D[x][y]);
        } else if (x === width - 1) {
          // 右边界（非角点）
          const valUp = phi[x][y - 1];
          const valDown = phi[x][y + 1];
          const valLeft = phi[x - 1][y];
          delta = omega / 3 * (valUp + valDown + valLeft - 3 * val - D[x][y]);
        } else if (y === 0) {
          // 上边界（非角点）
          const valDown = phi[x][y + 1];
          const valLeft = phi[x - 1][y];
          const valRight = phi[x + 1][y];
          delta = omega / 3 * (valDown + valLeft + valRight - 3 * val - D[x][y]);
        } else if (y === height - 1) {
          // 下边界（非角点）
          const valUp = phi[x][y - 1];
          const valLeft = phi[x - 1][y];
          const valRight = phi[x + 1][y];
          delta = omega / 3 * (valUp + valLeft + valRight - 3 * val - D[x][y]);
        } else {
          // 内部点（正常情况）
          const valUp = phi[x][y - 1];
          const valDown = phi[x][y + 1];
          const valLeft = phi[x - 1][y];
          const valRight = phi[x + 1][y];
          delta = omega / 4 * (valUp + valDown + valLeft + valRight - 4 * val - D[x][y]);
        }
        
        if (Math.abs(delta) > maxUpdate) {
          maxUpdate = Math.abs(delta);
        }
        
        phi[x][y] += delta;
      }
    }
    
    return maxUpdate;
  }

  /**
   * 网格行进
   * 对应Julia中的marchMesh!函数
   */
  private marchMesh(mesh: Mesh, phi: number[][]): void {
    // 计算phi的梯度
    const [gradPhiU, gradPhiV] = this.calculateGradient(phi);
    
    // 计算每个点的速度
    const velocities: Point3D[][] = [];
    for (let x = 0; x < mesh.width; x++) {
      velocities[x] = [];
      for (let y = 0; y < mesh.height; y++) {
        let u = 0, v = 0;
        
        if (x < gradPhiU.length && y < gradPhiU[0].length) {
          u = gradPhiU[x][y];
        }
        if (x < gradPhiV.length && y < gradPhiV[0].length) {
          v = gradPhiV[x][y];
        }
        
        velocities[x][y] = { x: -u, y: -v, z: 0 };
      }
    }
    
    // 计算最小时间步长
    let minT = 10000;
    
    for (const triangle of mesh.triangles) {
      const p1 = mesh.nodes[triangle.pt1];
      const p2 = mesh.nodes[triangle.pt2];
      const p3 = mesh.nodes[triangle.pt3];
      
      const v1 = velocities[p1.ix!][p1.iy!];
      const v2 = velocities[p2.ix!][p2.iy!];
      const v3 = velocities[p3.ix!][p3.iy!];
      
      const [t1, t2] = this.findT(p1, p2, p3, v1, v2, v3);
      
      if (t1 > 0 && t1 < minT) {
        minT = t1;
      }
      if (t2 > 0 && t2 < minT) {
        minT = t2;
      }
    }
    
    console.log(`Overall min_t:${minT}`);
    const delta = minT / 2;
    
    // 更新节点位置
    for (const point of mesh.nodes) {
      const v = velocities[point.ix!][point.iy!];
      point.x = v.x * delta + point.x;
      point.y = v.y * delta + point.y;
    }
  }

  /**
   * 计算梯度
   * 对应Julia中的∇函数
   */
  private calculateGradient(f: number[][]): [number[][], number[][]] {
    const width = f.length;
    const height = f[0].length;
    
    const gradU: number[][] = [];
    const gradV: number[][] = [];
    
    for (let x = 0; x < width; x++) {
      gradU[x] = [];
      gradV[x] = [];
      for (let y = 0; y < height; y++) {
        gradU[x][y] = (x === width - 1) ? 0 : f[x + 1][y] - f[x][y];
        gradV[x][y] = (y === height - 1) ? 0 : f[x][y + 1] - f[x][y];
      }
    }
    
    return [gradU, gradV];
  }

  /**
   * 计算三角形面积变为零所需的时间
   * 对应Julia中的findT函数
   */
  private findT(
    p1: Point3D,
    p2: Point3D,
    p3: Point3D,
    dp1: Point3D,
    dp2: Point3D,
    dp3: Point3D
  ): [number, number] {
    const x1 = p2.x - p1.x;
    const y1 = p2.y - p1.y;
    const x2 = p3.x - p1.x;
    const y2 = p3.y - p1.y;
    
    const u1 = dp2.x - dp1.x;
    const v1 = dp2.y - dp1.y;
    const u2 = dp3.x - dp1.x;
    const v2 = dp3.y - dp1.y;
    
    const a = u1 * v2 - u2 * v1;
    const b = x1 * v1 + y2 * u1 - x2 * v1 - y1 * u2;
    const c = x1 * y2 - x2 * y1;
    
    if (a !== 0) {
      const quotient = b * b - 4 * a * c;
      if (quotient >= 0) {
        const d = Math.sqrt(quotient);
        return [(-b - d) / (2 * a), (-b + d) / (2 * a)];
      } else {
        return [-123.0, -123.0];
      }
    } else {
      return [-c / b, -c / b];
    }
  }

  /**
   * 生成可视化图像
   * 对应Julia中的quantifyLoss!函数
   */
  private quantifyLoss(mesh: Mesh, D: number[][], phi: number[][]): string {
    // 使用实际的图像尺寸
    const width = D.length;
    const height = D[0].length;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    
    const imageData = ctx.createImageData(width, height);
    
    // 找到D矩阵的最小值和最大值用于归一化
    let minD = Infinity;
    let maxD = -Infinity;
    for (let x = 0; x < D.length; x++) {
      for (let y = 0; y < D[x].length; y++) {
        minD = Math.min(minD, D[x][y]);
        maxD = Math.max(maxD, D[x][y]);
      }
    }
    
    // 生成可视化图像
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        
        // 将D值归一化到0-255范围
        const normalizedValue = (D[x][y] - minD) / (maxD - minD);
        const colorValue = Math.floor(normalizedValue * 255);
        
        imageData.data[index] = colorValue;     // R
        imageData.data[index + 1] = colorValue; // G
        imageData.data[index + 2] = colorValue; // B
        imageData.data[index + 3] = 255;       // A
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL();
  }

  /**
   * 计算透镜表面高度
   * 对应Julia中的findSurface函数
   */
  private async findSurface(mesh: Mesh, targetImage: number[][], onProgress?: (progress: number, status: string) => void): Promise<{ heights: number[][], metersPerPixel: number }> {
    console.log('计算透镜表面高度...');
    
    const width = mesh.width;
    const height = mesh.height;
    
    // 物理参数（与Julia版本完全一致）
    const imgWidth = 0.1; // 透镜物理尺寸（米）
    const f = 1.0;        // 焦距（米）
    const H = f;
    const metersPerPixel = imgWidth / width;
    
    console.log(metersPerPixel);
    
    // 折射率 - 从参数配置中获取
    const refractiveIndex = this.parameters?.refractiveIndex || 1.49;
    const n1 = refractiveIndex; // 透镜材料
    const n2 = 1.0;  // 空气
    
    console.log(`使用折射率: ${n1}`);
    
    // 计算法向量场
    const Nx: number[][] = [];
    const Ny: number[][] = [];
    
    for (let i = 0; i <= width; i++) {
      Nx[i] = new Array(height + 1).fill(0);
      Ny[i] = new Array(height + 1).fill(0);
    }
    
    for (let j = 0; j < height; j++) {
      for (let i = 0; i < width; i++) {
        if (mesh.nodeArray[i] && mesh.nodeArray[i][j]) {
          const node = mesh.nodeArray[i][j];
          // 计算位移
          const dx = (node.ix! - node.x) * metersPerPixel;
          const dy = (node.iy! - node.y) * metersPerPixel;
          
          const little_h = node.z * metersPerPixel;
          const H_minus_h = H - little_h;
          const dz = H_minus_h;
          
          // 使用Snell定律计算法向量
          if (Math.abs(dz) > 1e-10) {
            Ny[i][j] = Math.tan(Math.atan(dy / dz) / (n1 - 1));
            Nx[i][j] = Math.tan(Math.atan(dx / dz) / (n1 - 1));
          }
        }
      }
    }
    
    // 计算散度
    const divergence: number[][] = [];
    for (let i = 0; i < width; i++) {
      divergence[i] = new Array(height);
    }
    
    for (let j = 0; j < height; j++) {
      for (let i = 0; i < width; i++) {
        const deltaX = Nx[i + 1][j] - Nx[i][j];
        const deltaY = Ny[i][j + 1] - Ny[i][j];
        divergence[i][j] = deltaX + deltaY;
      }
    }
    
    console.log(`${metersPerPixel}`);
    console.log('Have all the divergences');
    
    // 归一化散度
    let divergenceSum = 0;
    for (let j = 0; j < height; j++) {
      for (let i = 0; i < width; i++) {
        divergenceSum += divergence[i][j];
      }
    }
    
    console.log(`Divergence sum: ${divergenceSum}`);
    const avgDivergence = divergenceSum / (width * height);
    for (let j = 0; j < height; j++) {
      for (let i = 0; i < width; i++) {
        divergence[i][j] -= avgDivergence;
      }
    }
    
    // 使用松弛法求解高度
    const heights: number[][] = [];
    for (let i = 0; i < width; i++) {
      heights[i] = new Array(height).fill(0);
    }
    
    console.log('开始求解透镜表面高度...');
    
    const maxIterations = 10000;
    const tolerance = 0.00001;
    
    for (let iter = 0; iter < maxIterations; iter++) {
      const maxUpdate = this.relaxStepForHeights(heights, divergence);
      
      if (iter < 5) {
        console.log(maxUpdate);
      } else if (iter % 500 === 0) {
        console.log(`高度求解迭代 ${iter}: 最大更新 ${maxUpdate}`);
        // 更新进度
        const progress = 85 + (iter / maxIterations) * 5; // 85%-90%
        onProgress?.(progress, `高度求解迭代 ${iter}/${maxIterations}`);
      }
      
      if (maxUpdate < tolerance) {
        console.log(`Convergence reached at step ${iter} with max_update of ${maxUpdate}`);
        break;
      }
      
      // 每100次迭代让出控制权，避免阻塞UI
      if (iter % 100 === 0 && iter > 0) {
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    }
    
    return { heights, metersPerPixel };
  }

  /**
   * 高度求解的松弛法单步
   */
  private relaxStepForHeights(heights: number[][], divergence: number[][]): number {
    const width = heights.length;
    const height = heights[0].length;
    let maxUpdate = 0;
    
    const omega = 1.9; // 松弛因子
    
    // 处理内部节点
    for (let i = 1; i < width - 1; i++) {
      for (let j = 1; j < height - 1; j++) {
        const oldValue = heights[i][j];
        
        const neighbors = [
          heights[i-1][j],
          heights[i+1][j],
          heights[i][j-1],
          heights[i][j+1]
        ];
        
        const avgNeighbors = neighbors.reduce((a, b) => a + b, 0) / 4;
        const residual = avgNeighbors - divergence[i][j] - oldValue;
        const newValue = oldValue + omega * residual;
        heights[i][j] = newValue;
        
        const update = Math.abs(newValue - oldValue);
        maxUpdate = Math.max(maxUpdate, update);
      }
    }
    
    // 处理边界条件（Neumann边界条件）
    for (let j = 0; j < height; j++) {
      heights[0][j] = heights[1][j];           // 左边界
      heights[width-1][j] = heights[width-2][j]; // 右边界
    }
    
    for (let i = 0; i < width; i++) {
      heights[i][0] = heights[i][1];           // 上边界
      heights[i][height-1] = heights[i][height-2]; // 下边界
    }
    
    return maxUpdate;
  }

  /**
   * 设置网格高度
   * 对应Julia中的setHeights!函数
   */
  private setHeights(mesh: Mesh, heights: number[][], metersPerPixel: number): void {
    const width = heights.length;
    const height = heights[0].length;
    
    console.log(`设置网格高度 - 尺寸: ${width}x${height}`);
    
    // 将高度应用到网格节点 - 修复：使用正确的高度计算
    // Julia版本: mesh.nodeArray[x, y].z = heights[x, y] * heightScale + heightOffset
    // 调整比例尺：减小heightScale和heightOffset以获得更合理的透镜高度
    const heightScale = 1.0; // 减小比例尺
    const heightOffset = 10.0; // 减小基础偏移
    
    for (let i = 0; i < width; i++) {
      for (let j = 0; j < height; j++) {
        if (mesh.nodeArray[i] && mesh.nodeArray[i][j]) {
          const heightInMeters = heights[i][j];
          // 修复：使用乘法而不是除法，并添加偏移
          mesh.nodeArray[i][j].z = heightInMeters * heightScale + heightOffset;
          
          // 调试输出（对应Julia版本的示例输出）
          if (i === 100 && j === 100 && i < width && j < height) {
            console.log(`Example heights: ${heightInMeters}  and  ${heightInMeters * heightScale} and ${heightInMeters * heightScale + heightOffset}`);
          }
        }
      }
    }
    
    // 处理边界节点
    for (let i = 0; i < width; i++) {
      if (mesh.nodeArray[i]) {
        if (mesh.nodeArray[i][0]) {
          mesh.nodeArray[i][0].z = mesh.nodeArray[i][1] ? mesh.nodeArray[i][1].z : 0;
        }
        if (mesh.nodeArray[i][height-1]) {
          mesh.nodeArray[i][height-1].z = mesh.nodeArray[i][height-2] ? mesh.nodeArray[i][height-2].z : 0;
        }
      }
    }
    
    for (let j = 0; j < height; j++) {
      if (mesh.nodeArray[0] && mesh.nodeArray[0][j]) {
        mesh.nodeArray[0][j].z = mesh.nodeArray[1] && mesh.nodeArray[1][j] ? mesh.nodeArray[1][j].z : 0;
      }
      if (mesh.nodeArray[width-1] && mesh.nodeArray[width-1][j]) {
        mesh.nodeArray[width-1][j].z = mesh.nodeArray[width-2] && mesh.nodeArray[width-2][j] ? mesh.nodeArray[width-2][j].z : 0;
      }
    }
  }

  /**
   * 构建实体网格
   * 对应Julia中的solidify函数
   */
  private solidify(inputMesh: Mesh): Mesh {
    const width = inputMesh.width;
    const height = inputMesh.height;
    
    console.log(`构建实体网格 - 尺寸: ${width}x${height}`);
    
    const nodes: Point3D[] = [];
    const nodeArrayTop: Point3D[][] = [];
    const nodeArrayBottom: Point3D[][] = [];
    
    // 初始化数组
    for (let x = 0; x < width; x++) {
      nodeArrayTop[x] = [];
      nodeArrayBottom[x] = [];
    }
    
    // 使用固定偏移量（对应Julia版本的offset参数）
    // 调整offset以匹配新的高度比例尺
    const offset = 10; // 减小偏移量以匹配调整后的高度比例
    
    console.log(`透镜偏移量: ${offset}m (配置厚度: ${this.parameters.thickness}mm)`);
    console.log(`Specs: ${width}  ${height}  ${width * height * 2}  ${width * 2 + (height - 2) * 2}  ${(width - 1) * (height - 1) * 2} ${(width - 1) * (height - 1) * 4 + (width * 2 + (height - 2) * 2) * 2}`);
    
    // 构建底部和顶部表面
    let count = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const topNode = inputMesh.nodeArray[x][y];
        
        // 底部节点（对应Julia版本：z = -offset）
        const bottomNode: Point3D = {
          x: topNode.x,
          y: topNode.y,
          z: -offset, // 修复：使用固定偏移量而不是相对厚度
          ix: x,
          iy: y
        };
        nodes[count] = bottomNode;
        nodeArrayBottom[x][y] = bottomNode;
        count++;
      }
    }
    
    // 顶部节点
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const originalNode = inputMesh.nodeArray[x][y];
        const topNode: Point3D = {
          x: originalNode.x,
          y: originalNode.y,
          z: originalNode.z,
          ix: originalNode.ix,
          iy: originalNode.iy
        };
        nodes[count] = topNode;
        nodeArrayTop[x][y] = topNode;
        count++;
      }
    }
    
    // 构建三角形（完整版本，与Julia一致）
    const triangles: Triangle[] = [];
    const totalNodes = width * height * 2;
    const numTrianglesBottom = 2 * (width - 1) * (height - 1);
    const numTrianglesTop = numTrianglesBottom;
    const numTrianglesSides = 4 * (width - 1) + 4 * (height - 1);
    const totalTriangles = numTrianglesBottom + numTrianglesTop + numTrianglesSides;
    
    console.log(`构建三角形 - 底部: ${numTrianglesBottom}, 顶部: ${numTrianglesTop}, 侧面: ${numTrianglesSides}, 总计: ${totalTriangles}`);
    
    // 底部表面三角形
    for (let y = 0; y < height - 1; y++) {
      for (let x = 0; x < width - 1; x++) {
        const indexUL = y * width + x;
        const indexUR = indexUL + 1;
        const indexLL = (y + 1) * width + x;
        const indexLR = indexLL + 1;
        
        triangles.push({ pt1: indexUL, pt2: indexLL, pt3: indexUR });
        triangles.push({ pt1: indexLR, pt2: indexUR, pt3: indexLL });
      }
    }
    
    // 顶部表面三角形
    const topOffset = width * height;
    for (let y = 0; y < height - 1; y++) {
      for (let x = 0; x < width - 1; x++) {
        const indexUL = y * width + x + topOffset;
        const indexUR = indexUL + 1;
        const indexLL = (y + 1) * width + x + topOffset;
        const indexLR = indexLL + 1;
        
        triangles.push({ pt1: indexUL, pt2: indexUR, pt3: indexLL });
        triangles.push({ pt1: indexLR, pt2: indexLL, pt3: indexUR });
      }
    }
    
    // 封闭网格的侧面三角形
    // 左边界 (x = 0)
    for (let y = 0; y < height - 1; y++) {
      const ll = y * width;
      const ul = ll + topOffset;
      const lr = (y + 1) * width;
      const ur = lr + topOffset;
      
      triangles.push({ pt1: ll, pt2: ul, pt3: ur });
      triangles.push({ pt1: ur, pt2: lr, pt3: ll });
    }
    
    // 右边界 (x = width-1)
    for (let y = 0; y < height - 1; y++) {
      const ll = y * width + (width - 1);
      const ul = ll + topOffset;
      const lr = (y + 1) * width + (width - 1);
      const ur = lr + topOffset;
      
      triangles.push({ pt1: ll, pt2: ur, pt3: ul });
      triangles.push({ pt1: ur, pt2: ll, pt3: lr });
    }
    
    // 上边界 (y = 0)
    for (let x = 1; x < width; x++) {
      const ll = x;
      const ul = ll + topOffset;
      const lr = x - 1;
      const ur = lr + topOffset;
      
      triangles.push({ pt1: ll, pt2: ul, pt3: ur });
      triangles.push({ pt1: ur, pt2: lr, pt3: ll });
    }
    
    // 下边界 (y = height-1)
    for (let x = 1; x < width; x++) {
      const ll = (height - 1) * width + x;
      const ul = ll + topOffset;
      const lr = (height - 1) * width + (x - 1);
      const ur = lr + topOffset;
      
      triangles.push({ pt1: ll, pt2: ur, pt3: ul });
      triangles.push({ pt1: ur, pt2: ll, pt3: lr });
    }
    
    console.log(`实体网格创建完成 - 节点: ${nodes.length}, 三角形: ${triangles.length}`);
    
    return {
      nodes,
      nodeArray: nodeArrayTop,
      triangles,
      width,
      height
    };
  }

  /**
   * 将Mesh转换为LensGeometry
   */
  private meshToLensGeometry(mesh: Mesh): LensGeometry {
    console.log(`转换网格到透镜几何体 - 节点数: ${mesh.nodes.length}, 三角形数: ${mesh.triangles.length}`);
    
    const lensWidth = 100;  //固定尺寸100mm
    const lensHeight = 100; //固定尺寸100mm
    
    const scaleX = lensWidth / mesh.width;
    const scaleY = lensHeight / mesh.height;
    
    // 计算透镜中心偏移，使透镜中心位于原点
    const centerOffsetX = (mesh.width * scaleX) / 2;
    const centerOffsetY = (mesh.height * scaleY) / 2;
    
    const vertices: Point3D[] = mesh.nodes.map(node => ({
      x: node.x * scaleX - centerOffsetX,
      y: node.y * scaleY - centerOffsetY,
      z: node.z || 0
    }));
    
    const faces: number[][] = mesh.triangles.map(triangle => [
      triangle.pt1,
      triangle.pt2,
      triangle.pt3
    ]);
    
    const normals = this.calculateNormals(vertices, faces);
    const uvs = this.generateUVCoordinates(vertices);
    
    return {
      vertices,
      faces,
      normals,
      uvs
    };
  }

  /**
   * 计算法向量
   */
  private calculateNormals(vertices: Point3D[], faces: number[][]): Point3D[] {
    const normals: Point3D[] = new Array(vertices.length).fill(null).map(() => ({ x: 0, y: 0, z: 0 }));
    
    for (const face of faces) {
      const v1 = vertices[face[0]];
      const v2 = vertices[face[1]];
      const v3 = vertices[face[2]];
      
      const edge1 = { x: v2.x - v1.x, y: v2.y - v1.y, z: v2.z - v1.z };
      const edge2 = { x: v3.x - v1.x, y: v3.y - v1.y, z: v3.z - v1.z };
      
      const normal = {
        x: edge1.y * edge2.z - edge1.z * edge2.y,
        y: edge1.z * edge2.x - edge1.x * edge2.z,
        z: edge1.x * edge2.y - edge1.y * edge2.x
      };
      
      const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
      if (length > 0) {
        normal.x /= length;
        normal.y /= length;
        normal.z /= length;
      }
      
      for (const vertexIndex of face) {
        normals[vertexIndex].x += normal.x;
        normals[vertexIndex].y += normal.y;
        normals[vertexIndex].z += normal.z;
      }
    }
    
    for (const normal of normals) {
      const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
      if (length > 0) {
        normal.x /= length;
        normal.y /= length;
        normal.z /= length;
      } else {
        normal.z = 1;
      }
    }
    
    return normals;
  }

  /**
   * 生成UV坐标
   */
  private generateUVCoordinates(vertices: Point3D[]): Point2D[] {

    const lensWidth = 100;  //固定尺寸100mm
    const lensHeight = 100; //固定尺寸100mm

    return vertices.map(vertex => ({
      x: (vertex.x + lensWidth / 2) / lensWidth,
      y: (vertex.y + lensHeight / 2) / lensHeight
    }));
  }
}

// 内部数据结构
interface Point3D {
  x: number;
  y: number;
  z: number;
  ix?: number;
  iy?: number;
}

interface Triangle {
  pt1: number;
  pt2: number;
  pt3: number;
}

interface Mesh {
  nodes: Point3D[];
  nodeArray: Point3D[][];
  triangles: Triangle[];
  width: number;
  height: number;
}

/**
 * CausticsEngineeringGenerator类 - 保持与现有系统的兼容性
 * 包装CausticsEngineeringAlgorithm类
 */
export class CausticsEngineeringGenerator {
  private algorithm: CausticsEngineeringAlgorithm;
  private isRunning = false;

  constructor(parameters: any) {
    this.algorithm = new CausticsEngineeringAlgorithm(parameters);
  }

  /**
   * 生成透镜几何体
   */
  async generateLens(
    imageData: { data: number[][] },
    onProgress?: (progress: number, status: string) => void
  ): Promise<LensGeometry> {
    this.isRunning = true;
    try {
      const result = await this.algorithm.generateLens(imageData.data, onProgress);
      return result;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 停止生成过程
   */
  stop(): void {
    this.algorithm.stop();
    this.isRunning = false;
  }

  /**
   * 检查是否正在生成
   */
  isGenerating(): boolean {
    return this.isRunning;
  }
}