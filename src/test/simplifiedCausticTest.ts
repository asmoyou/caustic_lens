// 简化的焦散测试文件
import * as THREE from 'three';

/**
 * 简化的焦散测试场景
 * 用于逐步调试焦散渲染问题
 */
export class SimplifiedCausticTest {
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.OrthographicCamera;
  private canvas: HTMLCanvasElement;

  constructor() {
    // 创建最小化的渲染环境
    this.canvas = document.createElement('canvas');
    this.canvas.width = 256;
    this.canvas.height = 256;
    
    this.renderer = new THREE.WebGLRenderer({ 
      canvas: this.canvas,
      preserveDrawingBuffer: true,
      antialias: false
    });
    this.renderer.setSize(256, 256);
    this.renderer.setClearColor(0x000000, 1.0);
    
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    this.camera.position.z = 1;
  }

  /**
   * 测试1: 基础光线投射
   * 验证最简单的光线是否能正确投射到墙面
   */
  testBasicLightProjection(): {
    success: boolean;
    imageData: string;
    issues: string[];
  } {
    const issues: string[] = [];
    
    try {
      // 清空场景
      this.scene.clear();
      
      // 创建一个简单的白色平面
      const geometry = new THREE.PlaneGeometry(2, 2);
      const material = new THREE.MeshBasicMaterial({ 
        color: 0xffffff,
        transparent: false
      });
      const plane = new THREE.Mesh(geometry, material);
      this.scene.add(plane);
      
      // 渲染
      this.renderer.render(this.scene, this.camera);
      
      // 获取图像数据
      const imageData = this.canvas.toDataURL('image/png');
      
      // 检查渲染结果
      const ctx = this.canvas.getContext('2d');
      if (ctx) {
        const pixelData = ctx.getImageData(128, 128, 1, 1).data;
        if (pixelData[0] === 0 && pixelData[1] === 0 && pixelData[2] === 0) {
          issues.push('基础渲染失败：中心像素为黑色');
        }
      }
      
      return {
        success: issues.length === 0,
        imageData,
        issues
      };
    } catch (error) {
      issues.push(`基础渲染异常: ${(error as Error).message}`);
      return {
        success: false,
        imageData: '',
        issues
      };
    }
  }

  /**
   * 测试2: 简单纹理渲染
   * 验证纹理是否能正确显示
   */
  testSimpleTexture(): {
    success: boolean;
    imageData: string;
    issues: string[];
  } {
    const issues: string[] = [];
    
    try {
      // 清空场景
      this.scene.clear();
      
      // 创建简单的棋盘纹理
      const textureCanvas = document.createElement('canvas');
      textureCanvas.width = 64;
      textureCanvas.height = 64;
      const textureCtx = textureCanvas.getContext('2d')!;
      
      // 绘制棋盘图案
      for (let x = 0; x < 64; x += 8) {
        for (let y = 0; y < 64; y += 8) {
          const isWhite = ((x / 8) + (y / 8)) % 2 === 0;
          textureCtx.fillStyle = isWhite ? '#ffffff' : '#000000';
          textureCtx.fillRect(x, y, 8, 8);
        }
      }
      
      const texture = new THREE.CanvasTexture(textureCanvas);
      texture.needsUpdate = true;
      
      // 创建带纹理的平面
      const geometry = new THREE.PlaneGeometry(2, 2);
      const material = new THREE.MeshBasicMaterial({ 
        map: texture,
        transparent: false
      });
      const plane = new THREE.Mesh(geometry, material);
      this.scene.add(plane);
      
      // 渲染
      this.renderer.render(this.scene, this.camera);
      
      // 获取图像数据
      const imageData = this.canvas.toDataURL('image/png');
      
      // 检查渲染结果
      const ctx = this.canvas.getContext('2d');
      if (ctx) {
        const pixelData = ctx.getImageData(64, 64, 1, 1).data;
        const pixelData2 = ctx.getImageData(192, 192, 1, 1).data;
        
        // 检查是否有对比度
        const brightness1 = (pixelData[0] + pixelData[1] + pixelData[2]) / 3;
        const brightness2 = (pixelData2[0] + pixelData2[1] + pixelData2[2]) / 3;
        
        if (Math.abs(brightness1 - brightness2) < 50) {
          issues.push('纹理渲染失败：没有检测到棋盘图案的对比度');
        }
      }
      
      return {
        success: issues.length === 0,
        imageData,
        issues
      };
    } catch (error) {
      issues.push(`纹理渲染异常: ${(error as Error).message}`);
      return {
        success: false,
        imageData: '',
        issues
      };
    }
  }

  /**
   * 测试3: 简化的焦散着色器
   * 测试最基本的焦散效果着色器
   */
  testSimpleCausticShader(): {
    success: boolean;
    imageData: string;
    issues: string[];
  } {
    const issues: string[] = [];
    
    try {
      // 清空场景
      this.scene.clear();
      
      // 简化的焦散顶点着色器
      const vertexShader = `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `;
      
      // 简化的焦散片段着色器
      const fragmentShader = `
        varying vec2 vUv;
        uniform float time;
        
        void main() {
          // 简单的波纹效果模拟焦散
          vec2 center = vec2(0.5, 0.5);
          float dist = distance(vUv, center);
          float wave = sin(dist * 20.0 - time * 2.0) * 0.5 + 0.5;
          
          // 创建焦散强度
          float intensity = wave * (1.0 - dist);
          intensity = clamp(intensity, 0.0, 1.0);
          
          gl_FragColor = vec4(intensity, intensity * 0.8, intensity * 0.6, intensity);
        }
      `;
      
      // 创建着色器材质
      const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          time: { value: 0.0 }
        },
        transparent: true,
        blending: THREE.AdditiveBlending
      });
      
      // 创建平面
      const geometry = new THREE.PlaneGeometry(2, 2);
      const plane = new THREE.Mesh(geometry, material);
      this.scene.add(plane);
      
      // 渲染
      this.renderer.render(this.scene, this.camera);
      
      // 获取图像数据
      const imageData = this.canvas.toDataURL('image/png');
      
      // 检查渲染结果
      const ctx = this.canvas.getContext('2d');
      if (ctx) {
        const centerPixel = ctx.getImageData(128, 128, 1, 1).data;
        const edgePixel = ctx.getImageData(32, 32, 1, 1).data;
        
        // 检查中心是否比边缘亮
        const centerBrightness = (centerPixel[0] + centerPixel[1] + centerPixel[2]) / 3;
        const edgeBrightness = (edgePixel[0] + edgePixel[1] + edgePixel[2]) / 3;
        
        if (centerBrightness <= edgeBrightness) {
          issues.push('焦散着色器失败：中心区域不比边缘亮');
        }
        
        if (centerBrightness === 0) {
          issues.push('焦散着色器失败：完全黑色输出');
        }
      }
      
      return {
        success: issues.length === 0,
        imageData,
        issues
      };
    } catch (error) {
      issues.push(`焦散着色器异常: ${(error as Error).message}`);
      return {
        success: false,
        imageData: '',
        issues
      };
    }
  }

  /**
   * 测试4: 高度图纹理生成
   * 验证高度图数据是否正确生成
   */
  testHeightMapGeneration(): {
    success: boolean;
    heightData: Float32Array;
    imageData: string;
    issues: string[];
  } {
    const issues: string[] = [];
    
    try {
      // 生成简单的高度图数据
      const size = 32;
      const heightData = new Float32Array(size * size);
      
      // 创建简单的凸透镜高度分布
      const center = size / 2;
      const maxHeight = 0.1;
      
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const dx = x - center;
          const dy = y - center;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const normalizedDist = dist / center;
          
          // 抛物面高度分布
          let height = 0;
          if (normalizedDist <= 1.0) {
            height = maxHeight * (1.0 - normalizedDist * normalizedDist);
          }
          
          heightData[y * size + x] = height;
        }
      }
      
      // 验证高度数据
      const centerHeight = heightData[Math.floor(center) * size + Math.floor(center)];
      const edgeHeight = heightData[0];
      
      if (centerHeight <= edgeHeight) {
        issues.push('高度图生成失败：中心高度不大于边缘高度');
      }
      
      if (centerHeight === 0) {
        issues.push('高度图生成失败：中心高度为零');
      }
      
      // 创建高度图纹理可视化
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      const imageData = ctx.createImageData(size, size);
      
      for (let i = 0; i < heightData.length; i++) {
        const height = heightData[i];
        const intensity = Math.floor((height / maxHeight) * 255);
        const pixelIndex = i * 4;
        
        imageData.data[pixelIndex] = intensity;     // R
        imageData.data[pixelIndex + 1] = intensity; // G
        imageData.data[pixelIndex + 2] = intensity; // B
        imageData.data[pixelIndex + 3] = 255;       // A
      }
      
      ctx.putImageData(imageData, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');
      
      return {
        success: issues.length === 0,
        heightData,
        imageData: dataUrl,
        issues
      };
    } catch (error) {
      issues.push(`高度图生成异常: ${(error as Error).message}`);
      return {
        success: false,
        heightData: new Float32Array(0),
        imageData: '',
        issues
      };
    }
  }

  /**
   * 运行所有简化测试
   */
  runAllTests(): {
    basicProjection: any;
    textureTest: any;
    causticShader: any;
    heightMap: any;
    overallSuccess: boolean;
    summary: string;
  } {
    console.log('开始运行简化焦散测试...');
    
    const basicProjection = this.testBasicLightProjection();
    const textureTest = this.testSimpleTexture();
    const causticShader = this.testSimpleCausticShader();
    const heightMap = this.testHeightMapGeneration();
    
    const allTests = [basicProjection, textureTest, causticShader, heightMap];
    const successCount = allTests.filter(test => test.success).length;
    const overallSuccess = successCount === allTests.length;
    
    let summary = `简化测试完成: ${successCount}/${allTests.length} 通过\n`;
    
    if (!basicProjection.success) {
      summary += '❌ 基础渲染失败 - 检查WebGL环境\n';
    }
    if (!textureTest.success) {
      summary += '❌ 纹理渲染失败 - 检查纹理处理\n';
    }
    if (!causticShader.success) {
      summary += '❌ 焦散着色器失败 - 检查着色器代码\n';
    }
    if (!heightMap.success) {
      summary += '❌ 高度图生成失败 - 检查几何计算\n';
    }
    
    if (overallSuccess) {
      summary += '✅ 所有基础组件正常，问题可能在复杂的光线追踪逻辑中';
    }
    
    return {
      basicProjection,
      textureTest,
      causticShader,
      heightMap,
      overallSuccess,
      summary
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
export function runSimplifiedCausticTests() {
  const tester = new SimplifiedCausticTest();
  const results = tester.runAllTests();
  tester.dispose();
  return results;
}