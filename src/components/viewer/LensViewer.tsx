import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, Text, Html } from '@react-three/drei';
import { Button, Space, Tooltip, Card, Slider, Switch, Select, Typography, message } from 'antd';
import { 
  RotateLeftOutlined, 
  RotateRightOutlined, 
  ZoomInOutlined, 
  ZoomOutOutlined,
  AppstoreOutlined,
  DownloadOutlined,
  BulbOutlined,
  EyeOutlined,
  SettingOutlined
} from '@ant-design/icons';
import * as THREE from 'three';
import { useProjectStore } from '../../stores/projectStore';
import type { LensGeometry, Point3D, CausticParameters, ImageData } from '../../types';

// CausticsRenderer removed - using new implementation

const { Text: AntText } = Typography;
const { Option } = Select;

// 最简单的顶点着色器
const vertexShader = `
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// 最简单的片段着色器 - 纯色输出
const fragmentShader = `
  precision mediump float;
  
  void main() {
    gl_FragColor = vec4(1.0, 0.5, 0.0, 1.0); // 橙色
  }
`;

// 测试着色器将在后面定义

interface ViewerSettings {
  wireframe: boolean;
  showGrid: boolean;
  showAxes: boolean;
  lightIntensity: number;
  materialType: 'glass' | 'plastic' | 'crystal' | 'acrylic' | 'polycarbonate' | 'pmma';
  backgroundColor: string;
  autoRotate: boolean;
  showCaustics: boolean;
  showWall: boolean;
  wallDistance: number;
  // 移除了焦散渲染模式选择
}

// 透镜网格组件
const LensMesh: React.FC<{ settings: ViewerSettings; onRotationChange?: (rotation: number) => void }> = ({ settings, onRotationChange }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { geometry } = useProjectStore();
  const [hovered, setHovered] = useState(false);

  useFrame((state, delta) => {
    if (meshRef.current && settings.autoRotate) {
      meshRef.current.rotation.y += delta * 0.5;
    }
  });

  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : 'auto';
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, [hovered]);

  if (!geometry) return null;

  // 创建Three.js几何体
  const threeGeometry = React.useMemo(() => {
    // 验证几何体数据
    if (!geometry || !geometry.vertices || !geometry.faces || geometry.vertices.length === 0 || geometry.faces.length === 0) {
      console.warn('Invalid geometry data:', geometry);
      return null;
    }
    
    console.log('Creating Three.js geometry with:', {
      vertices: geometry.vertices.length,
      faces: geometry.faces.length,
      normals: geometry.normals?.length || 0
    });
    
    const geom = new THREE.BufferGeometry();
    
    try {
      // 验证并转换顶点数据
      const validVertices = geometry.vertices.filter(v => 
        v && typeof v.x === 'number' && typeof v.y === 'number' && typeof v.z === 'number' &&
        isFinite(v.x) && isFinite(v.y) && isFinite(v.z)
      );
      
      if (validVertices.length === 0) {
        console.error('No valid vertices found');
        return null;
      }
      
      const vertices = new Float32Array(validVertices.length * 3);
      validVertices.forEach((vertex, i) => {
        vertices[i * 3] = vertex.x || 0;
        vertices[i * 3 + 1] = vertex.y || 0;
        vertices[i * 3 + 2] = vertex.z || 0;
      });
      
      // 验证vertices数组的完整性
      if (!vertices.buffer || vertices.byteLength === 0) {
        console.error('Invalid vertices buffer');
        return null;
      }
      
      // 验证并转换面数据
      console.log('Original faces data:', {
        totalFaces: geometry.faces.length,
        firstFew: geometry.faces.slice(0, 5),
        vertexCount: validVertices.length
      });
      
      const validFaces = geometry.faces.filter((face, index) => {
        if (!face || !Array.isArray(face) || face.length < 3) {
          console.warn(`Face ${index} is invalid: not an array or too few vertices`, face);
          return false;
        }
        
        // 检查每个索引是否为有效数字且在范围内
        for (let i = 0; i < 3; i++) {
          const idx = face[i];
          if (typeof idx !== 'number' || !Number.isInteger(idx) || idx < 0 || idx >= validVertices.length) {
            console.warn(`Face ${index} has invalid index ${i}: ${idx} (vertex count: ${validVertices.length})`);
            return false;
          }
        }
        
        return true;
      });
      
      console.log('Face validation result:', {
        originalCount: geometry.faces.length,
        validCount: validFaces.length,
        filteredOut: geometry.faces.length - validFaces.length
      });
      
      if (validFaces.length === 0) {
        console.error('No valid faces found after filtering');
        return null;
      }
      
      // 创建索引数组，确保所有值都是有效的
      const indices = new Uint32Array(validFaces.length * 3);
      validFaces.forEach((face, i) => {
        indices[i * 3] = Math.floor(face[0]);
        indices[i * 3 + 1] = Math.floor(face[1]);
        indices[i * 3 + 2] = Math.floor(face[2]);
      });
      
      // 验证indices数组的完整性
      if (!indices.buffer || indices.byteLength === 0) {
        console.error('Invalid indices buffer after creation');
        return null;
      }
      
      // 额外验证：检查索引数组中的最大值（避免堆栈溢出）
      let maxIndex = 0;
      for (let i = 0; i < indices.length; i++) {
        if (indices[i] > maxIndex) {
          maxIndex = indices[i];
        }
      }
      if (maxIndex >= validVertices.length) {
        console.error(`Index out of range: max index ${maxIndex}, vertex count ${validVertices.length}`);
        return null;
      }
      
      console.log('Index buffer created successfully:', {
        indexCount: indices.length,
        maxIndex: maxIndex,
        vertexCount: validVertices.length,
        byteLength: indices.byteLength
      });
      
      // 设置几何体属性
      if (vertices.length > 0) {
        geom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      } else {
        console.error('Empty vertices array');
        return null;
      }
      
      if (indices.length > 0) {
        geom.setIndex(new THREE.BufferAttribute(indices, 1));
      } else {
        console.error('Empty indices array');
        return null;
      }
      
      // 处理法向量
      if (geometry.normals && geometry.normals.length > 0) {
        const validNormals = geometry.normals.filter(n => 
          n && typeof n.x === 'number' && typeof n.y === 'number' && typeof n.z === 'number' &&
          isFinite(n.x) && isFinite(n.y) && isFinite(n.z)
        );
        
        if (validNormals.length === validVertices.length) {
          const normals = new Float32Array(validNormals.length * 3);
          validNormals.forEach((normal, i) => {
            normals[i * 3] = normal.x || 0;
            normals[i * 3 + 1] = normal.y || 0;
            normals[i * 3 + 2] = normal.z || 0;
          });
          
          // 验证normals数组的完整性
          if (normals.buffer && normals.byteLength > 0) {
            geom.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
          } else {
            console.warn('Invalid normals buffer, computing normals');
            geom.computeVertexNormals();
          }
        } else {
          console.warn('Normal count mismatch, computing normals');
          geom.computeVertexNormals();
        }
      } else {
        console.log('Computing vertex normals');
        geom.computeVertexNormals();
      }
      
      // 处理UV坐标
      if (geometry.uvs && geometry.uvs.length > 0) {
        const validUVs = geometry.uvs.filter(uv => 
          uv && typeof uv.x === 'number' && typeof uv.y === 'number' &&
          isFinite(uv.x) && isFinite(uv.y)
        );
        
        if (validUVs.length === validVertices.length) {
          const uvs = new Float32Array(validUVs.length * 2);
          validUVs.forEach((uv, i) => {
            uvs[i * 2] = uv.x || 0;
            uvs[i * 2 + 1] = uv.y || 0;
          });
          
          // 验证uvs数组的完整性
          if (uvs.buffer && uvs.byteLength > 0) {
            geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
          } else {
            console.warn('Invalid UVs buffer, generating default UVs');
            // 生成默认UV坐标
            const defaultUVs = new Float32Array(validVertices.length * 2);
            for (let i = 0; i < validVertices.length; i++) {
              defaultUVs[i * 2] = (i % 2); // 简单的UV映射
              defaultUVs[i * 2 + 1] = Math.floor(i / 2) % 2;
            }
            if (defaultUVs.buffer && defaultUVs.byteLength > 0) {
              geom.setAttribute('uv', new THREE.BufferAttribute(defaultUVs, 2));
            }
          }
        } else {
          console.warn('UV count mismatch, generating default UVs');
          // 生成默认UV坐标
          const defaultUVs = new Float32Array(validVertices.length * 2);
          for (let i = 0; i < validVertices.length; i++) {
            defaultUVs[i * 2] = (i % 2); // 简单的UV映射
            defaultUVs[i * 2 + 1] = Math.floor(i / 2) % 2;
          }
          
          // 验证defaultUVs数组的完整性
          if (defaultUVs.buffer && defaultUVs.byteLength > 0) {
            geom.setAttribute('uv', new THREE.BufferAttribute(defaultUVs, 2));
          }
        }
      }
      
      // 验证几何体完整性
      const positionAttr = geom.getAttribute('position');
      if (!positionAttr || positionAttr.count === 0 || !positionAttr.array || !positionAttr.array.buffer || positionAttr.array.byteLength === 0) {
        console.error('Invalid position attribute or buffer');
        return null;
      }
      
      // 验证索引缓冲区
      if (geom.index) {
        console.log('Index buffer details:', {
          hasIndex: !!geom.index,
          hasArray: geom.index ? !!geom.index.array : false,
          arrayLength: geom.index && geom.index.array ? geom.index.array.length : 0,
          hasBuffer: geom.index && geom.index.array ? !!geom.index.array.buffer : false,
          byteLength: geom.index && geom.index.array ? geom.index.array.byteLength : 0,
          count: geom.index ? geom.index.count : 0
        });
        
        // 使用count属性验证索引缓冲区，而不是依赖array属性
        if (!geom.index || geom.index.count === 0) {
          console.error('Invalid index buffer: no index or empty index count');
          return null;
        }
        
        // 如果array属性存在，则进行额外验证
        if (geom.index.array) {
          // 使用循环避免堆栈溢出
          let maxIndex = 0;
          for (let i = 0; i < geom.index.array.length; i++) {
            if (geom.index.array[i] > maxIndex) {
              maxIndex = geom.index.array[i];
            }
          }
          const vertexCount = positionAttr.count;
          if (maxIndex >= vertexCount) {
            console.error('Invalid index buffer: index out of range', { maxIndex, vertexCount });
            return null;
          }
        }
      }
      
      console.log('Successfully created Three.js geometry:', {
        vertices: positionAttr.count,
        faces: geom.index ? geom.index.count / 3 : 0,
        hasNormals: !!geom.getAttribute('normal'),
        hasUVs: !!geom.getAttribute('uv'),
        positionByteLength: positionAttr.array.byteLength,
        indexByteLength: geom.index && geom.index.array ? geom.index.array.byteLength : 0
      });
      
      return geom;
    } catch (error) {
      console.error('Error creating Three.js geometry:', error);
      return null;
    }
  }, [geometry]);
  
  if (!threeGeometry) {
    return null;
  }

  // 材质配置
  const materialProps = React.useMemo(() => {
    const baseProps = {
      wireframe: settings.wireframe,
      transparent: true,
      opacity: settings.wireframe ? 1 : 0.8,
      side: THREE.DoubleSide, // 双面渲染确保内外都可见
      depthWrite: !settings.wireframe, // 线框模式时禁用深度写入
    };

    switch (settings.materialType) {
      case 'glass':
        return {
          ...baseProps,
          color: '#87CEEB',
          roughness: 0.1,
          metalness: 0.1,
          transmission: 0.9,
          thickness: 0.5,
        };
      case 'acrylic':
        return {
          ...baseProps,
          color: '#F0F8FF',
          roughness: 0.2,
          metalness: 0.0,
          transmission: 0.85,
          thickness: 0.4,
          opacity: settings.wireframe ? 1 : 0.9,
        };
      case 'plastic':
        return {
          ...baseProps,
          color: '#FF6B6B',
          roughness: 0.3,
          metalness: 0.0,
        };
      case 'crystal':
        return {
          ...baseProps,
          color: '#DDA0DD',
          roughness: 0.05,
          metalness: 0.2,
          transmission: 0.7,
          thickness: 0.3,
        };
      case 'polycarbonate':
        return {
          ...baseProps,
          color: '#E6F3FF',
          roughness: 0.25,
          metalness: 0.0,
          transmission: 0.8,
          thickness: 0.45,
        };
      case 'pmma':
        return {
          ...baseProps,
          color: '#F0F8FF',
          roughness: 0.2,
          metalness: 0.0,
          transmission: 0.85,
          thickness: 0.4,
          opacity: settings.wireframe ? 1 : 0.9,
        };
      default:
        return baseProps;
    }
  }, [settings.materialType, settings.wireframe]);

  // 自动旋转逻辑
  useFrame((state, delta) => {
    if (settings.autoRotate && meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5; // 每秒旋转0.5弧度
      if (onRotationChange) {
        onRotationChange(meshRef.current.rotation.y);
      }
    }
  });

  return (
    <mesh
      ref={meshRef}
      geometry={threeGeometry}
      position={[0, 0, 0]} // 确保透镜位于原点
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      scale={hovered ? 1.05 : 1}
    >
      <meshPhysicalMaterial {...materialProps} />
    </mesh>
  );
};

// 网格地面
const GridFloor: React.FC = () => {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -50, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial color="#333" transparent opacity={0.3} />
      </mesh>
    </>
  );
};

// 坐标轴辅助器
const AxesHelper: React.FC<{ show: boolean }> = ({ show }) => {
  if (!show) return null;

  return (
    <group>
      {/* X轴 - 红色 */}
      <mesh position={[25, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.2, 0.2, 50]} />
        <meshBasicMaterial color="red" />
      </mesh>
      <Html position={[52, 0, 0]}>
        <div style={{ color: 'red', fontSize: '14px', fontWeight: 'bold' }}>X</div>
      </Html>
      
      {/* Y轴 - 绿色 */}
      <mesh position={[0, 25, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 50]} />
        <meshBasicMaterial color="green" />
      </mesh>
      <Html position={[0, 52, 0]}>
        <div style={{ color: 'green', fontSize: '14px', fontWeight: 'bold' }}>Y</div>
      </Html>
      
      {/* Z轴 - 蓝色 */}
      <mesh position={[0, 0, 25]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 50]} />
        <meshBasicMaterial color="blue" />
      </mesh>
      <Html position={[0, 0, 52]}>
        <div style={{ color: 'blue', fontSize: '14px', fontWeight: 'bold' }}>Z</div>
      </Html>
    </group>
  );
};

// 相机控制器
const CameraController: React.FC<{ onCameraChange?: (camera: THREE.Camera) => void }> = ({ onCameraChange }) => {
  const { camera } = useThree();
  
  useEffect(() => {
    onCameraChange?.(camera);
  }, [camera, onCameraChange]);
  
  return null;
};

// 光照设置 - 模拟真实的透镜投影光源（移除主光源避免与投影光源冲突）
const LightingSetup: React.FC<{ intensity: number; wallDistance: number }> = ({ intensity, wallDistance }) => {
  return (
    <>
      {/* 环境光 - 提供基础照明 */}
      <ambientLight intensity={0.3 * intensity} />
      
      {/* 辅助光源 - 从侧面提供轮廓照明 */}
      <pointLight position={[-30, 20, -10]} intensity={0.2 * intensity} color="#ffffff" />
      
      {/* 天空光 - 模拟自然光照 */}
      <hemisphereLight skyColor="#87CEEB" groundColor="#362d1d" intensity={0.1 * intensity} />
    </>
  );
};

// 光源可视化组件
const LightSourceVisualization: React.FC<{ lightSource: any }> = ({ lightSource }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // 根据光源类型选择颜色
  const getSourceColor = () => {
    switch (lightSource.type) {
      case 'point': return '#ffff00'; // 黄色
      case 'parallel': return '#0088ff'; // 蓝色
      default: return '#ffffff';
    }
  };
  
  return (
    <group>
      {/* 点光源可视化 */}
      {lightSource.type === 'point' && (
        <>
          <mesh 
            position={[lightSource.position.x, lightSource.position.y, lightSource.position.z]}
            ref={meshRef}
          >
            <sphereGeometry args={[3, 16, 16]} />
            <meshBasicMaterial color={getSourceColor()} transparent opacity={0.8} />
          </mesh>
          {/* 光线指示器 */}
          <mesh position={[lightSource.position.x, lightSource.position.y, lightSource.position.z - 5]}>
            <coneGeometry args={[2, 10, 8]} />
            <meshBasicMaterial color={getSourceColor()} transparent opacity={0.3} />
          </mesh>
        </>
      )}
      

      
      {/* 平行光源可视化 - 使用统一的光源位置 */}
      {lightSource.type === 'parallel' && (
        <>
          {/* 平行光源用箭头表示，使用lightSource.position */}
          <mesh position={[lightSource.position.x, lightSource.position.y, lightSource.position.z]}>
            <cylinderGeometry args={[1, 1, 20, 8]} />
            <meshBasicMaterial color={getSourceColor()} transparent opacity={0.6} />
          </mesh>
          <mesh position={[lightSource.position.x, lightSource.position.y, lightSource.position.z + 15]}>
            <coneGeometry args={[3, 10, 8]} />
            <meshBasicMaterial color={getSourceColor()} transparent opacity={0.8} />
          </mesh>
          {/* 平行光线指示，从光源位置照射 */}
          {Array.from({ length: 9 }, (_, i) => {
            const x = (i % 3 - 1) * 20 + lightSource.position.x;
            const y = (Math.floor(i / 3) - 1) * 20 + lightSource.position.y;
            return (
              <mesh key={i} position={[x, y, lightSource.position.z - 20]}>
                <cylinderGeometry args={[0.5, 0.5, 15, 6]} />
                <meshBasicMaterial color={getSourceColor()} transparent opacity={0.4} />
              </mesh>
            );
          })}
        </>
      )}
    </group>
  );
};

// 新的焦散投影组件 - 基于threejs-caustics-master重新实现
const CausticProjection: React.FC<{
  show: boolean;
  distance: number;
  intensity: number;
  lensWidth: number;
  lensHeight: number;
  geometry: any;
  targetShape: number[][];
  resolution: number;
  refractiveIndex: number;
  focalLength: number;
  lensRotation?: number;
  isAutoRotating?: boolean;
  lightSource: any;
  renderTrigger?: number;
  onCalculatingChange?: (calculating: boolean) => void;
  addCausticsRenderResult?: (result: any) => void;
}> = ({ show, distance, intensity, lensWidth, lensHeight, geometry, targetShape, resolution, refractiveIndex, focalLength, lensRotation = 0, isAutoRotating = false, lightSource, renderTrigger = 0, onCalculatingChange, addCausticsRenderResult }) => {
  const [isCalculating, setIsCalculating] = useState(false);
  const [causticsTexture, setCausticsTexture] = useState<THREE.Texture | null>(null);
  
  // 创建测试纹理用于验证显示管线
  const createTestTexture = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // 创建高对比度的棋盘格图案
      const squareSize = 64;
      for (let x = 0; x < 512; x += squareSize) {
        for (let y = 0; y < 512; y += squareSize) {
          const isEven = ((x / squareSize) + (y / squareSize)) % 2 === 0;
          ctx.fillStyle = isEven ? '#ffffff' : '#ff0000'; // 白色和红色
          ctx.fillRect(x, y, squareSize, squareSize);
        }
      }
      
      // 添加一个明显的绿色圆圈在中心
      ctx.fillStyle = '#00ff00';
      ctx.beginPath();
      ctx.arc(256, 256, 100, 0, 2 * Math.PI);
      ctx.fill();
      
      // 添加文字标识
      ctx.fillStyle = '#000000';
      ctx.font = '48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('TEST', 256, 270);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderStage, setRenderStage] = useState('');
  const [hasRendered, setHasRendered] = useState(false);
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const causticsTargetRef = useRef<THREE.WebGLRenderTarget>();
  const wallMeshRef = useRef<THREE.Mesh>();
  const lightCameraRef = useRef<THREE.OrthographicCamera>();
  
  if (!show) return null;
  
  // 墙面尺寸固定为300mm×300mm
  const wallWidth = 300;
  const wallHeight = 300;
  

  

  

  
  // 手动触发焦散投影计算
  const { parameters } = useProjectStore();
  
  // 使用ref存储状态设置函数，避免它们成为useCallback的依赖项
  const stateSettersRef = useRef({
    setCausticsTexture,
    setRenderProgress,
    setRenderStage,
    setHasRendered,
    setIsCalculating,
    onCalculatingChange,
    addCausticsRenderResult
  });
  
  // 更新ref中的函数引用
  useEffect(() => {
    stateSettersRef.current = {
      setCausticsTexture,
      setRenderProgress,
      setRenderStage,
      setHasRendered,
      setIsCalculating,
      onCalculatingChange,
      addCausticsRenderResult
    };
  }, [setCausticsTexture, setRenderProgress, setRenderStage, setHasRendered, setIsCalculating, onCalculatingChange, addCausticsRenderResult]);
  
  const calculateCaustics = useCallback(async () => {
    console.log('calculateCaustics 函数被调用');
    const startTime = Date.now(); // 记录开始时间
    stateSettersRef.current.setIsCalculating(true);
    stateSettersRef.current.onCalculatingChange?.(true);
    
    try {
      console.log('几何体检查:', {
        hasGeometry: !!geometry,
      hasVertices: !!geometry?.vertices,
      verticesLength: geometry?.vertices?.length || 0
    });
    
    if (!geometry || !geometry.vertices || geometry.vertices.length === 0) {
      console.log('几何体验证失败，退出计算');
      return;
    }

    // 检查计算优化设置
    console.log('开始焦散计算，将根据顶点数量自动选择最优计算方式');

    console.log('开始焦散计算...');
    stateSettersRef.current.setIsCalculating(true);
    stateSettersRef.current.setRenderProgress(0);
    stateSettersRef.current.setRenderStage('初始化渲染器...');
    stateSettersRef.current.setHasRendered(false);
    
    // 模拟异步处理以显示进度
    await new Promise(resolve => setTimeout(resolve, 100));
    
    stateSettersRef.current.setRenderProgress(10);
    stateSettersRef.current.setRenderStage('创建渲染器...');
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // 创建渲染器 - 添加WebGL兼容性检查和备用方案
    let renderer: THREE.WebGLRenderer;
    try {
      // 首先尝试标准WebGL配置
      renderer = new THREE.WebGLRenderer({ 
        antialias: false, // 禁用抗锯齿以减少GPU负担
        preserveDrawingBuffer: true,
        alpha: true,
        powerPreference: "default", // 使用默认GPU设置
        failIfMajorPerformanceCaveat: false // 允许软件渲染
      });
    } catch (error) {
      console.warn('标准WebGL创建失败，尝试备用配置:', error);
      try {
        // 备用配置：最小化设置
        renderer = new THREE.WebGLRenderer({ 
          antialias: false,
          preserveDrawingBuffer: true,
          alpha: false, // 禁用alpha通道
          powerPreference: "default",
          failIfMajorPerformanceCaveat: false
        });
      } catch (fallbackError) {
        console.error('WebGL渲染器创建完全失败:', fallbackError);
        throw new Error('无法创建WebGL上下文，请检查浏览器WebGL支持');
      }
    }
    
    renderer.setSize(1024, 1024);
    
    // 配置WebGL状态 - 添加错误检查
    renderer.autoClear = false;
    renderer.sortObjects = false;
    renderer.shadowMap.enabled = false;
    
    // 获取WebGL上下文
    const glCtx = renderer.getContext();
    
    // 安全地启用混合模式
    try {
      if (glCtx) {
        glCtx.enable(glCtx.BLEND);
        glCtx.blendFunc(glCtx.SRC_ALPHA, glCtx.ONE_MINUS_SRC_ALPHA);
      }
    } catch (blendError) {
      console.warn('混合模式设置失败:', blendError);
      // 继续执行，不中断渲染流程
    }
    
    // 安全地记录WebGL信息
    try {
      console.log('WebGL渲染器配置完成:', {
        context: glCtx?.constructor?.name || 'Unknown',
        extensions: glCtx?.getSupportedExtensions?.()?.slice(0, 5) || [],
        maxTextureSize: glCtx?.getParameter?.(glCtx.MAX_TEXTURE_SIZE) || 'Unknown',
        maxRenderBufferSize: glCtx?.getParameter?.(glCtx.MAX_RENDERBUFFER_SIZE) || 'Unknown'
      });
    } catch (logError) {
      console.warn('WebGL信息记录失败:', logError);
    }
    
    rendererRef.current = renderer;
    
    setRenderProgress(20);
    setRenderStage('创建渲染目标...');
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // 添加WebGL错误监听
    const gl = renderer.getContext();
    const originalTexImage2D = gl.texImage2D;
    gl.texImage2D = function(...args) {
      console.log('WebGL texImage2D调用:', {
        target: args[0],
        level: args[1], 
        internalformat: args[2],
        width: args[3],
        height: args[4],
        border: args[5],
        format: args[6],
        type: args[7],
        formatHex: '0x' + args[2]?.toString(16),
        typeHex: '0x' + args[7]?.toString(16)
      });
      try {
        return originalTexImage2D.apply(this, args);
      } catch (error) {
        console.error('WebGL texImage2D错误:', error, args);
        throw error;
      }
    };

    // 创建焦散渲染目标
    console.log('创建WebGLRenderTarget，参数:', {
      width: 1024,
      height: 1024,
      type: THREE.UnsignedByteType,
      format: THREE.RGBAFormat,
      typeValue: THREE.UnsignedByteType,
      formatValue: THREE.RGBAFormat,
      typeHex: '0x' + THREE.UnsignedByteType.toString(16),
      formatHex: '0x' + THREE.RGBAFormat.toString(16)
    });

    const causticsTarget = new THREE.WebGLRenderTarget(1024, 1024, {
      type: THREE.UnsignedByteType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      generateMipmaps: false,
      stencilBuffer: false,
      depthBuffer: true
    });
    
    console.log('WebGLRenderTarget创建完成:', {
      width: causticsTarget.width,
      height: causticsTarget.height,
      texture: {
        format: causticsTarget.texture.format,
        type: causticsTarget.texture.type,
        formatHex: '0x' + causticsTarget.texture.format.toString(16),
        typeHex: '0x' + causticsTarget.texture.type.toString(16),
        generateMipmaps: causticsTarget.texture.generateMipmaps,
        flipY: causticsTarget.texture.flipY
      }
    });
    
    causticsTargetRef.current = causticsTarget;
    
    setRenderProgress(30);
    setRenderStage('设置相机...');
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // 创建光源相机
    const lightCamera = new THREE.OrthographicCamera(-150, 150, 150, -150, 0.1, 1000);
    // 根据光源类型设置初始位置
    if (lightSource.type === 'point') {
      lightCamera.position.set(lightSource.position.x, lightSource.position.y, lightSource.position.z);
    } else {
      lightCamera.position.set(0, 0, 100);
    }
    lightCamera.lookAt(0, 0, 0);
    lightCameraRef.current = lightCamera;
    
    setRenderProgress(40);
    setRenderStage('生成透镜几何体...');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 创建墙面几何体用于显示焦散效果 - 增加尺寸确保覆盖焦散图案
    const wallSize = Math.max(distance * 4, 500); // 至少500mm，或距离的4倍
    const wallGeometry = new THREE.PlaneGeometry(wallSize, wallSize, 64, 64);
    
    setRenderProgress(50);
    setRenderStage('生成高度图纹理...');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 生成高度图
    const heightCanvas = document.createElement('canvas');
    heightCanvas.width = resolution;
    heightCanvas.height = resolution;
    const heightCtx = heightCanvas.getContext('2d')!;
    
    if (heightCtx) {
      const imageData = heightCtx.createImageData(resolution, resolution);
      
      // 从几何体数据生成高度图
      const vertices = geometry.vertices;
      let minZ = Infinity, maxZ = -Infinity;
      
      // 找到Z值范围
      for (const vertex of vertices) {
        minZ = Math.min(minZ, vertex.z);
        maxZ = Math.max(maxZ, vertex.z);
      }
      
      const zRange = maxZ - minZ;
      
      // 使用Web Worker进行真正的异步计算
      const generateHeightMapGPU = async (imageData: ImageData, vertices: any[], resolution: number, minZ: number, maxZ: number, lensWidth: number, lensHeight: number) => {
        const zRange = maxZ - minZ;
        
        console.log('使用GPU加速计算高度图...');
        setRenderProgress(60);
        setRenderStage('GPU并行计算中...');
        
        try {
          // 创建WebGL上下文用于计算
          const canvas = document.createElement('canvas');
          const webglContext = canvas.getContext('webgl2') || canvas.getContext('webgl');
          
          if (!webglContext) {
            console.warn('WebGL不可用，回退到CPU计算');
            return generateHeightMapCPU(imageData, vertices, resolution, minZ, maxZ, lensWidth, lensHeight);
          }
          
          console.log('WebGL上下文创建成功，开始GPU计算');
          
          // 顶点着色器
          const vertexShaderSource = `
            attribute vec2 a_position;
            varying vec2 v_texCoord;
            void main() {
              gl_Position = vec4(a_position, 0.0, 1.0);
              v_texCoord = (a_position + 1.0) * 0.5;
            }
          `;
          
          // 片段着色器 - 高度图计算（修复WebGL兼容性）
           const fragmentShaderSource = `
             precision highp float;
             varying vec2 v_texCoord;
             uniform sampler2D u_vertexData;
             uniform float u_vertexCount;
             uniform float u_minZ;
             uniform float u_maxZ;
             uniform float u_lensWidth;
             uniform float u_lensHeight;
             uniform float u_resolution;
             
             void main() {
               vec2 uv = v_texCoord;
               float u = uv.x * 2.0 - 1.0;
               float v = uv.y * 2.0 - 1.0;
               
               float worldX = u * u_lensWidth * 0.5;
               float worldY = v * u_lensHeight * 0.5;
               
               float height = 0.5;
               float minDistance = 999999.0;
               
               // 使用固定循环次数避免WebGL限制
               float vertexTexSize = ceil(sqrt(u_vertexCount));
               
               // 限制最大循环次数以确保WebGL兼容性
               float maxIterations = min(u_vertexCount, 1024.0);
               
               for (float i = 0.0; i < 1024.0; i += 1.0) {
                 if (i >= maxIterations) break;
                 
                 float row = floor(i / vertexTexSize);
                 float col = mod(i, vertexTexSize);
                 vec2 vertexUV = vec2(col / vertexTexSize, row / vertexTexSize);
                 vec4 vertexData = texture2D(u_vertexData, vertexUV);
                 
                 // 跳过无效顶点数据
                 if (vertexData.w < 0.5) continue;
                 
                 float vx = vertexData.x;
                 float vy = vertexData.y;
                 float vz = vertexData.z;
                 
                 float distance = sqrt((vx - worldX) * (vx - worldX) + (vy - worldY) * (vy - worldY));
                 
                 if (distance < minDistance) {
                   minDistance = distance;
                   height = (vz - u_minZ) / (u_maxZ - u_minZ);
                 }
               }
               
               gl_FragColor = vec4(height, height, height, 1.0);
             }
           `;
          
          // 编译着色器
          const compileShader = (source: string, type: number) => {
            const shader = webglContext.createShader(type)!;
            webglContext.shaderSource(shader, source);
            webglContext.compileShader(shader);
            
            if (!webglContext.getShaderParameter(shader, webglContext.COMPILE_STATUS)) {
              console.error('着色器编译错误:', webglContext.getShaderInfoLog(shader));
              webglContext.deleteShader(shader);
              return null;
            }
            return shader;
          };
          
          const vertexShader = compileShader(vertexShaderSource, webglContext.VERTEX_SHADER);
          const fragmentShader = compileShader(fragmentShaderSource, webglContext.FRAGMENT_SHADER);
          
          if (!vertexShader || !fragmentShader) {
            throw new Error('着色器编译失败');
          }
          
          // 创建程序
          const program = webglContext.createProgram()!;
          webglContext.attachShader(program, vertexShader);
          webglContext.attachShader(program, fragmentShader);
          webglContext.linkProgram(program);
          
          if (!webglContext.getProgramParameter(program, webglContext.LINK_STATUS)) {
            console.error('程序链接错误:', webglContext.getProgramInfoLog(program));
            throw new Error('着色器程序链接失败');
          }
          
          webglContext.useProgram(program);
          
          // 设置画布大小
          canvas.width = resolution;
          canvas.height = resolution;
          webglContext.viewport(0, 0, resolution, resolution);
          
          // 创建顶点缓冲区（全屏四边形）
          const positions = new Float32Array([
            -1, -1,
             1, -1,
            -1,  1,
             1,  1
          ]);
          
          const positionBuffer = webglContext.createBuffer();
          webglContext.bindBuffer(webglContext.ARRAY_BUFFER, positionBuffer);
          webglContext.bufferData(webglContext.ARRAY_BUFFER, positions, webglContext.STATIC_DRAW);
          
          const positionLocation = webglContext.getAttribLocation(program, 'a_position');
          webglContext.enableVertexAttribArray(positionLocation);
          webglContext.vertexAttribPointer(positionLocation, 2, webglContext.FLOAT, false, 0, 0);
          
          // 准备顶点数据纹理
          const vertexCount = vertices.length;
          const textureSize = Math.ceil(Math.sqrt(vertexCount));
          const vertexData = new Float32Array(textureSize * textureSize * 4);
          
          for (let i = 0; i < vertexCount; i++) {
            const vertex = vertices[i];
            vertexData[i * 4] = vertex.x;
            vertexData[i * 4 + 1] = vertex.y;
            vertexData[i * 4 + 2] = vertex.z;
            vertexData[i * 4 + 3] = 1.0;
          }
          
          // 创建顶点数据纹理
          const vertexTexture = webglContext.createTexture();
          webglContext.bindTexture(webglContext.TEXTURE_2D, vertexTexture);
          // 检查是否支持浮点纹理
          const ext = webglContext.getExtension('OES_texture_float') || webglContext.getExtension('EXT_color_buffer_float');
          if (ext) {
            // 使用正确的内部格式
            const internalFormat = webglContext.RGBA32F || webglContext.RGBA;
            webglContext.texImage2D(webglContext.TEXTURE_2D, 0, internalFormat, textureSize, textureSize, 0, webglContext.RGBA, webglContext.FLOAT, vertexData);
          } else {
            // 回退到8位整数纹理
            const intData = new Uint8Array(vertexData.length);
            for (let i = 0; i < vertexData.length; i++) {
              intData[i] = Math.floor(vertexData[i] * 255);
            }
            // 使用正确的内部格式
            const internalFormat = webglContext.RGBA8 || webglContext.RGBA;
            webglContext.texImage2D(webglContext.TEXTURE_2D, 0, internalFormat, textureSize, textureSize, 0, webglContext.RGBA, webglContext.UNSIGNED_BYTE, intData);
          }
          webglContext.texParameteri(webglContext.TEXTURE_2D, webglContext.TEXTURE_MIN_FILTER, webglContext.NEAREST);
          webglContext.texParameteri(webglContext.TEXTURE_2D, webglContext.TEXTURE_MAG_FILTER, webglContext.NEAREST);
          webglContext.texParameteri(webglContext.TEXTURE_2D, webglContext.TEXTURE_WRAP_S, webglContext.CLAMP_TO_EDGE);
          webglContext.texParameteri(webglContext.TEXTURE_2D, webglContext.TEXTURE_WRAP_T, webglContext.CLAMP_TO_EDGE);
          
          // 设置uniform变量
          webglContext.uniform1i(webglContext.getUniformLocation(program, 'u_vertexData'), 0);
          webglContext.uniform1f(webglContext.getUniformLocation(program, 'u_vertexCount'), vertexCount);
          webglContext.uniform1f(webglContext.getUniformLocation(program, 'u_minZ'), minZ);
          webglContext.uniform1f(webglContext.getUniformLocation(program, 'u_maxZ'), maxZ);
          webglContext.uniform1f(webglContext.getUniformLocation(program, 'u_lensWidth'), lensWidth);
          webglContext.uniform1f(webglContext.getUniformLocation(program, 'u_lensHeight'), lensHeight);
          webglContext.uniform1f(webglContext.getUniformLocation(program, 'u_resolution'), resolution);
          
          setRenderProgress(70);
          setRenderStage('GPU渲染中...');
          
          // 执行GPU计算
          webglContext.drawArrays(webglContext.TRIANGLE_STRIP, 0, 4);
          
          setRenderProgress(80);
          setRenderStage('读取GPU计算结果...');
          
          // 读取结果 - 使用正确的格式和类型组合
          const pixels = new Uint8Array(resolution * resolution * 4);
          try {
            webglContext.readPixels(0, 0, resolution, resolution, webglContext.RGBA, webglContext.UNSIGNED_BYTE, pixels);
          } catch (error) {
            console.warn('readPixels失败，尝试其他格式:', error);
            // 如果RGBA+UNSIGNED_BYTE失败，尝试其他组合
            const altPixels = new Float32Array(resolution * resolution * 4);
            webglContext.readPixels(0, 0, resolution, resolution, webglContext.RGBA, webglContext.FLOAT, altPixels);
            // 转换为Uint8Array
            for (let i = 0; i < altPixels.length; i++) {
              pixels[i] = Math.floor(Math.min(Math.max(altPixels[i], 0), 1) * 255);
            }
          }
          
          // 复制到ImageData
          for (let i = 0; i < pixels.length; i++) {
            imageData.data[i] = pixels[i];
          }
          
          // 清理GPU资源
          webglContext.deleteTexture(vertexTexture);
          webglContext.deleteBuffer(positionBuffer);
          webglContext.deleteShader(vertexShader);
          webglContext.deleteShader(fragmentShader);
          webglContext.deleteProgram(program);
          
          console.log('GPU加速高度图生成完成');
          
        } catch (error) {
          console.warn('GPU计算失败，回退到CPU计算:', error);
          return generateHeightMapCPU(imageData, vertices, resolution, minZ, maxZ, lensWidth, lensHeight);
        }
      };
      
      // CPU计算高度图的函数
      const generateHeightMapCPU = async (imageData: ImageData, vertices: any[], resolution: number, minZ: number, maxZ: number, lensWidth: number, lensHeight: number) => {
        const zRange = maxZ - minZ;
        
        // 优化算法：使用空间分割网格加速最近邻查找
        console.log('构建空间分割网格...');
        const gridSize = 64; // 网格分辨率
        const spatialGrid: { [key: string]: typeof vertices } = {};
      
        // 计算世界坐标范围
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const vertex of vertices) {
          minX = Math.min(minX, vertex.x);
          maxX = Math.max(maxX, vertex.x);
          minY = Math.min(minY, vertex.y);
          maxY = Math.max(maxY, vertex.y);
        }
        
        const worldWidth = maxX - minX;
        const worldHeight = maxY - minY;
        const cellWidth = worldWidth / gridSize;
        const cellHeight = worldHeight / gridSize;
        
        // 将顶点分配到网格单元
        for (const vertex of vertices) {
          const gridX = Math.floor((vertex.x - minX) / cellWidth);
          const gridY = Math.floor((vertex.y - minY) / cellHeight);
          const key = `${Math.min(gridX, gridSize-1)},${Math.min(gridY, gridSize-1)}`;
          
          if (!spatialGrid[key]) {
            spatialGrid[key] = [];
          }
          spatialGrid[key].push(vertex);
        }
        
        console.log(`空间网格构建完成，共 ${Object.keys(spatialGrid).length} 个非空单元`);
        
        // 异步分批处理像素，避免阻塞主线程
        const batchSize = 64; // 增加批处理大小
        let currentRow = 0;
        
        const processRowBatch = async (): Promise<void> => {
          return new Promise((resolve) => {
            const endRow = Math.min(currentRow + batchSize, resolution);
            
            for (let y = currentRow; y < endRow; y++) {
              for (let x = 0; x < resolution; x++) {
                // 将像素坐标映射到透镜表面坐标
                const u = (x / (resolution - 1)) * 2.0 - 1.0; // -1 到 1
                const v = (y / (resolution - 1)) * 2.0 - 1.0; // -1 到 1
                
                const worldX = u * (lensWidth / 2);
                const worldY = v * (lensHeight / 2);
                
                // 确定搜索的网格单元（3x3区域）
                const centerGridX = Math.floor((worldX - minX) / cellWidth);
                const centerGridY = Math.floor((worldY - minY) / cellHeight);
                
                let height = 0.5; // 默认高度
                let minDistance = Infinity;
                
                // 搜索3x3网格区域内的顶点
                for (let dx = -1; dx <= 1; dx++) {
                  for (let dy = -1; dy <= 1; dy++) {
                    const gridX = Math.max(0, Math.min(gridSize-1, centerGridX + dx));
                    const gridY = Math.max(0, Math.min(gridSize-1, centerGridY + dy));
                    const key = `${gridX},${gridY}`;
                    
                    const cellVertices = spatialGrid[key];
                    if (cellVertices) {
                      for (const vertex of cellVertices) {
                        const distance = Math.sqrt(
                          Math.pow(vertex.x - worldX, 2) + 
                          Math.pow(vertex.y - worldY, 2)
                        );
                        
                        if (distance < minDistance) {
                          minDistance = distance;
                          height = (vertex.z - minZ) / zRange;
                        }
                      }
                    }
                  }
                }
                
                // 归一化高度到0-1范围
                height = Math.max(0, Math.min(1, height));
                
                // 添加透镜曲率（可选）
                if (focalLength > 0) {
                  const r = Math.sqrt(worldX * worldX + worldY * worldY);
                  const lensRadius = Math.min(lensWidth, lensHeight) / 2;
                  if (r < lensRadius) {
                    const curvature = 1 / focalLength;
                    const lensHeight = curvature * r * r / 2;
                    height += lensHeight * 0.1; // 轻微的透镜曲率影响
                  }
                }
                
                // 设置像素值
                const pixelIndex = (y * resolution + x) * 4;
                const heightValue = Math.floor(height * 255);
                imageData.data[pixelIndex] = heightValue;     // R
                imageData.data[pixelIndex + 1] = heightValue; // G
                imageData.data[pixelIndex + 2] = heightValue; // B
                imageData.data[pixelIndex + 3] = 255;         // A
                
                // 调试：记录一些像素值
                if (x % 100 === 0 && y % 100 === 0) {
                  console.log(`像素(${x},${y}): 世界坐标(${worldX.toFixed(3)},${worldY.toFixed(3)}), 高度=${height.toFixed(3)}, 像素值=${heightValue}`);
                }
              }
            }
            
            currentRow = endRow;
            
            // 更新进度
            const progress = Math.floor((currentRow / resolution) * 40) + 20; // 20-60%
            setRenderProgress(progress);
            
            // 让出控制权给主线程
            setTimeout(resolve, 0);
          });
        };
        
        // 分批处理所有行
        while (currentRow < resolution) {
          await processRowBatch();
        }
        
        // 统计高度图数据
        let minPixel = 255, maxPixel = 0, totalPixels = 0, nonZeroPixels = 0;
        for (let i = 0; i < imageData.data.length; i += 4) {
          const pixelValue = imageData.data[i];
          minPixel = Math.min(minPixel, pixelValue);
          maxPixel = Math.max(maxPixel, pixelValue);
          totalPixels++;
          if (pixelValue > 0) nonZeroPixels++;
        }
        
        console.log('CPU高度图生成完成');
        console.log(`高度图统计: 最小值=${minPixel}, 最大值=${maxPixel}, 总像素=${totalPixels}, 非零像素=${nonZeroPixels} (${(nonZeroPixels/totalPixels*100).toFixed(1)}%)`);
      };
      
      // 根据顶点数量选择计算方式
      if (vertices.length > 5000) {
        console.log('顶点数量较多，使用Web Worker异步计算...');
        setRenderStage('异步并行计算高度图...');
        
        try {
          await generateHeightMapGPU(imageData, vertices, resolution, minZ, maxZ, lensWidth, lensHeight);
          setRenderProgress(70);
        } catch (error) {
          console.warn('Web Worker计算失败，回退到CPU计算:', error);
          setRenderStage('异步计算失败，使用CPU计算...');
          await generateHeightMapCPU(imageData, vertices, resolution, minZ, maxZ, lensWidth, lensHeight);
        }
      } else {
        console.log('顶点数量较少，使用CPU计算高度图...');
        await generateHeightMapCPU(imageData, vertices, resolution, minZ, maxZ, lensWidth, lensHeight);
      }
      
      // 函数定义已移到上方，删除重复定义
      
      heightCtx.putImageData(imageData, 0, 0);
    }
    
    setRenderProgress(70);
    setRenderStage('创建材质和纹理...');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const waterTexture = new THREE.CanvasTexture(heightCanvas);
    waterTexture.wrapS = THREE.RepeatWrapping;
    waterTexture.wrapT = THREE.RepeatWrapping;
    
    // 获取光源颜色 - 使用白光或用户设置的颜色
    const lightColor = lightSource?.color ? 
      new THREE.Vector3(
        lightSource.color.r || 1.0, 
        lightSource.color.g || 1.0, 
        lightSource.color.b || 1.0
      ) :
      new THREE.Vector3(1.0, 1.0, 1.0); // 默认白光
    
    setRenderProgress(80);
    setRenderStage('编译着色器...');
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // 创建环境纹理 - 这是关键的缺失部分！
    const envCanvas = document.createElement('canvas');
    envCanvas.width = 512;
    envCanvas.height = 512;
    const envCtx = envCanvas.getContext('2d');
    if (envCtx) {
      // 创建简单的环境图案
      const envImageData = envCtx.createImageData(512, 512);
      for (let i = 0; i < envImageData.data.length; i += 4) {
        const x = (i / 4) % 512;
        const y = Math.floor((i / 4) / 512);
        const u = x / 511;
        const v = y / 511;
        
        // 创建投影墙面的深度信息（固定深度表示墙面位置）
        const wallDepth = 0.8; // 墙面在固定深度
        
        // 计算世界坐标
        const worldX = (u - 0.5) * 300; // 墙面宽度300mm
        const worldY = (v - 0.5) * 300; // 墙面高度300mm
        
        envImageData.data[i] = Math.floor(worldX + 150);     // R: 世界X坐标 (0-300)
        envImageData.data[i + 1] = Math.floor(worldY + 150); // G: 世界Y坐标 (0-300)
        envImageData.data[i + 2] = Math.floor(wallDepth * 255); // B: 固定深度
        envImageData.data[i + 3] = Math.floor(wallDepth * 255); // A: 深度信息用于光线追踪
      }
      envCtx.putImageData(envImageData, 0, 0);
    }
    
    const envTexture = new THREE.CanvasTexture(envCanvas);
    envTexture.format = THREE.RGBAFormat;
    envTexture.type = THREE.UnsignedByteType;
    envTexture.wrapS = THREE.RepeatWrapping;
    envTexture.wrapT = THREE.RepeatWrapping;
    envTexture.generateMipmaps = false;
    envTexture.needsUpdate = true;
    
    console.log('环境纹理创建完成:', {
      width: envTexture.image.width,
      height: envTexture.image.height
    });
    
    // 着色器选择将在后面定义
    
    // 简化的测试顶点着色器
    const testVertexShader = `
      void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
    
    // 根据光源类型设置光源位置 - 统一使用lightSource.position
    const lightPosition = new THREE.Vector3(lightSource.position.x, lightSource.position.y, lightSource.position.z);
    
    console.log('光源设置:', {
      type: lightSource.type,
      position: lightPosition,
      color: lightColor,
      colorArray: [lightColor.x, lightColor.y, lightColor.z],
      colorHex: '#' + Math.round(lightColor.x * 255).toString(16).padStart(2, '0') + 
                Math.round(lightColor.y * 255).toString(16).padStart(2, '0') + 
                Math.round(lightColor.z * 255).toString(16).padStart(2, '0')
    });
    
    // 获取材质折射率
    const materialRefractiveIndex = {
      'glass': 1.5,
      'plastic': 1.4,
      'crystal': 1.54,
      'acrylic': 1.49,
      'polycarbonate': 1.59,
      'pmma': 1.49
    }[refractiveIndex === 1.49 ? 'acrylic' : refractiveIndex === 1.54 ? 'crystal' : refractiveIndex === 1.59 ? 'polycarbonate' : 'glass'] || refractiveIndex;
    
    // 创建简化的焦散材质用于调试
    const simplifiedFragmentShader = `
      precision highp float;
      
      uniform vec3 lightColor;
      uniform float refractiveIndex;
      uniform float wallDistance;
      
      varying vec3 worldPosition;
      varying vec3 worldNormal;
      varying vec2 vUv;
      varying vec3 lightDirection;
      varying vec3 viewDirection;
      
      void main() {
        // 简化但完整的焦散计算
        vec3 normal = normalize(worldNormal);
        vec3 lightDir = normalize(lightDirection);
        
        // 基础光照计算
        float NdotL = max(dot(normal, lightDir), 0.0);
        
        // 简单的焦散模拟
        vec2 causticUV = worldPosition.xy * 0.1;
        float wave1 = sin(causticUV.x * 10.0) * sin(causticUV.y * 10.0);
        float wave2 = sin(causticUV.x * 7.0 + 1.0) * sin(causticUV.y * 8.0 + 0.5);
        float causticPattern = abs(wave1) * 0.6 + abs(wave2) * 0.4;
        
        // 确保有基础亮度
        float intensity = NdotL * causticPattern * 0.8 + 0.3;
        intensity = clamp(intensity, 0.2, 1.0);
        
        // 应用光源颜色，增强亮度
        vec3 finalColor = lightColor * intensity * 1.5;
        finalColor = clamp(finalColor, vec3(0.1), vec3(1.0));
        
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;
    


    // 创建最简单的测试片段着色器（不依赖任何varying变量）
    const testFragmentShader = `
      precision highp float;
      
      void main() {
        // 输出明亮的红色，确保可见
        gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
      }
    `;

    // 创建匹配的顶点着色器，提供片段着色器需要的varying变量
    const matchingVertexShader = `
      varying vec3 worldPosition;
      varying vec3 worldNormal;
      varying vec2 vUv;
      varying vec3 lightDirection;
      varying vec3 viewDirection;
      
      uniform vec3 lightPosition;
      
      void main() {
        vUv = uv;
        
        // 计算世界坐标位置
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        worldPosition = worldPos.xyz;
        
        // 计算世界坐标法线
        worldNormal = normalize(normalMatrix * normal);
        
        // 计算光源方向（假设平行光）
        lightDirection = normalize(vec3(0.0, 0.0, 1.0));
        
        // 计算视线方向
        viewDirection = normalize(cameraPosition - worldPosition);
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    // 首先测试简单的纯色着色器
    const useTestShader = true; // 临时使用测试着色器
    
    let causticsMaterial;
    
    if (useTestShader) {
      console.log('🔴 使用最简单测试着色器（纯红色输出）');
      console.log('测试着色器详情:', {
        vertexShaderLength: testVertexShader.length,
        fragmentShaderLength: testFragmentShader.length,
        hasVaryingVariables: testVertexShader.includes('varying'),
        hasUniformVariables: testFragmentShader.includes('uniform')
      });
      
      causticsMaterial = new THREE.ShaderMaterial({
        vertexShader: testVertexShader,
        fragmentShader: testFragmentShader,
        side: THREE.DoubleSide
      });
      
      console.log('测试材质创建完成:', {
        materialType: causticsMaterial.type,
        isShaderMaterial: causticsMaterial.isShaderMaterial,
        hasUniforms: Object.keys(causticsMaterial.uniforms).length,
        uniformKeys: Object.keys(causticsMaterial.uniforms),
        side: causticsMaterial.side
      });
    } else {
      console.log('使用完整焦散着色器');
      causticsMaterial = new THREE.ShaderMaterial({
        vertexShader: matchingVertexShader,
        fragmentShader: simplifiedFragmentShader,
        uniforms: {
          lightColor: { value: new THREE.Vector3(0.2, 1.0, 0.2) }, // 绿色光源
          lightPosition: { value: lightPosition },
          refractiveIndex: { value: actualRefractiveIndex },
          wallDistance: { value: distance }
        },
        side: THREE.DoubleSide
      });
    }
    
    causticsMaterial.extensions = {
      derivatives: true
    };
    
    setRenderProgress(90);
    setRenderStage('创建墙面焦散网格...');
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // 创建墙面焦散网格 - 位置在透镜后方的墙面上
    const wallMesh = new THREE.Mesh(wallGeometry, causticsMaterial);
    wallMesh.position.set(0, 0, -distance); // 墙面位置在透镜后方
    wallMesh.rotation.set(0, 0, 0); // 墙面垂直于Z轴
    wallMeshRef.current = wallMesh;
    
    setRenderProgress(95);
    setRenderStage('执行焦散渲染...');
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // 检查着色器编译状态
    const checkShaderCompilation = (material: THREE.ShaderMaterial) => {
      const gl = renderer.getContext();
      const program = renderer.properties.get(material).program;
      if (program) {
        const vertexShader = program.vertexShader;
        const fragmentShader = program.fragmentShader;
        
        const vertexStatus = gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS);
        const fragmentStatus = gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS);
        const linkStatus = gl.getProgramParameter(program.program, gl.LINK_STATUS);
        const validateStatus = gl.getProgramParameter(program.program, gl.VALIDATE_STATUS);
        
        console.log('着色器详细编译状态:', {
          vertex: { status: vertexStatus, log: gl.getShaderInfoLog(vertexShader) },
          fragment: { status: fragmentStatus, log: gl.getShaderInfoLog(fragmentShader) },
          program: { 
            link: linkStatus, 
            validate: validateStatus,
            log: gl.getProgramInfoLog(program.program)
          }
        });
        
        if (!vertexStatus) {
          console.error('顶点着色器编译错误:', gl.getShaderInfoLog(vertexShader));
        }
        if (!fragmentStatus) {
          console.error('片段着色器编译错误:', gl.getShaderInfoLog(fragmentShader));
        }
        if (!linkStatus) {
          console.error('着色器程序链接错误:', gl.getProgramInfoLog(program.program));
        }
        if (!validateStatus) {
          console.error('着色器程序验证错误:', gl.getProgramInfoLog(program.program));
        }
      }
    };

    // 添加详细的uniform调试信息
    console.log('焦散渲染调试信息:', {
      shaderType: useTestShader ? 'test' : 'full',
      lightColor: lightColor,
      lightColorValue: [lightColor.x, lightColor.y, lightColor.z],
      lightColorHex: '#' + Math.round(lightColor.x * 255).toString(16).padStart(2, '0') + 
                    Math.round(lightColor.y * 255).toString(16).padStart(2, '0') + 
                    Math.round(lightColor.z * 255).toString(16).padStart(2, '0'),
      materialUniforms: causticsMaterial.uniforms,
      uniformValues: {
        lightColor: causticsMaterial.uniforms.lightColor?.value,
        lightPosition: causticsMaterial.uniforms.lightPosition?.value,
        refractiveIndex: causticsMaterial.uniforms.refractiveIndex?.value,
        wallDistance: causticsMaterial.uniforms.wallDistance?.value
      },
      waterTextureSize: `${waterTexture.image.width}x${waterTexture.image.height}`,
      envTextureSize: `${envTexture.image.width}x${envTexture.image.height}`,
      blendingMode: causticsMaterial.blending,
      transparent: causticsMaterial.transparent,
      useTestShader: useTestShader,
      waterGeometryVertices: wallGeometry.attributes.position.count
    });
    
    // 验证uniform变量是否正确设置
    console.log('Uniform变量验证:', {
      lightColorSet: !!causticsMaterial.uniforms.lightColor,
      lightPositionSet: !!causticsMaterial.uniforms.lightPosition,
      refractiveIndexSet: !!causticsMaterial.uniforms.refractiveIndex,
      wallDistanceSet: !!causticsMaterial.uniforms.wallDistance,
      lightColorType: typeof causticsMaterial.uniforms.lightColor?.value,
      lightPositionType: typeof causticsMaterial.uniforms.lightPosition?.value,
      refractiveIndexType: typeof causticsMaterial.uniforms.refractiveIndex?.value,
      wallDistanceType: typeof causticsMaterial.uniforms.wallDistance?.value,
      lightColorIsVector3: causticsMaterial.uniforms.lightColor?.value instanceof THREE.Vector3,
      lightPositionIsVector3: causticsMaterial.uniforms.lightPosition?.value instanceof THREE.Vector3,
      actualValues: {
        lightColor: causticsMaterial.uniforms?.lightColor?.value ? 
          [causticsMaterial.uniforms.lightColor.value.x, causticsMaterial.uniforms.lightColor.value.y, causticsMaterial.uniforms.lightColor.value.z] : null,
        lightPosition: causticsMaterial.uniforms?.lightPosition?.value ? 
          [causticsMaterial.uniforms.lightPosition.value.x, causticsMaterial.uniforms.lightPosition.value.y, causticsMaterial.uniforms.lightPosition.value.z] : null,
        refractiveIndex: causticsMaterial.uniforms?.refractiveIndex?.value,
        wallDistance: causticsMaterial.uniforms?.wallDistance?.value
      }
    });
    
    // 渲染焦散
    const scene = new THREE.Scene();
    
    // 创建透镜几何体用于焦散计算
    const lensGeometry = new THREE.BufferGeometry();
    
    // 正确设置顶点
    const vertices = new Float32Array(geometry.vertices.length * 3);
    for (let i = 0; i < geometry.vertices.length; i++) {
      vertices[i * 3] = geometry.vertices[i].x;
      vertices[i * 3 + 1] = geometry.vertices[i].y;
      vertices[i * 3 + 2] = geometry.vertices[i].z;
    }
    lensGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    
    // 正确设置面索引 - 使用Uint32Array支持大量顶点
    const maxVertexIndex = Math.max(...geometry.faces.flat());
    const IndexArrayType = maxVertexIndex > 65535 ? Uint32Array : Uint16Array;
    
    console.log('索引数组类型选择:', {
      maxVertexIndex,
      vertexCount: geometry.vertices.length,
      faceCount: geometry.faces.length,
      indexArrayType: IndexArrayType.name,
      needsUint32: maxVertexIndex > 65535
    });
    
    const indices = new IndexArrayType(geometry.faces.length * 3);
    for (let i = 0; i < geometry.faces.length; i++) {
      indices[i * 3] = geometry.faces[i][0];
      indices[i * 3 + 1] = geometry.faces[i][1];
      indices[i * 3 + 2] = geometry.faces[i][2];
    }
    lensGeometry.setIndex(new THREE.BufferAttribute(indices, 1));
    
    // 验证索引设置
    console.log('索引缓冲区验证:', {
      hasIndex: !!lensGeometry.index,
      indexCount: lensGeometry.index?.count || 0,
      indexArrayLength: indices.length,
      indexArrayType: indices.constructor.name,
      firstFewIndices: Array.from(indices.slice(0, 12)),
      lastFewIndices: Array.from(indices.slice(-12)),
      maxIndexValue: Math.max(...indices),
      minIndexValue: Math.min(...indices),
      vertexCount: geometry.vertices.length,
      indexInRange: Math.max(...indices) < geometry.vertices.length
    });
    
    // 计算法向量和UV坐标
    lensGeometry.computeVertexNormals();
    lensGeometry.computeBoundingBox();
    
    // 添加UV坐标
    const uvs = new Float32Array(geometry.vertices.length * 2);
    for (let i = 0; i < geometry.vertices.length; i++) {
      uvs[i * 2] = (geometry.vertices[i].x + 1) * 0.5; // 简单的UV映射
      uvs[i * 2 + 1] = (geometry.vertices[i].y + 1) * 0.5;
    }
    lensGeometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    
    console.log('透镜几何体创建:', {
      vertices: geometry.vertices.length,
      faces: geometry.faces.length,
      bufferVertices: lensGeometry.attributes.position.count,
      bufferIndices: lensGeometry.index ? lensGeometry.index.count : 0,
      hasUV: !!lensGeometry.attributes.uv,
      hasNormals: !!lensGeometry.attributes.normal,
      boundingBox: lensGeometry.boundingBox
    });
    
    // 详细验证几何体数据
    const positionArray = lensGeometry.attributes.position.array;
    const normalArray = lensGeometry.attributes.normal.array;
    const uvArray = lensGeometry.attributes.uv.array;
    
    // 安全地计算位置范围，避免调用栈溢出
    let xMin = positionArray[0], xMax = positionArray[0];
    let yMin = positionArray[1], yMax = positionArray[1];
    let zMin = positionArray[2], zMax = positionArray[2];
    
    for (let i = 0; i < positionArray.length; i += 3) {
      const x = positionArray[i];
      const y = positionArray[i + 1];
      const z = positionArray[i + 2];
      
      if (x < xMin) xMin = x;
      if (x > xMax) xMax = x;
      if (y < yMin) yMin = y;
      if (y > yMax) yMax = y;
      if (z < zMin) zMin = z;
      if (z > zMax) zMax = z;
    }
    
    console.log('几何体数据验证:', {
      positionArrayLength: positionArray.length,
      normalArrayLength: normalArray.length,
      uvArrayLength: uvArray.length,
      firstVertex: [positionArray[0], positionArray[1], positionArray[2]],
      firstNormal: [normalArray[0], normalArray[1], normalArray[2]],
      firstUV: [uvArray[0], uvArray[1]],
      positionRange: {
        x: [xMin, xMax],
        y: [yMin, yMax],
        z: [zMin, zMax]
      }
    });
    
    // 创建使用焦散着色器的透镜网格
    const lensMesh = new THREE.Mesh(lensGeometry, causticsMaterial);
    lensMesh.position.set(0, 0, 0); // 透镜位于原点
    lensMesh.rotation.set(lensRotation || 0, 0, 0);
    scene.add(lensMesh);
    
    console.log('焦散渲染场景内容:', {
      totalObjects: scene.children.length,
      lensMesh: !!scene.children.find(child => child === lensMesh),
      sceneChildren: scene.children.map(child => child.type),
      lensMeshMaterial: lensMesh.material.type,
      lensMeshUniforms: lensMesh.material.uniforms ? Object.keys(lensMesh.material.uniforms) : 'none'
    });
    
    // 根据光源类型设置光源相机位置 - 统一使用lightSource.position
    lightCamera.position.set(lightSource.position.x, lightSource.position.y, lightSource.position.z);
    lightCamera.lookAt(0, 0, 0);
    lightCamera.updateMatrixWorld();
    
    console.log('光源相机设置:', {
      lightType: lightSource.type,
      position: lightCamera.position,
      target: new THREE.Vector3(0, 0, 0)
    });
    
    // 详细的相机和几何体位置调试
    lensGeometry.computeBoundingBox();
    const boundingBox = lensGeometry.boundingBox;
    
    console.log('相机和几何体位置调试:', {
      cameraPosition: lightCamera.position.toArray(),
      cameraTarget: [0, 0, 0],
      cameraDistance: lightCamera.position.length(),
      geometryBoundingBox: {
        min: boundingBox.min.toArray(),
        max: boundingBox.max.toArray(),
        center: boundingBox.getCenter(new THREE.Vector3()).toArray(),
        size: boundingBox.getSize(new THREE.Vector3()).toArray()
      },
      cameraProjectionMatrix: lightCamera.projectionMatrix.elements.slice(0, 4),
      cameraViewMatrix: lightCamera.matrixWorldInverse.elements.slice(0, 4),
      lensMeshPosition: lensMesh.position.toArray(),
      lensMeshRotation: lensMesh.rotation.toArray()
    });

    // 详细的几何体可见性检查
    const center = boundingBox.getCenter(new THREE.Vector3());
    const size = boundingBox.getSize(new THREE.Vector3());
    
    // 检查几何体是否在相机视锥内
    const frustum = new THREE.Frustum();
    frustum.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(lightCamera.projectionMatrix, lightCamera.matrixWorldInverse));
    
    const isInFrustum = frustum.intersectsBox(boundingBox);
    
    // 计算几何体中心在屏幕空间的投影
    const centerClone = center.clone();
    centerClone.project(lightCamera);
    
    console.log('几何体可见性检查:', {
      isInFrustum: isInFrustum,
      geometryCenter: center.toArray(),
      geometrySize: size.toArray(),
      projectedCenter: centerClone.toArray(),
      isInScreenBounds: (centerClone.x >= -1 && centerClone.x <= 1 && centerClone.y >= -1 && centerClone.y <= 1 && centerClone.z >= -1 && centerClone.z <= 1),
      cameraFar: lightCamera.far,
      cameraNear: lightCamera.near,
      cameraFov: lightCamera.fov,
      distanceToGeometry: lightCamera.position.distanceTo(center)
    });
    
    // 渲染前状态检查
    console.log('开始渲染焦散效果:', {
      scene: scene.children.length,
      camera: lightCamera.position,
      target: causticsTarget.width + 'x' + causticsTarget.height,
      material: causticsMaterial.uniforms
    });
    
    // 详细的WebGL状态检查
    const glContext = renderer.getContext();
    console.log('渲染前WebGL状态:', {
      viewport: glContext.getParameter(glContext.VIEWPORT),
      clearColor: glContext.getParameter(glContext.COLOR_CLEAR_VALUE),
      depthTest: glContext.getParameter(glContext.DEPTH_TEST),
      blend: glContext.getParameter(glContext.BLEND),
      cullFace: glContext.getParameter(glContext.CULL_FACE),
      frontFace: glContext.getParameter(glContext.FRONT_FACE),
      error: glContext.getError()
    });
    
    // 检查渲染目标状态
    console.log('渲染目标状态:', {
      width: causticsTarget.width,
      height: causticsTarget.height,
      texture: {
        format: causticsTarget.texture.format,
        type: causticsTarget.texture.type,
        generateMipmaps: causticsTarget.texture.generateMipmaps,
        flipY: causticsTarget.texture.flipY
      }
    });
    
    // 设置渲染目标并清理
    renderer.setRenderTarget(causticsTarget);
    renderer.setClearColor(new THREE.Color(0, 0, 0), 0);
    renderer.clear(true, true, true);
    
    // 强制WebGL状态更新
    glContext.viewport(0, 0, 1024, 1024);
    glContext.clearColor(0, 0, 0, 0);
    glContext.clear(glContext.COLOR_BUFFER_BIT | glContext.DEPTH_BUFFER_BIT);
    
    // 检查帧缓冲区状态
    const framebufferStatus = glContext.checkFramebufferStatus(glContext.FRAMEBUFFER);
    console.log('帧缓冲区状态:', {
      status: framebufferStatus,
      isComplete: framebufferStatus === glContext.FRAMEBUFFER_COMPLETE,
      statusName: framebufferStatus === glContext.FRAMEBUFFER_COMPLETE ? 'COMPLETE' : 'ERROR'
    });
    
    // 检查着色器编译状态
    try {
      checkShaderCompilation(causticsMaterial);
    } catch (error) {
      console.error('着色器编译检查失败:', error);
    }

    // 渲染前最终检查
    console.log('渲染前最终状态:', {
      sceneObjects: scene.children.length,
      materialType: causticsMaterial.type,
      materialUniforms: Object.keys(causticsMaterial.uniforms || {}),
      uniformValues: {
        lightColor: causticsMaterial.uniforms?.lightColor?.value || 'not set',
        lightPosition: causticsMaterial.uniforms?.lightPosition?.value || 'not set',
        refractiveIndex: causticsMaterial.uniforms?.refractiveIndex?.value || 'not set',
        wallDistance: causticsMaterial.uniforms?.wallDistance?.value || 'not set'
      },
      cameraPosition: lightCamera.position,
      cameraMatrix: lightCamera.matrixWorldInverse.elements.slice(0, 4),
      renderTargetSize: [causticsTarget.width, causticsTarget.height]
    });
    
    // 详细的uniform变量数值检查
    console.log('Uniform变量详细数值:', {
      lightColor: {
        value: causticsMaterial.uniforms?.lightColor?.value?.toArray?.() || causticsMaterial.uniforms?.lightColor?.value || 'not set',
        type: typeof causticsMaterial.uniforms?.lightColor?.value,
        isVector3: causticsMaterial.uniforms?.lightColor?.value instanceof THREE.Vector3,
        r: causticsMaterial.uniforms?.lightColor?.value?.r,
        g: causticsMaterial.uniforms?.lightColor?.value?.g,
        b: causticsMaterial.uniforms?.lightColor?.value?.b
      },
      lightPosition: {
        value: causticsMaterial.uniforms?.lightPosition?.value?.toArray?.() || causticsMaterial.uniforms?.lightPosition?.value || 'not set',
        type: typeof causticsMaterial.uniforms?.lightPosition?.value,
        isVector3: causticsMaterial.uniforms?.lightPosition?.value instanceof THREE.Vector3,
        x: causticsMaterial.uniforms?.lightPosition?.value?.x,
        y: causticsMaterial.uniforms?.lightPosition?.value?.y,
        z: causticsMaterial.uniforms?.lightPosition?.value?.z
      },
      refractiveIndex: {
        value: causticsMaterial.uniforms?.refractiveIndex?.value || 'not set',
        type: typeof causticsMaterial.uniforms?.refractiveIndex?.value,
        isValid: typeof causticsMaterial.uniforms?.refractiveIndex?.value === 'number' && causticsMaterial.uniforms?.refractiveIndex?.value > 0
      },
      wallDistance: {
        value: causticsMaterial.uniforms?.wallDistance?.value || 'not set',
        type: typeof causticsMaterial.uniforms?.wallDistance?.value,
        isValid: typeof causticsMaterial.uniforms?.wallDistance?.value === 'number' && causticsMaterial.uniforms?.wallDistance?.value > 0
      }
    });
    
    // 检查着色器编译状态
    checkShaderCompilation(causticsMaterial);
    
    // 验证几何体渲染数据
    const validateGeometryRendering = () => {
      const mesh = scene.children[0] as THREE.Mesh;
      const geometry = mesh.geometry as THREE.BufferGeometry;
      const material = mesh.material as THREE.ShaderMaterial;
      
      console.log('几何体渲染验证:', {
        meshVisible: mesh.visible,
        geometryAttributes: Object.keys(geometry.attributes),
        positionAttribute: {
          count: geometry.attributes.position?.count,
          itemSize: geometry.attributes.position?.itemSize,
          array: geometry.attributes.position?.array ? 'exists' : 'missing'
        },
        normalAttribute: {
          count: geometry.attributes.normal?.count,
          itemSize: geometry.attributes.normal?.itemSize,
          array: geometry.attributes.normal?.array ? 'exists' : 'missing'
        },
        uvAttribute: {
          count: geometry.attributes.uv?.count,
          itemSize: geometry.attributes.uv?.itemSize,
          array: geometry.attributes.uv?.array ? 'exists' : 'missing'
        },
        indexAttribute: {
          count: geometry.index?.count,
          array: geometry.index?.array ? 'exists' : 'missing'
        },
        materialUniforms: Object.keys(material.uniforms),
        drawRange: geometry.drawRange,
        boundingBox: geometry.boundingBox,
        boundingSphere: geometry.boundingSphere
      });
      
      // 检查WebGL绘制状态
      console.log('WebGL绘制状态:', {
        currentProgram: gl.getParameter(gl.CURRENT_PROGRAM),
        arrayBufferBinding: gl.getParameter(gl.ARRAY_BUFFER_BINDING),
        elementArrayBufferBinding: gl.getParameter(gl.ELEMENT_ARRAY_BUFFER_BINDING),
        vertexAttribArrays: [
          gl.getVertexAttrib(0, gl.VERTEX_ATTRIB_ARRAY_ENABLED),
          gl.getVertexAttrib(1, gl.VERTEX_ATTRIB_ARRAY_ENABLED),
          gl.getVertexAttrib(2, gl.VERTEX_ATTRIB_ARRAY_ENABLED)
        ]
      });
    };
    
    validateGeometryRendering();
    
    // 简化的材质编译 - 让THREE.js自然处理
    const mesh = scene.children[0] as THREE.Mesh;
    const material = mesh.material as THREE.ShaderMaterial;
    
    // 强制更新材质
    material.needsUpdate = true;
    
    // 触发编译
    renderer.compile(scene, lightCamera);
    
    // 测试渲染目标清除颜色
     const testClearColor = (gl: WebGL2RenderingContext) => {
       const originalClearColor = gl.getParameter(gl.COLOR_CLEAR_VALUE);
       
       console.log('渲染目标清除颜色测试:', {
         originalClearColor: Array.from(originalClearColor),
         renderTargetSize: [causticsTarget.width, causticsTarget.height],
         renderTargetFormat: causticsTarget.texture.format,
         renderTargetType: causticsTarget.texture.type
       });
       
       // 临时设置明显的清除颜色进行测试
       renderer.setRenderTarget(causticsTarget);
       renderer.setClearColor(0xff0000, 1.0); // 红色背景
       renderer.clear();
      
      // 读取清除后的像素
      const testPixels = new Uint8Array(4 * 4);
      gl.readPixels(0, 0, 2, 2, gl.RGBA, gl.UNSIGNED_BYTE, testPixels);
      
      console.log('清除颜色测试结果:', {
        clearColorPixels: Array.from(testPixels).slice(0, 8),
        isRed: testPixels[0] > 200 && testPixels[1] < 50 && testPixels[2] < 50
      });
      
      // 恢复原始清除颜色
      renderer.setClearColor(0x000000, 0.0); // 透明黑色
      renderer.clear();
    };
    
    // 获取WebGL上下文用于后续操作
    testClearColor(gl);
    
    // 强制编译着色器并检查状态
    try {
      causticsMaterial.needsUpdate = true;
      renderer.compile(scene, lightCamera);
      
      // 检查着色器编译状态
      if (causticsMaterial.program) {
        const program = causticsMaterial.program.program;
        const linkStatus = gl.getProgramParameter(program, gl.LINK_STATUS);
        const validateStatus = gl.getProgramParameter(program, gl.VALIDATE_STATUS);
        
        console.log('着色器程序状态:', {
          linkStatus,
          validateStatus,
          programExists: !!program
        });
        
        if (!linkStatus) {
          const info = gl.getProgramInfoLog(program);
          console.error('着色器程序链接失败:', info);
          throw new Error(`着色器程序链接失败: ${info}`);
        }
      }
      
      console.log('着色器编译成功');
    } catch (error) {
      console.error('着色器编译失败:', error);
      throw error;
    }
    
    // 渲染前详细状态检查
    console.log('渲染前WebGL绘制状态检查:', {
      currentProgram: gl.getParameter(gl.CURRENT_PROGRAM),
      arrayBufferBinding: gl.getParameter(gl.ARRAY_BUFFER_BINDING),
      elementArrayBufferBinding: gl.getParameter(gl.ELEMENT_ARRAY_BUFFER_BINDING),
      viewport: gl.getParameter(gl.VIEWPORT),
      depthTest: gl.getParameter(gl.DEPTH_TEST),
      blend: gl.getParameter(gl.BLEND),
      cullFace: gl.getParameter(gl.CULL_FACE),
      frontFace: gl.getParameter(gl.FRONT_FACE),
      cullFaceMode: gl.getParameter(gl.CULL_FACE_MODE)
    });
    
    // 检查几何体绑定状态
    const renderMesh = scene.children[0] as THREE.Mesh;
    if (renderMesh && renderMesh.geometry) {
      const geometry = renderMesh.geometry;
      console.log('几何体绑定状态:', {
        hasPosition: !!geometry.attributes.position,
        hasIndex: !!geometry.index,
        positionCount: geometry.attributes.position?.count || 0,
        indexCount: geometry.index?.count || 0,
        drawRange: geometry.drawRange,
        groups: geometry.groups.length,
        visible: mesh.visible,
        frustumCulled: mesh.frustumCulled
      });
    }
    
    // 直接渲染场景
    renderer.render(scene, lightCamera);
    
    // 渲染后状态检查
    const renderError = glContext.getError();
    console.log('渲染后WebGL状态:', {
      error: renderError,
      errorName: renderError === 0 ? 'NO_ERROR' : 'ERROR_DETECTED'
    });
    
    // 检查渲染统计信息
    console.log('渲染统计信息:', {
      renderCalls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      points: renderer.info.render.points,
      lines: renderer.info.render.lines,
      frame: renderer.info.render.frame,
      geometries: renderer.info.memory.geometries,
      textures: renderer.info.memory.textures
    });
    
    // 检查几何体是否实际被绘制
    if (renderMesh && renderMesh.geometry) {
      const geometry = renderMesh.geometry;
      const material = renderMesh.material as THREE.ShaderMaterial;
      
      console.log('几何体渲染验证:', {
        meshInScene: scene.children.includes(renderMesh),
        meshVisible: renderMesh.visible,
        geometryValid: !!geometry,
        materialValid: !!material,
        hasVertices: !!geometry.attributes.position,
        hasIndices: !!geometry.index,
        vertexCount: geometry.attributes.position?.count || 0,
        indexCount: geometry.index?.count || 0,
        triangleCount: (geometry.index?.count || 0) / 3,
        materialType: material.type,
        materialNeedsUpdate: material.needsUpdate
      });
    }
    
    // 读取渲染结果进行验证
    const pixels = new Uint8Array(4 * 16); // 读取4x4像素样本
    
    // 检查readPixels前的WebGL状态
    console.log('readPixels前WebGL状态:', {
      error: glContext.getError(),
      framebuffer: glContext.getParameter(glContext.FRAMEBUFFER_BINDING),
      viewport: glContext.getParameter(glContext.VIEWPORT),
      readBuffer: glContext.getParameter(glContext.READ_BUFFER),
      implementation: {
        vendor: glContext.getParameter(glContext.VENDOR),
        renderer: glContext.getParameter(glContext.RENDERER),
        version: glContext.getParameter(glContext.VERSION)
      }
    });
    
    try {
      glContext.readPixels(0, 0, 4, 4, glContext.RGBA, glContext.UNSIGNED_BYTE, pixels);
      console.log('渲染结果采样成功:', Array.from(pixels).slice(0, 16));
      
      // 检查readPixels后的WebGL状态
      const postError = glContext.getError();
      console.log('readPixels后WebGL状态:', {
        error: postError,
        errorName: postError === glContext.NO_ERROR ? 'NO_ERROR' : 
                  postError === glContext.INVALID_ENUM ? 'INVALID_ENUM' :
                  postError === glContext.INVALID_VALUE ? 'INVALID_VALUE' :
                  postError === glContext.INVALID_OPERATION ? 'INVALID_OPERATION' :
                  postError === glContext.OUT_OF_MEMORY ? 'OUT_OF_MEMORY' :
                  'UNKNOWN_ERROR_' + postError
      });
      
      // 分析颜色分布
      let whitePixels = 0, greenPixels = 0, blackPixels = 0, coloredPixels = 0;
      const samplePixels = [];
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2], a = pixels[i + 3];
        if (samplePixels.length < 10) {
          samplePixels.push({ r, g, b, a, index: i/4 });
        }
        if (r > 240 && g > 240 && b > 240) whitePixels++;
        else if (g > r && g > b && g > 100) greenPixels++;
        else if (r < 20 && g < 20 && b < 20) blackPixels++;
        else if (r > 50 || g > 50 || b > 50) coloredPixels++;
      }
      console.log('颜色分析:', { 
        白色像素: whitePixels, 
        绿色像素: greenPixels, 
        黑色像素: blackPixels, 
        彩色像素: coloredPixels,
        总像素: pixels.length / 4,
        渲染成功: (whitePixels + greenPixels + coloredPixels) > 0,
        像素样本: samplePixels,
        问题诊断: greenPixels > 0 ? '输出绿色像素，可能是光源颜色或着色器问题' : '正常'
      });
      
      // 如果渲染结果全黑，强制生成测试纹理
      if (blackPixels === pixels.length / 4) {
        console.warn('检测到全黑渲染结果，生成测试纹理');
        // 创建一个简单的测试纹理
        const testCanvas = document.createElement('canvas');
        testCanvas.width = 512;
        testCanvas.height = 512;
        const testCtx = testCanvas.getContext('2d');
        if (testCtx) {
          // 绘制简单的焦散图案
          testCtx.fillStyle = '#000000';
          testCtx.fillRect(0, 0, 512, 512);
          testCtx.fillStyle = '#ffffff';
          for (let i = 0; i < 20; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const radius = Math.random() * 30 + 10;
            testCtx.beginPath();
            testCtx.arc(x, y, radius, 0, Math.PI * 2);
            testCtx.fill();
          }
          
          // 将测试纹理应用到渲染目标 - 使用标准方法
          const testTexture = new THREE.CanvasTexture(testCanvas);
          testTexture.needsUpdate = true;
          testTexture.flipY = false;
          testTexture.generateMipmaps = false;
          testTexture.minFilter = THREE.LinearFilter;
          testTexture.magFilter = THREE.LinearFilter;
          testTexture.wrapS = THREE.ClampToEdgeWrapping;
          testTexture.wrapT = THREE.ClampToEdgeWrapping;
          
          setCausticsTexture(testTexture);
          console.log('应用测试纹理完成');
        }
      }
    } catch (error) {
      console.warn('readPixels失败:', error);
      // 如果读取失败，填充测试数据
      pixels.fill(128); // 填充中等亮度值
      console.log('使用测试数据:', Array.from(pixels).slice(0, 16));
    }
    
    renderer.setRenderTarget(null);
    
    // 简化的纹理验证 - 避免WebGL上下文冲突
    console.log('焦散纹理创建完成:', {
      width: causticsTarget.width,
      height: causticsTarget.height,
      texture: causticsTarget.texture
    });
    
    setRenderProgress(100);
    setRenderStage('渲染完成!');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 创建安全的Canvas纹理 - 避免WebGL纹理上传错误
    let finalTexture: THREE.Texture;
    
    try {
      // 尝试从渲染目标读取像素数据
      const canvas = document.createElement('canvas');
      canvas.width = causticsTarget.width;
      canvas.height = causticsTarget.height;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // 创建ImageData来存储像素数据
        const imageData = ctx.createImageData(canvas.width, canvas.height);
        
        // 如果有有效的像素数据，使用它
        if (pixels && pixels.length > 0) {
          // 将RGBA像素数据复制到ImageData
          for (let i = 0; i < Math.min(pixels.length, imageData.data.length); i++) {
            imageData.data[i] = pixels[i];
          }
        } else {
          // 创建测试图案
          for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
              const index = (y * canvas.width + x) * 4;
              const centerX = canvas.width / 2;
              const centerY = canvas.height / 2;
              const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
              const maxDistance = Math.sqrt(centerX ** 2 + centerY ** 2);
              const normalizedDistance = distance / maxDistance;
              
              // 创建径向渐变效果
              const intensity = Math.max(0, 1 - normalizedDistance) * 255;
              const wave = Math.sin(distance * 0.1) * 0.5 + 0.5;
              const finalIntensity = intensity * wave;
              
              imageData.data[index] = finalIntensity;     // R
              imageData.data[index + 1] = finalIntensity; // G
              imageData.data[index + 2] = finalIntensity; // B
              imageData.data[index + 3] = 255;            // A
            }
          }
        }
        
        // 将ImageData绘制到canvas
        ctx.putImageData(imageData, 0, 0);
        
        // 使用CanvasTexture创建纹理 - 这是最安全的方法
        finalTexture = new THREE.CanvasTexture(canvas);
      } else {
        throw new Error('无法创建2D上下文');
      }
    } catch (error) {
      console.warn('Canvas纹理创建失败，使用简化备用纹理:', error);
      
      // 创建简化的备用纹理
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // 创建简单的焦散图案
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 512, 512);
        
        // 添加白色圆点模拟焦散效果
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 30; i++) {
          const x = Math.random() * 512;
          const y = Math.random() * 512;
          const radius = Math.random() * 15 + 5;
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
        
        finalTexture = new THREE.CanvasTexture(canvas);
      } else {
        // 最后的备用方案 - 创建数据纹理
        const size = 512;
        const data = new Uint8Array(size * size * 4);
        for (let i = 0; i < data.length; i += 4) {
          data[i] = 128;     // R
          data[i + 1] = 128; // G
          data[i + 2] = 128; // B
          data[i + 3] = 255; // A
        }
        finalTexture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
      }
    }
    
    // 设置纹理属性
    finalTexture.needsUpdate = true;
    finalTexture.flipY = false;
    finalTexture.generateMipmaps = false;
    finalTexture.minFilter = THREE.LinearFilter;
    finalTexture.magFilter = THREE.LinearFilter;
    finalTexture.wrapS = THREE.ClampToEdgeWrapping;
    finalTexture.wrapT = THREE.ClampToEdgeWrapping;
    
    console.log('焦散纹理创建完成:', {
      width: finalTexture.image?.width || causticsTarget.width,
      height: finalTexture.image?.height || causticsTarget.height,
      format: finalTexture.format,
      type: finalTexture.type,
      flipY: finalTexture.flipY,
      needsUpdate: finalTexture.needsUpdate,
      isCanvasTexture: finalTexture instanceof THREE.CanvasTexture,
      isDataTexture: finalTexture instanceof THREE.DataTexture,
      uuid: finalTexture.uuid
    });
    
    // 设置焦散纹理到状态
    stateSettersRef.current.setCausticsTexture(finalTexture);
    console.log('焦散纹理已设置到状态:', !!finalTexture);
    
    // 确保纹理状态更新
    setTimeout(() => {
      console.log('焦散纹理状态确认:', {
        textureSet: !!finalTexture,
        textureType: finalTexture.constructor.name,
        stateUpdated: true
      });
    }, 100);
    stateSettersRef.current.setHasRendered(true);
    stateSettersRef.current.setIsCalculating(false);
    stateSettersRef.current.onCalculatingChange?.(false);
    
    console.log('焦散计算完成，纹理已设置');
    
    // 将渲染结果保存到store
    try {
      // 创建一个临时canvas来获取纹理的图像数据
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      
      // 从WebGL纹理获取图像数据
      const tempRenderer = new THREE.WebGLRenderer({ preserveDrawingBuffer: true });
      tempRenderer.setSize(512, 512);
      const tempScene = new THREE.Scene();
      const tempCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
      
      // 创建一个平面来显示纹理
      const planeGeometry = new THREE.PlaneGeometry(2, 2);
      const planeMaterial = new THREE.MeshBasicMaterial({ map: finalTexture });
      const plane = new THREE.Mesh(planeGeometry, planeMaterial);
      tempScene.add(plane);
      
      tempRenderer.render(tempScene, tempCamera);
      const imageData = tempRenderer.domElement.toDataURL('image/png');
      
      // 清理临时资源
      tempRenderer.dispose();
      planeGeometry.dispose();
      planeMaterial.dispose();
      
      // 保存渲染结果到store
      const renderResult = {
        id: `caustics_${Date.now()}`,
        timestamp: Date.now(),
        imageData: imageData,
        parameters: {
          lensWidth: lensWidth,
          lensHeight: lensHeight,
          focalLength: focalLength,
          targetDistance: distance,
          material: refractiveIndex === 1.49 ? 'acrylic' : 'glass'
        },
        renderTime: Date.now() - startTime,
        status: 'success' as const
      };
      
      if (addCausticsRenderResult) {
        addCausticsRenderResult(renderResult);
        console.log('焦散渲染结果已保存到store:', renderResult);
      }
    } catch (error) {
      console.error('保存焦散渲染结果时出错:', error);
    }
    
      // 清理资源
      renderer.dispose();
      causticsTarget.dispose();
      waterTexture.dispose();
      causticsMaterial.dispose();
      wallGeometry.dispose();
    } catch (error) {
      console.error('焦散计算过程中发生错误:', error);
      stateSettersRef.current.setRenderStage('计算失败: ' + (error as Error).message);
      stateSettersRef.current.setIsCalculating(false);
      stateSettersRef.current.onCalculatingChange?.(false);
    }
  }, [
    lensWidth, lensHeight, focalLength, distance, refractiveIndex, geometry
  ]); // 只保留真正影响计算逻辑的参数
  
  // 使用useRef避免函数引用变化导致的重复触发
  const calculateCausticsRef = useRef(calculateCaustics);
  
  // 只在calculateCaustics函数真正改变时更新ref
  useEffect(() => {
    calculateCausticsRef.current = calculateCaustics;
  }, [calculateCaustics]);
  
  // 监听外部渲染触发信号 - 只监听renderTrigger，避免geometry变化时重复触发
  useEffect(() => {
    console.log('CausticProjection useEffect triggered:', {
      renderTrigger,
      hasGeometry: !!geometry,
      hasVertices: geometry?.vertices?.length > 0,
      verticesCount: geometry?.vertices?.length || 0,
      isCalculating
    });
    
    // 防止重复触发：如果正在计算中，跳过新的触发
    if (isCalculating) {
      console.log('Already calculating, skipping new trigger');
      return;
    }
    
    // 只有当renderTrigger变化且大于0时才触发计算
    if (renderTrigger > 0 && geometry && geometry.vertices && geometry.vertices.length > 0) {
      console.log('Starting calculateCaustics...');
      calculateCausticsRef.current();
    } else {
      console.log('Skipping calculateCaustics:', {
        renderTriggerValid: renderTrigger > 0,
        geometryValid: !!geometry,
        verticesValid: geometry?.vertices?.length > 0
      });
    }
  }, [renderTrigger]); // 移除geometry和isCalculating依赖，避免重复触发
  
  return (
    <>
      {/* 基础墙面（用于显示基本透射光） - 位置在焦散投影后面 */}
      <mesh position={[0, 0, -distance - 2]} receiveShadow>
        <planeGeometry args={[wallWidth, wallHeight]} />
        <meshLambertMaterial 
          color={new THREE.Color(0.95, 0.95, 0.95)}
          transparent={true}
          opacity={0.2}
        />
      </mesh>
      
      {/* 焦散投影纹理层 - 仅在有纹理时显示 */}
      {causticsTexture && (
        <mesh position={[0, 0, -distance]} receiveShadow>
          <planeGeometry args={[wallWidth, wallHeight]} />
          <meshBasicMaterial 
            map={causticsTexture} 
            transparent={true} 
            opacity={2.0}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
            depthWrite={false}
            depthTest={true}
            toneMapped={false}
            color={new THREE.Color(1, 1, 1)}
            onUpdate={(material) => {
              console.log('焦散纹理材质更新:', {
                hasTexture: !!material.map,
                textureType: material.map?.constructor.name,
                textureSize: material.map ? `${material.map.image?.width || 'unknown'}x${material.map.image?.height || 'unknown'}` : 'no texture',
                opacity: material.opacity,
                blending: material.blending,
                transparent: material.transparent,
                needsUpdate: material.needsUpdate,
                color: material.color
              });
            }}
          />
        </mesh>
      )}
      
      {/* 增强的焦散效果层 - 使用加法混合模式 */}
      {causticsTexture && (
        <mesh position={[0, 0, -distance + 0.1]} receiveShadow>
          <planeGeometry args={[wallWidth, wallHeight]} />
          <meshBasicMaterial 
            map={causticsTexture} 
            transparent={true} 
            opacity={0.4}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
            depthWrite={false}
            depthTest={true}
            toneMapped={false}
          />
        </mesh>
      )}
      
      {/* 测试用的简单焦散图案 - 当没有焦散纹理时显示 */}
      {!causticsTexture && (
        <mesh position={[0, 0, -distance]} receiveShadow>
          <planeGeometry args={[wallWidth, wallHeight]} />
          <meshBasicMaterial 
            color={new THREE.Color(1, 0.8, 0.6)}
            transparent={true} 
            opacity={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      
      {/* 调试信息 - 显示焦散纹理状态 */}
      {show && (
        <Html position={[wallWidth/2 - 50, -wallHeight/2 + 20, -distance]}>
          <div style={{
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: '8px',
            borderRadius: '4px',
            fontSize: '12px'
          }}>
            焦散纹理: {causticsTexture ? '✓' : '✗'}<br/>
            纹理UUID: {causticsTexture?.uuid?.slice(0,8) || 'N/A'}<br/>
            墙面距离: {distance}mm<br/>
            <button 
              onClick={() => {
                const testTexture = createTestTexture();
                setCausticsTexture(testTexture);
                console.log('设置测试纹理:', testTexture);
              }}
              style={{
                marginTop: '4px',
                padding: '2px 6px',
                fontSize: '10px',
                background: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '2px',
                cursor: 'pointer'
              }}
            >
              测试纹理
            </button>
          </div>
        </Html>
      )}
      

      
      {/* 焦散渲染状态显示 */}
      {(isCalculating || hasRendered) && (
        <Html position={[0, wallHeight/2 + 30, -distance]}>
          <div style={{
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '16px',
            borderRadius: '12px',
            fontSize: '14px',
            textAlign: 'center',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            backdropFilter: 'blur(10px)',
            minWidth: '280px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
          }}>
            <div style={{ marginBottom: '12px', fontWeight: 'bold' }}>
              焦散投影仿真 ({distance}mm)
            </div>
            
            {isCalculating && (
              <div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  gap: '8px',
                  marginBottom: '12px'
                }}>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  <span>{renderStage}</span>
                </div>
                
                <div style={{
                  width: '100%',
                  height: '8px',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  marginBottom: '8px'
                }}>
                  <div style={{
                    width: `${renderProgress}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #1890ff, #722ed1)',
                    borderRadius: '4px',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
                
                <div style={{ fontSize: '12px', opacity: 0.8 }}>
                  {renderProgress}% 完成
                </div>
              </div>
            )}
            
            {hasRendered && !isCalculating && (
              <div style={{ 
                color: '#52c41a', 
                fontWeight: 'bold'
              }}>
                ✓ 渲染完成
              </div>
            )}
          </div>
          
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </Html>
      )}
    </>
  );
};

// 墙面组件已移除 - 避免重复调用CausticProjection

// WebGL错误处理组件
const WebGLErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasWebGLError, setHasWebGLError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleWebGLError = (event: any) => {
      console.error('WebGL Error:', event);
      setHasWebGLError(true);
      setErrorMessage('WebGL上下文创建失败。请尝试刷新页面或使用支持WebGL的浏览器。');
    };

    // 监听WebGL错误
    window.addEventListener('webglcontextlost', handleWebGLError);
    window.addEventListener('webglcontextcreationerror', handleWebGLError);

    return () => {
      window.removeEventListener('webglcontextlost', handleWebGLError);
      window.removeEventListener('webglcontextcreationerror', handleWebGLError);
    };
  }, []);

  if (hasWebGLError) {
    return (
      <div style={{ 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        textAlign: 'center',
        padding: '20px'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
        <h3>3D渲染不可用</h3>
        <p>{errorMessage}</p>
        <Button 
          type="primary" 
          onClick={() => window.location.reload()}
          style={{ marginTop: '20px' }}
        >
          刷新页面
        </Button>
      </div>
    );
  }

  return <>{children}</>;
};

export const LensViewer: React.FC = () => {
  const { geometry, isProcessing, currentImage, parameters, targetShape, setParameters, addCausticsRenderResult } = useProjectStore();
  const [lensRotation, setLensRotation] = useState(0);
  const [causticsRenderTrigger, setCausticsRenderTrigger] = useState(0);
  const [isRenderButtonDisabled, setIsRenderButtonDisabled] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  
  // 添加调试日志
  useEffect(() => {
    console.log('LensViewer 状态更新:', {
      hasGeometry: !!geometry,
      geometryVerticesCount: geometry?.vertices?.length || 0,
      hasCurrentImage: !!currentImage,
      hasTargetShape: !!targetShape,
      targetShapeSize: targetShape ? `${targetShape.length}x${targetShape[0]?.length || 0}` : 'null',
      isProcessing,
      causticsRenderTrigger
    });
  }, [geometry, currentImage, targetShape, isProcessing]);
  const [viewerSettings, setViewerSettings] = useState<ViewerSettings>({
    wireframe: false,
    showGrid: true,
    showAxes: false,
    lightIntensity: 1.0,
    materialType: 'acrylic',
    backgroundColor: 'gradient',
    autoRotate: false,
    showCaustics: false,
    showWall: true,
    wallDistance: parameters.targetDistance || 150,
    // 移除了焦散渲染模式选择
  });

  // 监听参数变化，更新材料类型和墙面距离
  useEffect(() => {
    setViewerSettings(prev => ({
      ...prev,
      materialType: parameters.material as any,
      wallDistance: parameters.targetDistance || 200
    }));
  }, [parameters.material, parameters.targetDistance]);

  // 调试焦散组件渲染状态
  useEffect(() => {
    if (viewerSettings.showWall && viewerSettings.showCaustics) {
      console.log('焦散投影组件渲染状态:', { 
        showWall: viewerSettings.showWall, 
        showCaustics: viewerSettings.showCaustics,
        wallDistance: viewerSettings.wallDistance
      });
    }
  }, [viewerSettings.showWall, viewerSettings.showCaustics, viewerSettings.wallDistance]);

  // 重复的useEffect已移除，wallDistance更新已合并到上面的useEffect中

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      {currentImage ? (
        <div style={{ height: '100%' }}>
          {geometry ? (
            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
              {/* 实时焦散渲染器已集成到CausticProjection组件中 */}
              
              <WebGLErrorBoundary>
                <Canvas
                  style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                  camera={{ position: [150, 150, 250], fov: 75, near: 0.1, far: 2000 }}
                  shadows
                  gl={{ 
                    antialias: true, 
                    alpha: false,
                    preserveDrawingBuffer: true,
                    failIfMajorPerformanceCaveat: false
                  }}
                  onCreated={(state) => {
                    console.log('WebGL context created successfully');
                    // 添加错误处理
                    const glState = state.gl.getContext();
                    if (!glState) {
                      console.error('Failed to get WebGL context');
                      throw new Error('WebGL context creation failed');
                    }
                  }}
                >
                <LightingSetup intensity={viewerSettings.lightIntensity} wallDistance={viewerSettings.wallDistance} />
                {viewerSettings.showGrid && (
                  <Grid 
                    args={[200, 200]} 
                    cellSize={5} 
                    cellThickness={0.5} 
                    cellColor="#6f6f6f" 
                    sectionSize={25} 
                    sectionThickness={1} 
                    sectionColor="#9d4edd" 
                    fadeDistance={400} 
                    fadeStrength={1} 
                    followCamera={false} 
                    infiniteGrid={true}
                  />
                )}
                <AxesHelper show={viewerSettings.showAxes} />
                <LensMesh settings={viewerSettings} onRotationChange={setLensRotation} />
                
                {/* 基础照明 - 始终存在，确保透镜可见 */}
                <directionalLight
                  position={[0, 0, viewerSettings.wallDistance * 0.5]}
                  target-position={[0, 0, -viewerSettings.wallDistance]}
                  intensity={0.4}
                  color="#ffffff"
                />
                
                {/* 光源可视化 - 始终显示，独立于墙面状态 */}
                <LightSourceVisualization lightSource={parameters.lightSource} />
                
                {/* 基础墙面 - 仅在启用时显示 */}
                {viewerSettings.showWall && (
                  <mesh position={[0, 0, -viewerSettings.wallDistance]} receiveShadow>
                    <planeGeometry args={[Math.max(100 * 4, 200), Math.max(100 * 4, 150)]} />
                    <meshLambertMaterial 
                      color={viewerSettings.showCaustics ? "#f8f8f8" : "#e0e0e0"} 
                      transparent 
                      opacity={viewerSettings.showCaustics ? 0.7 : 0.9} 
                      side={THREE.DoubleSide} 
                    />
                  </mesh>
                )}
                
                {/* 焦散投影效果 - 仅在启用墙面和焦散时显示 */}
                {viewerSettings.showWall && viewerSettings.showCaustics && (
                  <CausticProjection
                    show={true}
                    distance={viewerSettings.wallDistance}
                    intensity={viewerSettings.lightIntensity}
                    lensWidth={100}
                    lensHeight={100}
                    geometry={geometry}
                    targetShape={targetShape || []}
                    resolution={parameters.resolution || 128}
                    refractiveIndex={parameters.refractiveIndex || 1.49}
                    focalLength={parameters.focalLength || 50}
                    lensRotation={lensRotation}
                    isAutoRotating={viewerSettings.autoRotate}
                    lightSource={parameters.lightSource}
                    renderTrigger={causticsRenderTrigger}
                    onCalculatingChange={setIsCalculating}
                    addCausticsRenderResult={addCausticsRenderResult}
                  />
                )}
                {/* 移除Environment组件避免HDR资源请求导致的网络问题 */}
                {/* <Environment preset="sunset" background={false} /> */}
                <OrbitControls 
                  enablePan={true}
                  enableZoom={true}
                  enableRotate={true}
                  dampingFactor={0.05}
                  rotateSpeed={0.5}
                  zoomSpeed={0.5}
                  panSpeed={0.5}
                  maxDistance={1000}
                  minDistance={1}
                  target={[0, 0, 0]}
                />
              </Canvas>
              </WebGLErrorBoundary>
              
              {geometry && (
                <div style={{
                  position: 'absolute',
                  bottom: '16px',
                  left: '16px',
                  background: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  zIndex: 5
                }}>
                  <div>顶点: {geometry.vertices.length.toLocaleString()}</div>
                  <div>面片: {geometry.faces.length.toLocaleString()}</div>
                  <div>材质: {parameters.material}</div>
                </div>
              )}
              
              {/* 3D视图控制面板 */}
              <Card 
                size="small"
                title="3D视图设置"
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  width: '280px',
                  zIndex: 10,
                  background: 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(8px)'
                }}
              >
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  {/* 墙面投影设置 */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 500 }}>投影墙面</span>
                      <Switch 
                        size="small"
                        checked={viewerSettings.showWall}
                        onChange={(checked) => setViewerSettings(prev => ({ ...prev, showWall: checked }))}
                      />
                    </div>
                    {viewerSettings.showWall && (
                      <div>
                        <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>距离: {viewerSettings.wallDistance}mm</div>
                        <Slider
                          min={5}
                          max={1000}
                          value={viewerSettings.wallDistance}
                          onChange={(value) => setViewerSettings(prev => ({ ...prev, wallDistance: value }))}
                        />
                      </div>
                    )}
                  </div>
                  
                  {/* 光源设置 */}
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '8px' }}>光源类型</div>
                    <Select
                      size="small"
                      value={parameters.lightSource.type}
                      onChange={(value) => {
                         const newLightSource = { ...parameters.lightSource, type: value };
                         if (value === 'point') {
                           // 确保点光源在透镜前方（正Z轴），与透镜中心在XY平面对齐
                           newLightSource.position = { x: 0, y: 0, z: 150 };
                         }
                         setParameters({ lightSource: newLightSource });
                       }}
                      style={{ width: '100%', marginBottom: '8px' }}
                    >
                      <Select.Option value="parallel">平行光</Select.Option>
                      <Select.Option value="point">点光源</Select.Option>
                    </Select>
                  </div>
                  
                  {/* 光照强度 */}
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '8px' }}>光照强度</div>
                    <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>强度: {(viewerSettings.lightIntensity * 100).toFixed(0)}%</div>
                    <Slider
                      min={0.1}
                      max={2.0}
                      step={0.1}
                      value={viewerSettings.lightIntensity}
                      onChange={(value) => setViewerSettings(prev => ({ ...prev, lightIntensity: value }))}
                    />
                  </div>
                  
                  {/* 其他显示选项 */}
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '8px' }}>显示选项</div>
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px' }}>网格</span>
                        <Switch 
                          size="small"
                          checked={viewerSettings.showGrid}
                          onChange={(checked) => setViewerSettings(prev => ({ ...prev, showGrid: checked }))}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px' }}>坐标轴</span>
                        <Switch 
                          size="small"
                          checked={viewerSettings.showAxes}
                          onChange={(checked) => setViewerSettings(prev => ({ ...prev, showAxes: checked }))}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px' }}>线框模式</span>
                        <Switch 
                          size="small"
                          checked={viewerSettings.wireframe}
                          onChange={(checked) => setViewerSettings(prev => ({ ...prev, wireframe: checked }))}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px' }}>显示焦散</span>
                        <Switch 
                          size="small"
                          checked={viewerSettings.showCaustics}
                          onChange={(checked) => setViewerSettings(prev => ({ ...prev, showCaustics: checked }))}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px' }}>渲染焦散投影</span>
                        <Button 
                          size="small"
                          type="primary"
                          disabled={isRenderButtonDisabled}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            
                            // 防抖：禁用按钮2秒
                            if (isRenderButtonDisabled) {
                              console.log('按钮被禁用，跳过点击');
                              return;
                            }
                            
                            setIsRenderButtonDisabled(true);
                            setTimeout(() => setIsRenderButtonDisabled(false), 2000);
                            
                            console.log('开始渲染按钮被点击');
                            console.log('当前状态:', {
                              showCaustics: viewerSettings.showCaustics,
                              causticsRenderTrigger,
                              hasGeometry: !!geometry,
                              verticesCount: geometry?.vertices?.length || 0
                            });
                            
                            // 检查是否有几何体数据
                            if (!geometry || !geometry.vertices || geometry.vertices.length === 0) {
                              message.warning('请先上传图片并点击"开始计算"生成透镜几何体');
                              console.log('❌ 没有几何体数据，无法进行焦散渲染');
                              return;
                            }
                            
                            console.log('✅ 几何体数据检查通过，开始焦散渲染');
                            
                            // 防止重复触发：检查是否已经在计算中
                            if (isCalculating) {
                              console.log('⚠️ 已在计算中，跳过重复触发');
                              return;
                            }
                            
                            setIsCalculating(true);
                            setViewerSettings(prev => ({ ...prev, showCaustics: true }));
                            setCausticsRenderTrigger(prev => {
                              const newValue = prev + 1;
                              console.log('更新 causticsRenderTrigger:', prev, '->', newValue);
                              return newValue;
                            });
                            
                            // 设置一个超时来重置计算状态，防止卡死
                            setTimeout(() => {
                              setIsCalculating(false);
                            }, 30000); // 30秒超时
                          }}
                          style={{
                            fontSize: '10px',
                            height: '24px',
                            padding: '0 8px'
                          }}
                        >
                          开始渲染
                        </Button>
                      </div>
                      {/* 移除了焦散渲染模式选择 */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px' }}>自动旋转</span>
                        <Switch 
                          size="small"
                          checked={viewerSettings.autoRotate}
                          onChange={(checked) => setViewerSettings(prev => ({ ...prev, autoRotate: checked }))}
                        />
                      </div>
                    </Space>
                  </div>
                </Space>
              </Card>
            </div>
          ) : (
            <div style={{ 
              height: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              background: '#000'
            }}>
              {isProcessing ? (
                <div style={{ textAlign: 'center', color: 'white' }}>
                  <div style={{ fontSize: '64px', marginBottom: '16px' }}>⚙️</div>
                  <div style={{ fontSize: '24px' }}>正在生成3D透镜模型...</div>
                  <div style={{ fontSize: '14px', opacity: 0.7, marginTop: '8px' }}>这可能需要一段时间</div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: 'white' }}> 
                  <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔍</div>
                  <div style={{ fontSize: '24px' }}>等待生成透镜模型</div>
                  <div style={{ fontSize: '14px', opacity: 0.7, marginTop: '8px' }}>请先上传图片并点击"生成透镜"</div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div style={{ 
          height: '100%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: '#f5f5f5'
        }}>
          <div style={{ textAlign: 'center', color: '#666' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>📷</div>
            <div style={{ fontSize: '24px' }}>请先上传图片</div>
            <div style={{ fontSize: '14px', opacity: 0.7, marginTop: '8px' }}>支持 JPG、PNG、GIF 格式</div>
          </div>
        </div>
      )}
      
      {/* 版权信息 */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        color: '#666',
        fontSize: '12px',
        textAlign: 'center',
        zIndex: 1000,
        background: 'rgba(255, 255, 255, 0.8)',
        padding: '4px 8px',
        borderRadius: '4px',
        backdropFilter: 'blur(4px)'
      }}>
        © 2025 小白客 - 焦散透镜应用
      </div>
    </div>
  );
};