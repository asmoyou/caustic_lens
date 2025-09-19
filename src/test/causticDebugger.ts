/**
 * 焦散渲染调试器
 * 用于系统性地测试和调试焦散渲染问题
 */

import * as THREE from 'three';
import type { CausticParameters } from '../types';

export class CausticDebugger {
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private debugCanvas: HTMLCanvasElement;
  
  constructor() {
    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.debugCanvas = document.createElement('canvas');
    this.debugCanvas.width = 512;
    this.debugCanvas.height = 512;
  }

  /**
   * 测试1: 验证光源、透镜、墙面的空间关系
   */
  testSpatialRelationships(parameters: CausticParameters): {
    lightSourcePosition: { x: number; y: number; z: number };
    lensPosition: { x: number; y: number; z: number };
    wallPosition: { x: number; y: number; z: number };
    distances: {
      lightToLens: number;
      lensToWall: number;
      totalDistance: number;
    };
    issues: string[];
  } {
    console.log('=== 测试1: 空间关系验证 ===');
    
    const lightSource = parameters.lightSource.position;
    const lensPosition = { x: 0, y: 0, z: 0 }; // 透镜在原点
    const wallPosition = { x: 0, y: 0, z: -parameters.targetDistance };
    
    const lightToLens = Math.sqrt(
      Math.pow(lightSource.x - lensPosition.x, 2) +
      Math.pow(lightSource.y - lensPosition.y, 2) +
      Math.pow(lightSource.z - lensPosition.z, 2)
    );
    
    const lensToWall = Math.sqrt(
      Math.pow(wallPosition.x - lensPosition.x, 2) +
      Math.pow(wallPosition.y - lensPosition.y, 2) +
      Math.pow(wallPosition.z - lensPosition.z, 2)
    );
    
    const issues: string[] = [];
    
    // 检查光源位置
    if (lightSource.z >= 0) {
      issues.push('光源Z坐标应该为负值（在透镜前方）');
    }
    
    // 检查墙面位置
    if (wallPosition.z >= 0) {
      issues.push('墙面Z坐标应该为负值（在透镜后方）');
    }
    
    // 检查距离关系
    if (lightToLens < 50) {
      issues.push('光源距离透镜太近，可能导致光线角度过大');
    }
    
    if (lensToWall < parameters.focalLength * 0.5) {
      issues.push('墙面距离透镜太近，可能在焦点前方');
    }
    
    const result = {
      lightSourcePosition: lightSource,
      lensPosition,
      wallPosition,
      distances: {
        lightToLens,
        lensToWall,
        totalDistance: lightToLens + lensToWall
      },
      issues
    };
    
    console.log('空间关系测试结果:', result);
    return result;
  }

  /**
   * 测试2: 验证光线折射计算
   */
  testRefractionCalculation(parameters: CausticParameters): {
    testCases: Array<{
      incident: THREE.Vector3;
      normal: THREE.Vector3;
      refracted: THREE.Vector3;
      totalInternalReflection: boolean;
    }>;
    issues: string[];
  } {
    console.log('=== 测试2: 光线折射计算验证 ===');
    
    const n1 = 1.0; // 空气折射率
    const n2 = parameters.refractiveIndex; // 透镜材料折射率
    const issues: string[] = [];
    
    // 测试用例：不同角度的入射光线
    const testCases = [
      { incident: new THREE.Vector3(0, 0, 1), normal: new THREE.Vector3(0, 0, -1) }, // 垂直入射
      { incident: new THREE.Vector3(0.5, 0, 0.866), normal: new THREE.Vector3(0, 0, -1) }, // 30度入射
      { incident: new THREE.Vector3(0.707, 0, 0.707), normal: new THREE.Vector3(0, 0, -1) }, // 45度入射
      { incident: new THREE.Vector3(0.866, 0, 0.5), normal: new THREE.Vector3(0, 0, -1) }, // 60度入射
    ];
    
    const results = testCases.map(testCase => {
      const { incident, normal } = testCase;
      
      // 计算入射角
      const cosTheta1 = -incident.dot(normal);
      const sinTheta1 = Math.sqrt(1 - cosTheta1 * cosTheta1);
      
      // 计算折射角（斯涅尔定律）
      const sinTheta2 = (n1 / n2) * sinTheta1;
      
      let refracted = new THREE.Vector3();
      let totalInternalReflection = false;
      
      if (sinTheta2 > 1) {
        // 全内反射
        totalInternalReflection = true;
        refracted = incident.clone().reflect(normal);
      } else {
        // 正常折射
        const cosTheta2 = Math.sqrt(1 - sinTheta2 * sinTheta2);
        const r = (n1 / n2);
        const c = -cosTheta1;
        
        refracted = incident.clone()
          .multiplyScalar(r)
          .add(normal.clone().multiplyScalar(r * c - cosTheta2));
      }
      
      return {
        incident: incident.clone(),
        normal: normal.clone(),
        refracted,
        totalInternalReflection
      };
    });
    
    // 检查折射率
    if (parameters.refractiveIndex < 1.0 || parameters.refractiveIndex > 3.0) {
      issues.push(`折射率异常: ${parameters.refractiveIndex}，应该在1.0-3.0之间`);
    }
    
    console.log('折射计算测试结果:', { testCases: results, issues });
    return { testCases: results, issues };
  }

  /**
   * 测试3: 验证焦散强度计算
   */
  testCausticIntensityCalculation(): {
    testResults: Array<{
      oldArea: number;
      newArea: number;
      ratio: number;
      intensity: number;
    }>;
    issues: string[];
  } {
    console.log('=== 测试3: 焦散强度计算验证 ===');
    
    const issues: string[] = [];
    const testCases = [
      { oldArea: 1.0, newArea: 0.5 }, // 光线聚焦
      { oldArea: 1.0, newArea: 2.0 }, // 光线发散
      { oldArea: 1.0, newArea: 0.1 }, // 强聚焦
      { oldArea: 1.0, newArea: 0.0 }, // 极端情况
      { oldArea: 0.0, newArea: 1.0 }, // 异常情况
    ];
    
    const testResults = testCases.map(({ oldArea, newArea }) => {
      let ratio: number;
      let intensity: number;
      
      if (newArea === 0.0 || newArea < 0.001) {
        // 对于极端聚焦情况，使用对数缓解函数避免过高值
        ratio = 10.0; // 降低最大比值
        intensity = Math.min(100.0, 2.0 * Math.log(1 + ratio * 10)); // 使用对数函数限制最大强度
      } else if (oldArea === 0.0) {
        // 处理异常输入情况
        ratio = 0.1;
        intensity = 0.5;
      } else {
        ratio = Math.max(0.1, Math.min(oldArea / newArea, 10.0)); // 降低最大比值限制
        intensity = Math.min(50.0, 1.5 * Math.sqrt(ratio)); // 使用平方根函数并限制最大值
      }
      
      return { oldArea, newArea, ratio, intensity };
    });
    
    // 检查是否有异常值
    testResults.forEach((result, index) => {
      if (result.intensity > 100) {
        issues.push(`测试用例${index + 1}强度过高: ${result.intensity}`);
      }
      if (result.intensity < 0) {
        issues.push(`测试用例${index + 1}强度为负: ${result.intensity}`);
      }
      if (isNaN(result.intensity)) {
        issues.push(`测试用例${index + 1}强度计算错误: NaN`);
      }
    });
    
    console.log('焦散强度计算测试结果:', { testResults, issues });
    return { testResults, issues };
  }

  /**
   * 测试4: 生成简单的测试图案
   */
  generateTestPattern(width: number = 64, height: number = 64): {
    pattern: number[][];
    description: string;
  } {
    console.log('=== 测试4: 生成测试图案 ===');
    
    const pattern: number[][] = [];
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 4;
    
    for (let x = 0; x < width; x++) {
      pattern[x] = [];
      for (let y = 0; y < height; y++) {
        const distance = Math.sqrt(
          Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
        );
        
        // 创建一个简单的圆形图案
        if (distance <= radius) {
          pattern[x][y] = 1.0; // 圆形内部为白色
        } else {
          pattern[x][y] = 0.0; // 圆形外部为黑色
        }
      }
    }
    
    return {
      pattern,
      description: `${width}x${height}的圆形测试图案，半径${radius}`
    };
  }

  /**
   * 测试5: 验证纹理生成
   */
  testTextureGeneration(pattern: number[][]): {
    texture: THREE.Texture | null;
    canvas: HTMLCanvasElement;
    issues: string[];
  } {
    console.log('=== 测试5: 纹理生成验证 ===');
    
    const issues: string[] = [];
    const width = pattern.length;
    const height = pattern[0].length;
    
    // 创建canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      issues.push('无法创建2D渲染上下文');
      return { texture: null, canvas, issues };
    }
    
    // 生成图像数据
    const imageData = ctx.createImageData(width, height);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        const value = Math.floor(pattern[x][y] * 255);
        
        imageData.data[index] = value;     // R
        imageData.data[index + 1] = value; // G
        imageData.data[index + 2] = value; // B
        imageData.data[index + 3] = 255;   // A
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    // 创建THREE.js纹理
    let texture: THREE.Texture | null = null;
    try {
      texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
    } catch (error) {
      issues.push(`纹理创建失败: ${error}`);
    }
    
    console.log('纹理生成测试结果:', { hasTexture: !!texture, issues });
    return { texture, canvas, issues };
  }

  /**
   * 运行完整的调试测试套件
   */
  runFullDiagnostics(parameters: CausticParameters, targetShape?: number[][]): {
    spatialTest: any;
    refractionTest: any;
    intensityTest: any;
    patternTest: any;
    textureTest: any;
    overallIssues: string[];
    recommendations: string[];
  } {
    console.log('\n=== 开始完整的焦散渲染诊断 ===\n');
    
    const spatialTest = this.testSpatialRelationships(parameters);
    const refractionTest = this.testRefractionCalculation(parameters);
    const intensityTest = this.testCausticIntensityCalculation();
    
    // 使用提供的目标形状或生成测试图案
    const patternTest = targetShape ? 
      { pattern: targetShape, description: '用户提供的目标形状' } :
      this.generateTestPattern();
    
    const textureTest = this.testTextureGeneration(patternTest.pattern);
    
    // 收集所有问题
    const overallIssues = [
      ...spatialTest.issues,
      ...refractionTest.issues,
      ...intensityTest.issues,
      ...textureTest.issues
    ];
    
    // 生成建议
    const recommendations: string[] = [];
    
    if (spatialTest.issues.length > 0) {
      recommendations.push('调整光源和墙面的位置设置');
    }
    
    if (refractionTest.issues.length > 0) {
      recommendations.push('检查材料折射率设置');
    }
    
    if (intensityTest.issues.length > 0) {
      recommendations.push('优化焦散强度计算公式');
    }
    
    if (textureTest.issues.length > 0) {
      recommendations.push('修复纹理生成流程');
    }
    
    if (overallIssues.length === 0) {
      recommendations.push('基础测试通过，问题可能在复杂的光线追踪算法中');
    }
    
    console.log('\n=== 诊断完成 ===');
    console.log('发现的问题:', overallIssues);
    console.log('建议:', recommendations);
    
    return {
      spatialTest,
      refractionTest,
      intensityTest,
      patternTest,
      textureTest,
      overallIssues,
      recommendations
    };
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.renderer.dispose();
    this.scene.clear();
  }
}

// 导出便捷函数
export function runCausticDiagnostics(parameters: CausticParameters, targetShape?: number[][]) {
  const causticDebugger = new CausticDebugger();
  const results = causticDebugger.runFullDiagnostics(parameters, targetShape);
  causticDebugger.dispose();
  return results;
}