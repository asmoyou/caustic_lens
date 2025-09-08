import * as THREE from 'three';

/**
 * ShapeFromCaustics算法的工具函数
 * 基于原始项目中的utils.py实现
 */

/**
 * 计算两个向量的点积
 */
export function dot(a: THREE.Vector3, b: THREE.Vector3): number {
  return a.dot(b);
}

/**
 * 归一化张量/向量
 */
export function normalize(v: THREE.Vector3): THREE.Vector3 {
  return v.clone().normalize();
}

/**
 * 构建正交基
 * 给定一个向量，构建一个正交坐标系
 */
export function buildOrthonormalBasis(n: THREE.Vector3): [THREE.Vector3, THREE.Vector3, THREE.Vector3] {
  const normalizedN = normalize(n);
  
  // 选择一个不平行于n的向量
  let temp: THREE.Vector3;
  if (Math.abs(normalizedN.x) < 0.9) {
    temp = new THREE.Vector3(1, 0, 0);
  } else {
    temp = new THREE.Vector3(0, 1, 0);
  }
  
  // 计算第一个切向量
  const t1 = temp.clone().cross(normalizedN).normalize();
  
  // 计算第二个切向量
  const t2 = normalizedN.clone().cross(t1).normalize();
  
  return [normalizedN, t1, t2];
}

/**
 * Gram-Schmidt正交化过程
 */
export function gramSchmidt(vectors: THREE.Vector3[]): THREE.Vector3[] {
  const result: THREE.Vector3[] = [];
  
  for (let i = 0; i < vectors.length; i++) {
    let v = vectors[i].clone();
    
    // 减去之前所有向量的投影
    for (let j = 0; j < result.length; j++) {
      const proj = result[j].clone().multiplyScalar(v.dot(result[j]));
      v.sub(proj);
    }
    
    // 归一化
    if (v.length() > 1e-10) {
      result.push(v.normalize());
    }
  }
  
  return result;
}

/**
 * 重心坐标插值
 */
export function barycentricInterpolation(
  p: THREE.Vector2,
  a: THREE.Vector2,
  b: THREE.Vector2,
  c: THREE.Vector2,
  va: number,
  vb: number,
  vc: number
): number {
  // 计算重心坐标
  const v0 = c.clone().sub(a);
  const v1 = b.clone().sub(a);
  const v2 = p.clone().sub(a);
  
  const dot00 = v0.dot(v0);
  const dot01 = v0.dot(v1);
  const dot02 = v0.dot(v2);
  const dot11 = v1.dot(v1);
  const dot12 = v1.dot(v2);
  
  const invDenom = 1 / (dot00 * dot11 - dot01 * dot01);
  const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
  const v = (dot00 * dot12 - dot01 * dot02) * invDenom;
  const w = 1 - u - v;
  
  return w * va + v * vb + u * vc;
}

/**
 * 球面线性插值 (SLERP)
 */
export function slerp(a: THREE.Vector3, b: THREE.Vector3, t: number): THREE.Vector3 {
  const dot = Math.max(-1, Math.min(1, a.dot(b)));
  const theta = Math.acos(dot);
  
  if (Math.abs(theta) < 1e-6) {
    // 向量几乎相同，使用线性插值
    return a.clone().lerp(b, t);
  }
  
  const sinTheta = Math.sin(theta);
  const wa = Math.sin((1 - t) * theta) / sinTheta;
  const wb = Math.sin(t * theta) / sinTheta;
  
  return a.clone().multiplyScalar(wa).add(b.clone().multiplyScalar(wb));
}

/**
 * 计算张角 (solid angle)
 */
export function solidAngle(
  observer: THREE.Vector3,
  triangle: [THREE.Vector3, THREE.Vector3, THREE.Vector3]
): number {
  const [a, b, c] = triangle;
  
  // 将三角形顶点相对于观察者
  const va = a.clone().sub(observer).normalize();
  const vb = b.clone().sub(observer).normalize();
  const vc = c.clone().sub(observer).normalize();
  
  // 计算张角
  const numerator = Math.abs(va.dot(vb.clone().cross(vc)));
  const denominator = 1 + va.dot(vb) + vb.dot(vc) + vc.dot(va);
  
  return 2 * Math.atan2(numerator, denominator);
}

/**
 * 计算高斯分布
 */
export function gaussian(x: number, y: number, sigma: number): number {
  const r2 = x * x + y * y;
  return Math.exp(-r2 / (2 * sigma * sigma)) / (2 * Math.PI * sigma * sigma);
}

/**
 * 计算二元高斯分布
 */
export function bivariatGaussian(
  x: number,
  y: number,
  sigmaX: number,
  sigmaY: number,
  rho: number = 0
): number {
  const z = (x * x) / (sigmaX * sigmaX) + 
            (y * y) / (sigmaY * sigmaY) - 
            (2 * rho * x * y) / (sigmaX * sigmaY);
  
  const coeff = 1 / (2 * Math.PI * sigmaX * sigmaY * Math.sqrt(1 - rho * rho));
  
  return coeff * Math.exp(-z / (2 * (1 - rho * rho)));
}

/**
 * Sobel滤波器计算梯度
 */
export function sobelGradient(heightField: number[][], i: number, j: number): [number, number] {
  const rows = heightField.length;
  const cols = heightField[0].length;
  
  // Sobel X核
  const sobelX = [
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1]
  ];
  
  // Sobel Y核
  const sobelY = [
    [-1, -2, -1],
    [ 0,  0,  0],
    [ 1,  2,  1]
  ];
  
  let gx = 0;
  let gy = 0;
  
  for (let di = -1; di <= 1; di++) {
    for (let dj = -1; dj <= 1; dj++) {
      const ni = Math.max(0, Math.min(rows - 1, i + di));
      const nj = Math.max(0, Math.min(cols - 1, j + dj));
      
      const weight = heightField[ni][nj];
      gx += weight * sobelX[di + 1][dj + 1];
      gy += weight * sobelY[di + 1][dj + 1];
    }
  }
  
  return [gx, gy];
}

/**
 * 计算总变差 (Total Variation)
 */
export function totalVariation(heightField: number[][]): number {
  const rows = heightField.length;
  const cols = heightField[0].length;
  let tv = 0;
  
  for (let i = 0; i < rows - 1; i++) {
    for (let j = 0; j < cols - 1; j++) {
      const dx = heightField[i + 1][j] - heightField[i][j];
      const dy = heightField[i][j + 1] - heightField[i][j];
      tv += Math.sqrt(dx * dx + dy * dy);
    }
  }
  
  return tv;
}

/**
 * 计算总变差的梯度
 */
export function totalVariationGradient(heightField: number[][]): number[][] {
  const rows = heightField.length;
  const cols = heightField[0].length;
  const gradient: number[][] = [];
  
  for (let i = 0; i < rows; i++) {
    gradient[i] = new Array(cols).fill(0);
  }
  
  for (let i = 1; i < rows - 1; i++) {
    for (let j = 1; j < cols - 1; j++) {
      // 计算邻域差分
      const dx_pos = heightField[i + 1][j] - heightField[i][j];
      const dx_neg = heightField[i][j] - heightField[i - 1][j];
      const dy_pos = heightField[i][j + 1] - heightField[i][j];
      const dy_neg = heightField[i][j] - heightField[i][j - 1];
      
      // 计算梯度
      const eps = 1e-8;
      const norm_pos_x = Math.sqrt(dx_pos * dx_pos + dy_pos * dy_pos) + eps;
      const norm_neg_x = Math.sqrt(dx_neg * dx_neg + dy_neg * dy_neg) + eps;
      
      gradient[i][j] = dx_pos / norm_pos_x - dx_neg / norm_neg_x +
                       dy_pos / norm_pos_x - dy_neg / norm_neg_x;
    }
  }
  
  return gradient;
}

/**
 * 体积守恒启发式
 */
export function volumeConservationHeuristic(
  heightField: number[][],
  targetVolume: number
): number[][] {
  const rows = heightField.length;
  const cols = heightField[0].length;
  
  // 计算当前体积
  let currentVolume = 0;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      currentVolume += heightField[i][j];
    }
  }
  
  // 计算缩放因子
  const scaleFactor = targetVolume / currentVolume;
  
  // 应用缩放
  const result: number[][] = [];
  for (let i = 0; i < rows; i++) {
    result[i] = [];
    for (let j = 0; j < cols; j++) {
      result[i][j] = heightField[i][j] * scaleFactor;
    }
  }
  
  return result;
}

/**
 * 计算散度 (divergence)
 */
export function divergence(vectorField: THREE.Vector2[][]): number[][] {
  const rows = vectorField.length;
  const cols = vectorField[0].length;
  const div: number[][] = [];
  
  for (let i = 0; i < rows; i++) {
    div[i] = [];
    for (let j = 0; j < cols; j++) {
      let divValue = 0;
      
      // 计算x方向的偏导数
      if (j < cols - 1) {
        divValue += vectorField[i][j + 1].x - vectorField[i][j].x;
      }
      
      // 计算y方向的偏导数
      if (i < rows - 1) {
        divValue += vectorField[i + 1][j].y - vectorField[i][j].y;
      }
      
      div[i][j] = divValue;
    }
  }
  
  return div;
}

/**
 * 计算熔融石英的折射率 (Sellmeier方程)
 */
export function fusedSilicaRefractiveIndex(wavelength: number): number {
  // 波长单位: 微米
  // Sellmeier系数 for 熔融石英
  const B1 = 0.6961663;
  const B2 = 0.4079426;
  const B3 = 0.8974794;
  const C1 = 0.0684043;
  const C2 = 0.1162414;
  const C3 = 9.896161;
  
  const wl2 = wavelength * wavelength;
  
  const n2 = 1 + 
    (B1 * wl2) / (wl2 - C1) +
    (B2 * wl2) / (wl2 - C2) +
    (B3 * wl2) / (wl2 - C3);
  
  return Math.sqrt(n2);
}

/**
 * 双线性插值
 */
export function bilinearInterpolation(
  grid: number[][],
  x: number,
  y: number
): number {
  const rows = grid.length;
  const cols = grid[0].length;
  
  // 边界检查
  x = Math.max(0, Math.min(rows - 1, x));
  y = Math.max(0, Math.min(cols - 1, y));
  
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, rows - 1);
  const y1 = Math.min(y0 + 1, cols - 1);
  
  const fx = x - x0;
  const fy = y - y0;
  
  const v00 = grid[x0][y0];
  const v10 = grid[x1][y0];
  const v01 = grid[x0][y1];
  const v11 = grid[x1][y1];
  
  return v00 * (1 - fx) * (1 - fy) +
         v10 * fx * (1 - fy) +
         v01 * (1 - fx) * fy +
         v11 * fx * fy;
}

/**
 * 矩阵乘法 (3x3)
 */
export function matrixMultiply3x3(
  a: number[][],
  b: number[][]
): number[][] {
  const result: number[][] = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0]
  ];
  
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      for (let k = 0; k < 3; k++) {
        result[i][j] += a[i][k] * b[k][j];
      }
    }
  }
  
  return result;
}

/**
 * 计算基变换矩阵
 */
export function changeOfBasisMatrix(
  from: [THREE.Vector3, THREE.Vector3, THREE.Vector3],
  to: [THREE.Vector3, THREE.Vector3, THREE.Vector3]
): THREE.Matrix3 {
  // 构建变换矩阵
  const fromMatrix = new THREE.Matrix3().set(
    from[0].x, from[1].x, from[2].x,
    from[0].y, from[1].y, from[2].y,
    from[0].z, from[1].z, from[2].z
  );
  
  const toMatrix = new THREE.Matrix3().set(
    to[0].x, to[1].x, to[2].x,
    to[0].y, to[1].y, to[2].y,
    to[0].z, to[1].z, to[2].z
  );
  
  // 计算变换矩阵: to * from^(-1)
  const fromInverse = fromMatrix.clone().invert();
  return toMatrix.multiply(fromInverse);
}