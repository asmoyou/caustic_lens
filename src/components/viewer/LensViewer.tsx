import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, Text, Html } from '@react-three/drei';
import { Button, Space, Tooltip, Card, Slider, Switch, Select, Typography } from 'antd';
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
import { ExportDialog } from '../export/ExportDialog';

const { Text: AntText } = Typography;
const { Option } = Select;

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

// 光照设置 - 模拟真实的透镜投影光源
const LightingSetup: React.FC<{ intensity: number; wallDistance: number }> = ({ intensity, wallDistance }) => {
  return (
    <>
      {/* 环境光 - 提供基础照明 */}
      <ambientLight intensity={0.2 * intensity} />
      
      {/* 主光源 - 从透镜前方照射，模拟投影仪光源 */}
      <directionalLight 
        position={[0, 0, -wallDistance * 0.8]} 
        target-position={[0, 0, 0]}
        intensity={1.2 * intensity}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={wallDistance * 2}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />
      
      {/* 辅助光源 - 从侧面提供轮廓照明 */}
      <pointLight position={[-30, 20, -10]} intensity={0.3 * intensity} color="#ffffff" />
      
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
      

      
      {/* 平行光源可视化 */}
      {lightSource.type === 'parallel' && (
        <>
          {/* 平行光源用箭头表示 */}
          <mesh position={[0, 0, -50]}>
            <cylinderGeometry args={[1, 1, 20, 8]} />
            <meshBasicMaterial color={getSourceColor()} transparent opacity={0.6} />
          </mesh>
          <mesh position={[0, 0, -35]}>
            <coneGeometry args={[3, 10, 8]} />
            <meshBasicMaterial color={getSourceColor()} transparent opacity={0.8} />
          </mesh>
          {/* 平行光线指示 */}
          {Array.from({ length: 9 }, (_, i) => {
            const x = (i % 3 - 1) * 20;
            const y = (Math.floor(i / 3) - 1) * 20;
            return (
              <mesh key={i} position={[x, y, -70]}>
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

// 焦散投影组件 - 显示真实的透镜投影效果
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
}> = ({ show, distance, intensity, lensWidth, lensHeight, geometry, targetShape, resolution, refractiveIndex, focalLength, lensRotation = 0, isAutoRotating = false, lightSource }) => {
  const [pointCount, setPointCount] = useState(0);
  const [isCalculating, setIsCalculating] = useState(false);
  
  if (!show) return null;
  
  // 墙面尺寸固定为300mm×300mm
  const wallWidth = 300;
  const wallHeight = 300;
  
  // 根据光源类型设置光源位置（在useMemo外部定义以便JSX访问）
  const isPointLight = lightSource?.type === 'point';
  const lightDistance = 50; // 光源距离透镜50mm
  const lightPosition = isPointLight ? { x: 0, y: 0, z: -lightDistance } : null;
  
  // 生成焦散纹理 - 使用useMemo避免重复计算
  const causticTexture = useMemo(() => {
    setIsCalculating(true);
    console.log('计算焦散投影:', { distance, intensity, lensWidth, lensHeight, geometry });
    
    // 检查必要参数
    if (!lensWidth || !lensHeight || lensWidth <= 0 || lensHeight <= 0) {
      console.warn('透镜尺寸无效:', { lensWidth, lensHeight });
      return null;
    }
    
    // 创建canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    canvas.width = 512;
    canvas.height = 512;
    
    // 清除画布 - 使用透明背景
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // 设置半透明深色背景以便看到光点
    ctx.fillStyle = 'rgba(20, 20, 20, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 基于causticsEngineering的物理正确焦散算法
    const points: any[] = [];
    // 动态调整光点数量：旋转时使用低精度，停止时使用高精度
    const rayCount = isAutoRotating ? 1000 : 15000; // 旋转时1000光点，停止时15000光点
    
    // 设置不同光源的颜色
    const lightColor = isPointLight ? 
      { r: 255, g: 255, b: 100 } : // 点光源：暖黄色
      { r: 100, g: 150, b: 255 }; // 平行光：冷蓝色
    
    // 透镜网格参数（基于causticsEngineering的网格方法）
    const meshResolution = resolution; // 使用参数设置中的分辨率
    const lensRadius = Math.min(lensWidth, lensHeight) * 0.45;
    // 使用传入的焦距和折射率参数
    
    // 创建透镜表面网格（模拟causticsEngineering的squareMesh）
    const lensGrid: { x: number; y: number; z: number; deflectionX: number; deflectionY: number }[][] = [];
    
    for (let i = 0; i <= meshResolution; i++) {
      lensGrid[i] = [];
      for (let j = 0; j <= meshResolution; j++) {
        const x = (i / meshResolution - 0.5) * lensWidth;
        const y = (j / meshResolution - 0.5) * lensHeight;
        const r = Math.sqrt(x * x + y * y);
        
        // 计算透镜表面高度（基于目标图案优化）
        let surfaceHeight = 0;
        if (r < lensRadius) {
          // 基础球面透镜形状
          const curvatureRadius = lensRadius * 1.5;
          surfaceHeight = Math.sqrt(Math.max(0, curvatureRadius * curvatureRadius - r * r)) - curvatureRadius;
          
          // 添加基于目标形状的表面调制（改进版本，更准确地反映目标图案）
          if (targetShape && targetShape.length > 0) {
            const shapeX = Math.floor((x / lensWidth + 0.5) * targetShape.length);
            const shapeY = Math.floor((y / lensHeight + 0.5) * targetShape[0].length);
            if (shapeX >= 0 && shapeX < targetShape.length && shapeY >= 0 && shapeY < targetShape[0].length) {
              const targetIntensity = targetShape[shapeX][shapeY];
              // 使用更复杂的表面调制公式，基于causticsEngineering的方法
              const intensityFactor = Math.max(0.1, Math.min(targetIntensity, 2.0));
              const radialFactor = 1.0 - (r / lensRadius) * (r / lensRadius);
              const heightModulation = intensityFactor * radialFactor * 5.0 * (refractiveIndex - 1) / refractiveIndex;
              surfaceHeight += heightModulation;
            }
          }
        }
        
        // 先存储表面高度，稍后计算偏转
        lensGrid[i][j] = {
          x,
          y,
          z: surfaceHeight,
          deflectionX: 0, // 稍后计算
          deflectionY: 0  // 稍后计算
        };
      }
    }
    
    // 第二遍：计算光线偏转（基于已完成的表面高度网格）
    const H = focalLength;
    const metersPerPixel = lensWidth / meshResolution;
    
    for (let i = 0; i <= meshResolution; i++) {
      for (let j = 0; j <= meshResolution; j++) {
        const x = lensGrid[i][j].x;
        const y = lensGrid[i][j].y;
        const surfaceHeight = lensGrid[i][j].z;
        
        // 计算表面梯度（用于确定法向量）
        const gradientX = i > 0 && i < meshResolution ? 
          (lensGrid[i+1][j].z - lensGrid[i-1][j].z) / (2 * metersPerPixel) : 0;
        const gradientY = j > 0 && j < meshResolution ? 
          (lensGrid[i][j+1].z - lensGrid[i][j-1].z) / (2 * metersPerPixel) : 0;
        
        // 存储表面梯度信息，用于后续光线追踪时的斯涅尔定律计算
        lensGrid[i][j].gradientX = gradientX;
        lensGrid[i][j].gradientY = gradientY;
        
        // 为平行光源预计算偏转（向后兼容）
        if (lightSource.type === 'parallel') {
          // 基于斯涅尔定律的正确偏转计算
          // 计算表面法向量（归一化）
          const normalLength = Math.sqrt(gradientX * gradientX + gradientY * gradientY + 1);
          const normalX = -gradientX / normalLength;
          const normalY = -gradientY / normalLength;
          const normalZ = 1 / normalLength;
          
          // 入射光线方向（垂直入射，沿z轴负方向）
          const incidentX = 0;
          const incidentY = 0;
          const incidentZ = -1;
          
          // 计算入射角余弦值
          const cosIncident = -(incidentX * normalX + incidentY * normalY + incidentZ * normalZ);
          
          // 折射率比值
          const n = 1.0 / refractiveIndex; // 从空气到透镜材料
          
          // 计算折射角余弦值（斯涅尔定律）
          const discriminant = 1 - n * n * (1 - cosIncident * cosIncident);
          
          if (discriminant >= 0) {
            const cosRefracted = Math.sqrt(discriminant);
            
            // 计算折射光线方向
            const refractedX = n * incidentX + (n * cosIncident - cosRefracted) * normalX;
            const refractedY = n * incidentY + (n * cosIncident - cosRefracted) * normalY;
            const refractedZ = n * incidentZ + (n * cosIncident - cosRefracted) * normalZ;
            
            // 计算偏转角度（相对于原始方向的偏移）
            const deflectionX = refractedX / Math.abs(refractedZ);
            const deflectionY = refractedY / Math.abs(refractedZ);
            
            // 更新偏转值
            lensGrid[i][j].deflectionX = deflectionX;
            lensGrid[i][j].deflectionY = deflectionY;
          } else {
             // 全反射情况，设置为0偏转
             lensGrid[i][j].deflectionX = 0;
             lensGrid[i][j].deflectionY = 0;
           }
        } else {
          // 对于点光源，偏转将在光线追踪时动态计算
          lensGrid[i][j].deflectionX = 0;
          lensGrid[i][j].deflectionY = 0;
        }
      }
    }
    
    // 光线追踪（使用网格插值）
    for (let i = 0; i < rayCount; i++) {
      // 在透镜表面生成随机入射点
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * lensRadius;
      let lensX = Math.cos(angle) * r;
      let lensY = Math.sin(angle) * r;
      
      // 根据光源类型计算入射光线方向
      let incidentDirX = 0;
      let incidentDirY = 0;
      let incidentDirZ = 1; // 平行光从z=-50朝向z=0（正方向）
      
      if (lightSource.type === 'point') {
        // 点光源：从光源位置到透镜表面的光线
        const lightX = lightSource.position.x;
        const lightY = lightSource.position.y;
        const lightZ = lightSource.position.z;
        
        const dirX = lensX - lightX;
        const dirY = lensY - lightY;
        const dirZ = 0 - lightZ; // 透镜在z=0平面
        
        const dirLength = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);
        incidentDirX = dirX / dirLength;
        incidentDirY = dirY / dirLength;
        incidentDirZ = dirZ / dirLength;
      }
      // 平行光源：从z=-50朝向透镜z=0的正方向入射
      
      // 应用透镜旋转
      if (lensRotation !== 0) {
        const cos = Math.cos(lensRotation);
        const sin = Math.sin(lensRotation);
        const rotatedX = lensX * cos - lensY * sin;
        const rotatedY = lensX * sin + lensY * cos;
        lensX = rotatedX;
        lensY = rotatedY;
      }
      
      // 在网格中查找对应位置并插值
      const gridX = (lensX / lensWidth + 0.5) * meshResolution;
      const gridY = (lensY / lensHeight + 0.5) * meshResolution;
      
      if (gridX >= 0 && gridX < meshResolution && gridY >= 0 && gridY < meshResolution) {
        const i0 = Math.floor(gridX);
        const j0 = Math.floor(gridY);
        const i1 = Math.min(i0 + 1, meshResolution);
        const j1 = Math.min(j0 + 1, meshResolution);
        
        // 双线性插值获取偏转角度或表面梯度
        const fx = gridX - i0;
        const fy = gridY - j0;
        
        let deflectionX, deflectionY;
        
        if (lightSource.type === 'parallel') {
          // 平行光源：使用预计算的偏转
          deflectionX = 
            lensGrid[i0][j0].deflectionX * (1 - fx) * (1 - fy) +
            lensGrid[i1][j0].deflectionX * fx * (1 - fy) +
            lensGrid[i0][j1].deflectionX * (1 - fx) * fy +
            lensGrid[i1][j1].deflectionX * fx * fy;
            
          deflectionY = 
            lensGrid[i0][j0].deflectionY * (1 - fx) * (1 - fy) +
            lensGrid[i1][j0].deflectionY * fx * (1 - fy) +
            lensGrid[i0][j1].deflectionY * (1 - fx) * fy +
            lensGrid[i1][j1].deflectionY * fx * fy;
        } else {
          // 点光源：动态计算偏转
          // 插值获取表面梯度
          const gradientX = 
            lensGrid[i0][j0].gradientX * (1 - fx) * (1 - fy) +
            lensGrid[i1][j0].gradientX * fx * (1 - fy) +
            lensGrid[i0][j1].gradientX * (1 - fx) * fy +
            lensGrid[i1][j1].gradientX * fx * fy;
            
          const gradientY = 
            lensGrid[i0][j0].gradientY * (1 - fx) * (1 - fy) +
            lensGrid[i1][j0].gradientY * fx * (1 - fy) +
            lensGrid[i0][j1].gradientY * (1 - fx) * fy +
            lensGrid[i1][j1].gradientY * fx * fy;
          
          // 计算表面法向量（归一化）
          const normalLength = Math.sqrt(gradientX * gradientX + gradientY * gradientY + 1);
          const normalX = -gradientX / normalLength;
          const normalY = -gradientY / normalLength;
          const normalZ = 1 / normalLength;
          
          // 计算入射角余弦值
          const cosIncident = -(incidentDirX * normalX + incidentDirY * normalY + incidentDirZ * normalZ);
          
          // 折射率比值
          const n = 1.0 / refractiveIndex; // 从空气到透镜材料
          
          // 计算折射角余弦值（斯涅尔定律）
          const discriminant = 1 - n * n * (1 - cosIncident * cosIncident);
          
          if (discriminant >= 0) {
            const cosRefracted = Math.sqrt(discriminant);
            
            // 计算折射光线方向
            const refractedX = n * incidentDirX + (n * cosIncident - cosRefracted) * normalX;
            const refractedY = n * incidentDirY + (n * cosIncident - cosRefracted) * normalY;
            const refractedZ = n * incidentDirZ + (n * cosIncident - cosRefracted) * normalZ;
            
            // 计算偏转角度（相对于原始方向的偏移）
            deflectionX = refractedX / Math.abs(refractedZ);
            deflectionY = refractedY / Math.abs(refractedZ);
          } else {
            // 全反射情况，设置为0偏转
            deflectionX = 0;
            deflectionY = 0;
          }
        }
        
        // 应用透镜旋转到偏转向量（关键修复）
        if (lensRotation !== 0) {
          const cos = Math.cos(lensRotation);
          const sin = Math.sin(lensRotation);
          const rotatedDeflectionX = deflectionX * cos - deflectionY * sin;
          const rotatedDeflectionY = deflectionX * sin + deflectionY * cos;
          deflectionX = rotatedDeflectionX;
          deflectionY = rotatedDeflectionY;
        }
        
        // 计算投影位置
        const projectedX = lensX + deflectionX * distance;
        const projectedY = lensY + deflectionY * distance;
        
        // 检查是否在墙面范围内
        if (Math.abs(projectedX) < wallWidth/2 && Math.abs(projectedY) < wallHeight/2) {
          // 计算光强度（基于焦散密度）
          const distanceFromCenter = Math.sqrt(projectedX * projectedX + projectedY * projectedY);
          const focusIntensity = Math.exp(-distanceFromCenter / (wallWidth * 0.3));
          const baseIntensity = 0.4 + focusIntensity * 0.6;
          
          points.push({
            x: projectedX,
            y: projectedY,
            intensity: Math.min(baseIntensity * (0.7 + Math.random() * 0.6), 1.0)
          });
        }
      }
    }
    
    setPointCount(points.length);
    console.log('焦散点生成:', {
      总光线数: rayCount,
      有效光点数: points.length,
      透镜尺寸: { lensWidth, lensHeight },
      墙面距离: distance,
      光强: intensity
    });
    
    // 调试：输出前几个光点的信息
    if (points.length > 0) {
      console.log('前3个光点:', points.slice(0, 3));
    }
    
    // 绘制焦散点 - 精细化效果
    points.forEach(point => {
      const canvasX = (point.x / wallWidth + 0.5) * canvas.width;
      const canvasY = (1 - (point.y / wallHeight + 0.5)) * canvas.height;
      
      // 减小光点尺寸以显示精细图案
      const baseRadius = 2 + point.intensity * 4;
      const coreRadius = 0.5 + point.intensity * 1.5;
      
      // 绘制主光晕（根据光源类型使用不同颜色）
      const mainGradient = ctx.createRadialGradient(canvasX, canvasY, 0, canvasX, canvasY, baseRadius);
      mainGradient.addColorStop(0, `rgba(255, 255, 255, ${Math.min(point.intensity * 0.9, 0.9)})`);
      mainGradient.addColorStop(0.3, `rgba(${lightColor.r}, ${lightColor.g}, ${lightColor.b}, ${Math.min(point.intensity * 0.7, 0.7)})`);
      mainGradient.addColorStop(0.7, `rgba(${Math.floor(lightColor.r * 0.8)}, ${Math.floor(lightColor.g * 0.8)}, ${Math.floor(lightColor.b * 0.8)}, ${Math.min(point.intensity * 0.4, 0.4)})`);
      mainGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      ctx.fillStyle = mainGradient;
      ctx.beginPath();
      ctx.arc(canvasX, canvasY, baseRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // 绘制亮核（带有光源颜色的中心）
      const coreGradient = ctx.createRadialGradient(canvasX, canvasY, 0, canvasX, canvasY, coreRadius);
      coreGradient.addColorStop(0, `rgba(255, 255, 255, ${Math.min(point.intensity, 1.0)})`);
      coreGradient.addColorStop(0.5, `rgba(${Math.floor((255 + lightColor.r) / 2)}, ${Math.floor((255 + lightColor.g) / 2)}, ${Math.floor((255 + lightColor.b) / 2)}, ${Math.min(point.intensity * 0.8, 0.8)})`);
      coreGradient.addColorStop(1, `rgba(${lightColor.r}, ${lightColor.g}, ${lightColor.b}, ${Math.min(point.intensity * 0.3, 0.3)})`);
      
      ctx.fillStyle = coreGradient;
      ctx.beginPath();
      ctx.arc(canvasX, canvasY, coreRadius, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // 移除测试光点，依靠真实焦散效果
    
    // 创建纹理 - 按照官方文档设置
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.flipY = false;
    texture.minFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    
    setIsCalculating(false);
    return texture;
  }, [distance, intensity, lensWidth, lensHeight, lensRotation, resolution, refractiveIndex, focalLength, geometry, targetShape, isAutoRotating, lightSource]);
  
  // 如果纹理创建失败，不渲染组件
  if (!causticTexture) {
    return null;
  }

  return (
    <>
      {/* 焦散投影纹理层 - 稍微偏移避免z-fighting */}
      <mesh position={[0, 0, distance - 0.1]} receiveShadow>
        <planeGeometry args={[wallWidth, wallHeight]} />
        <meshBasicMaterial 
          map={causticTexture} 
          transparent={true} 
          opacity={1.0}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
      

      
      {/* 焦散效果标签 */}
      <Html position={[0, wallHeight/2 + 10, distance]}>
        <div style={{
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '20px',
          fontSize: '14px',
          fontWeight: 'bold',
          textAlign: 'center',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          backdropFilter: 'blur(10px)',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {isCalculating && (
            <div style={{
              width: '16px',
              height: '16px',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              borderTop: '2px solid white',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
          )}
          {isCalculating ? '正在计算焦散投影...' : `焦散投影效果 (${distance}mm) - ${pointCount} 光点`}
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </Html>
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
  const { geometry, isProcessing, currentImage, parameters, targetShape, setParameters } = useProjectStore();
  const [lensRotation, setLensRotation] = useState(0);
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
    wallDistance: parameters.targetDistance || 200,
  });

  // 监听参数变化，更新材料类型和墙面距离
  useEffect(() => {
    setViewerSettings(prev => ({
      ...prev,
      materialType: parameters.material as any,
      wallDistance: parameters.targetDistance || 200
    }));
  }, [parameters.material, parameters.targetDistance]);

  // 重复的useEffect已移除，wallDistance更新已合并到上面的useEffect中

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      {currentImage ? (
        <div style={{ height: '100%' }}>
          {geometry ? (
            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
              <WebGLErrorBoundary>
                <Canvas
                  style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                  camera={{ position: [0, 0, 300], fov: 50 }}
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
                    const gl = state.gl.getContext();
                    if (!gl) {
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
                
                {/* 光源可视化 */}
                <LightSourceVisualization lightSource={parameters.lightSource} />
                
                {/* 基础墙面 - 始终显示 */}
                {viewerSettings.showWall && (
                  <>
                    <mesh position={[0, 0, viewerSettings.wallDistance]} receiveShadow>
                      <planeGeometry args={[Math.max((parameters.lensWidth || 50) * 4, 200), Math.max((parameters.lensHeight || 50) * 4, 150)]} />
                      <meshLambertMaterial 
                        color={viewerSettings.showCaustics ? "#f8f8f8" : "#e0e0e0"} 
                        transparent 
                        opacity={viewerSettings.showCaustics ? 0.7 : 0.9} 
                        side={THREE.DoubleSide} 
                      />
                    </mesh>
                    
                    {/* 投影光源 */}
                    <directionalLight
                      position={[0, 0, -viewerSettings.wallDistance/2]}
                      intensity={0.4}
                      color="#ffffff"
                    />
                  </>
                )}
                
                {/* 焦散投影效果 - 叠加在基础墙面上 */}
                {viewerSettings.showWall && viewerSettings.showCaustics && (
                  <CausticProjection
                    show={true}
                    distance={viewerSettings.wallDistance}
                    intensity={viewerSettings.lightIntensity}
                    lensWidth={parameters.lensWidth || 100}
                    lensHeight={parameters.lensHeight || 100}
                    geometry={geometry}
                    targetShape={targetShape || []}
                    resolution={parameters.resolution || 128}
                    refractiveIndex={parameters.refractiveIndex || 1.49}
                    focalLength={parameters.focalLength || 50}
                    lensRotation={lensRotation}
                    isAutoRotating={viewerSettings.autoRotate}
                    lightSource={parameters.lightSource}
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
                  maxDistance={500}
                  minDistance={10}
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
                          max={500}
                          value={viewerSettings.wallDistance}
                          onChange={(value) => setViewerSettings(prev => ({ ...prev, wallDistance: value }))}
                          size="small"
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
                           newLightSource.position = { x: 0, y: 0, z: -50 };
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
                      size="small"
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
                        <span style={{ fontSize: '11px' }}>焦散投影</span>
                        <Switch 
                          size="small"
                          checked={viewerSettings.showCaustics}
                          onChange={(checked) => setViewerSettings(prev => ({ ...prev, showCaustics: checked }))}
                        />
                      </div>
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
                  <div style={{ fontSize: '14px', opacity: 0.7, marginTop: '8px' }}>这可能需要几秒钟时间</div>
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
    </div>
  );
};