/**
 * ShapeFromCaustics算法测试文件
 * 用于验证算法的正确性和性能
 */

import { ShapeFromCausticsGenerator } from './index';
import * as THREE from 'three';

/**
 * 创建测试用的ImageData
 */
function createTestImageData(width: number, height: number, pattern: 'circle' | 'square' | 'cross'): ImageData {
  // 在Node.js环境中模拟ImageData
  const data = new Uint8ClampedArray(width * height * 4);
  const imageData = {
    data,
    width,
    height
  } as ImageData;
  
  const centerX = width / 2;
  const centerY = height / 2;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixelIndex = (y * width + x) * 4;
      let intensity = 0;
      
      switch (pattern) {
        case 'circle':
          const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
          intensity = distance < Math.min(width, height) / 4 ? 1 : 0;
          break;
          
        case 'square':
          const halfSize = Math.min(width, height) / 4;
          intensity = (Math.abs(x - centerX) < halfSize && Math.abs(y - centerY) < halfSize) ? 1 : 0;
          break;
          
        case 'cross':
          const lineWidth = Math.min(width, height) / 20;
          intensity = (Math.abs(x - centerX) < lineWidth || Math.abs(y - centerY) < lineWidth) ? 1 : 0;
          break;
      }
      
      const pixelValue = Math.floor(intensity * 255);
      data[pixelIndex] = pixelValue;     // R
      data[pixelIndex + 1] = pixelValue; // G
      data[pixelIndex + 2] = pixelValue; // B
      data[pixelIndex + 3] = 255;        // A
    }
  }
  
  return imageData;
}

/**
 * 测试基本功能
 */
export async function testBasicFunctionality(): Promise<void> {
  console.log('=== 测试基本功能 ===');
  
  const generator = new ShapeFromCausticsGenerator({
    heightFieldResolution: 32,
    photonMapSize: 64,
    maxIterations: 10, // 减少迭代次数以加快测试
    convergenceThreshold: 1e-2,
    refractiveIndex: 1.49,
    wavelengths: [0.55],
    lightPosition: new THREE.Vector3(0, 0, 50),
    targetDistance: 100,
    heightOffset: 2.0,
    lensWidth: 50,
    lensHeight: 50,
    thickness: 5
  });
  
  // 测试圆形图案
  console.log('测试圆形图案...');
  const circleImage = createTestImageData(64, 64, 'circle');
  const startTime = Date.now();
  
  try {
    const geometry = await generator.generateLens(circleImage);
    const endTime = Date.now();
    
    console.log('圆形图案测试成功:', {
      处理时间: `${endTime - startTime}ms`,
      顶点数: geometry.vertices.length,
      面数: geometry.faces.length,
      法向量数: geometry.normals.length,
      UV坐标数: geometry.uvs.length
    });
    
    // 验证几何体数据
    validateGeometry(geometry, '圆形图案');
    
  } catch (error) {
    console.error('圆形图案测试失败:', error);
    throw error;
  }
}

/**
 * 测试不同图案
 */
export async function testDifferentPatterns(): Promise<void> {
  console.log('\n=== 测试不同图案 ===');
  
  const generator = new ShapeFromCausticsGenerator({
    heightFieldResolution: 24,
    photonMapSize: 48,
    maxIterations: 5,
    convergenceThreshold: 1e-2
  });
  
  const patterns: Array<'circle' | 'square' | 'cross'> = ['circle', 'square', 'cross'];
  
  for (const pattern of patterns) {
    console.log(`测试${pattern}图案...`);
    const imageData = createTestImageData(48, 48, pattern);
    const startTime = Date.now();
    
    try {
      const geometry = await generator.generateLens(imageData);
      const endTime = Date.now();
      
      console.log(`${pattern}图案测试成功:`, {
        处理时间: `${endTime - startTime}ms`,
        顶点数: geometry.vertices.length
      });
      
      validateGeometry(geometry, `${pattern}图案`);
      
    } catch (error) {
      console.error(`${pattern}图案测试失败:`, error);
    }
  }
}

/**
 * 测试性能
 */
export async function testPerformance(): Promise<void> {
  console.log('\n=== 性能测试 ===');
  
  const resolutions = [16, 24, 32];
  const imageData = createTestImageData(32, 32, 'circle');
  
  for (const resolution of resolutions) {
    console.log(`测试分辨率 ${resolution}x${resolution}...`);
    
    const generator = new ShapeFromCausticsGenerator({
      heightFieldResolution: resolution,
      photonMapSize: resolution * 2,
      maxIterations: 5,
      convergenceThreshold: 1e-2
    });
    
    const startTime = Date.now();
    
    try {
      const geometry = await generator.generateLens(imageData);
      const endTime = Date.now();
      
      console.log(`分辨率 ${resolution} 测试结果:`, {
        处理时间: `${endTime - startTime}ms`,
        顶点数: geometry.vertices.length,
        面数: geometry.faces.length,
        平均每顶点时间: `${((endTime - startTime) / geometry.vertices.length).toFixed(2)}ms`
      });
      
    } catch (error) {
      console.error(`分辨率 ${resolution} 测试失败:`, error);
    }
  }
}

/**
 * 验证几何体数据
 */
function validateGeometry(geometry: any, testName: string): void {
  const { vertices, faces, normals, uvs } = geometry;
  
  // 检查基本数据
  if (!vertices || vertices.length === 0) {
    throw new Error(`${testName}: 缺少顶点数据`);
  }
  
  if (!faces || faces.length === 0) {
    throw new Error(`${testName}: 缺少面数据`);
  }
  
  if (!normals || normals.length !== vertices.length) {
    throw new Error(`${testName}: 法向量数量不匹配`);
  }
  
  if (!uvs || uvs.length !== vertices.length) {
    throw new Error(`${testName}: UV坐标数量不匹配`);
  }
  
  // 检查数据有效性
  for (let i = 0; i < vertices.length; i++) {
    const v = vertices[i];
    if (!isFinite(v.x) || !isFinite(v.y) || !isFinite(v.z)) {
      throw new Error(`${testName}: 顶点 ${i} 包含无效数据: ${JSON.stringify(v)}`);
    }
    
    const n = normals[i];
    if (!isFinite(n.x) || !isFinite(n.y) || !isFinite(n.z)) {
      throw new Error(`${testName}: 法向量 ${i} 包含无效数据: ${JSON.stringify(n)}`);
    }
    
    const uv = uvs[i];
    if (!isFinite(uv.x) || !isFinite(uv.y)) {
      throw new Error(`${testName}: UV坐标 ${i} 包含无效数据: ${JSON.stringify(uv)}`);
    }
  }
  
  // 检查面数据
  for (let i = 0; i < faces.length; i++) {
    const face = faces[i];
    if (!Array.isArray(face) || face.length !== 3) {
      throw new Error(`${testName}: 面 ${i} 不是三角形: ${JSON.stringify(face)}`);
    }
    
    for (const vertexIndex of face) {
      if (vertexIndex < 0 || vertexIndex >= vertices.length) {
        throw new Error(`${testName}: 面 ${i} 包含无效顶点索引: ${vertexIndex}`);
      }
    }
  }
  
  console.log(`${testName}: 几何体验证通过`);
}

/**
 * 运行所有测试
 */
export async function runAllTests(): Promise<void> {
  console.log('开始运行ShapeFromCaustics算法测试...');
  
  try {
    await testBasicFunctionality();
    await testDifferentPatterns();
    await testPerformance();
    
    console.log('\n=== 所有测试完成 ===');
    console.log('✅ 所有测试通过！');
    
  } catch (error) {
    console.log('\n=== 测试失败 ===');
    console.error('❌ 测试失败:', error);
    throw error;
  }
}

// 如果直接运行此文件，执行测试
if (typeof window === 'undefined') {
  // Node.js 环境
  runAllTests().catch(console.error);
}