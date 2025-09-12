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

// CausticsRenderer removed - using new implementation

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
      

      
      {/* 平行光源可视化 - 修正位置到正Z轴（透镜前方） */}
      {lightSource.type === 'parallel' && (
        <>
          {/* 平行光源用箭头表示，位置在透镜前方 */}
          <mesh position={[0, 0, 50]}>
            <cylinderGeometry args={[1, 1, 20, 8]} />
            <meshBasicMaterial color={getSourceColor()} transparent opacity={0.6} />
          </mesh>
          <mesh position={[0, 0, 35]}>
            <coneGeometry args={[3, 10, 8]} />
            <meshBasicMaterial color={getSourceColor()} transparent opacity={0.8} />
          </mesh>
          {/* 平行光线指示，从透镜前方照射 */}
          {Array.from({ length: 9 }, (_, i) => {
            const x = (i % 3 - 1) * 20;
            const y = (Math.floor(i / 3) - 1) * 20;
            return (
              <mesh key={i} position={[x, y, 70]}>
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
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderStage, setRenderStage] = useState('');
  const [hasRendered, setHasRendered] = useState(false);
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const causticsTargetRef = useRef<THREE.WebGLRenderTarget>();
  const waterMeshRef = useRef<THREE.Mesh>();
  const lightCameraRef = useRef<THREE.OrthographicCamera>();
  
  if (!show) return null;
  
  // 墙面尺寸固定为300mm×300mm
  const wallWidth = 300;
  const wallHeight = 300;
  
  // 简化的焦散着色器 - 专注于基本透射光效果
  const vertexShader = `
    uniform vec3 light;
    uniform sampler2D water;
    uniform sampler2D env;
    uniform float deltaEnvTexture;
    
    varying vec3 oldPosition;
    varying vec3 newPosition;
    varying float waterDepth;
    varying float depth;
    varying vec2 vUv;
    
    // 空气折射率 / 水折射率
    const float eta = 0.7504;
    
    // 限制迭代次数以优化性能
    const int MAX_ITERATIONS = 20; // 比原版更少的迭代
    
    void main() {
      vUv = uv;
      
      vec4 waterInfo = texture2D(water, position.xy * 0.5 + 0.5);
      
      // 水面位置
      vec3 waterPosition = vec3(position.xy, position.z + waterInfo.r * 0.1);
      vec3 waterNormal = normalize(vec3(waterInfo.b, sqrt(1.0 - dot(waterInfo.ba, waterInfo.ba)), waterInfo.a)).xzy;
      
      // 初始位置
      oldPosition = waterPosition;
      
      // 计算屏幕空间坐标
      vec4 projectedWaterPosition = projectionMatrix * modelViewMatrix * vec4(waterPosition, 1.0);
      
      vec2 currentPosition = projectedWaterPosition.xy;
      vec2 coords = 0.5 + 0.5 * currentPosition;
      
      vec3 refracted = refract(light, waterNormal, eta);
      vec4 projectedRefractionVector = projectionMatrix * modelViewMatrix * vec4(refracted, 1.0);
      
      vec3 refractedDirection = projectedRefractionVector.xyz;
      
      waterDepth = 0.5 + 0.5 * projectedWaterPosition.z / projectedWaterPosition.w;
      float currentDepth = projectedWaterPosition.z;
      vec4 environment = texture2D(env, coords);
      
      // 简化的光线追踪
      float factor = deltaEnvTexture / max(length(refractedDirection.xy), 0.001);
      vec2 deltaDirection = refractedDirection.xy * factor;
      float deltaDepth = refractedDirection.z * factor;
      
      for (int i = 0; i < MAX_ITERATIONS; i++) {
        currentPosition += deltaDirection;
        currentDepth += deltaDepth;
        
        if (environment.w <= currentDepth) {
          break;
        }
        
        environment = texture2D(env, 0.5 + 0.5 * currentPosition);
      }
      
      newPosition = environment.xyz;
      
      vec4 projectedEnvPosition = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
      depth = 0.5 + 0.5 * projectedEnvPosition.z / projectedEnvPosition.w;
      
      gl_Position = projectedEnvPosition;
    }
  `;
  
  const fragmentShader = `
    // 大幅增强焦散可见性
    const float causticsFactor = 8.0; // 进一步增加强度
    const float baseIntensity = 1.2; // 提高基础亮度
    
    uniform vec3 lightColor;
    
    varying vec3 oldPosition;
    varying vec3 newPosition;
    varying float waterDepth;
    varying float depth;
    varying vec2 vUv;
    
    void main() {
      float causticsIntensity = 0.0;
      
      // 增强的焦散计算，确保图案可见
      if (depth >= waterDepth) {
        float oldArea = length(dFdx(oldPosition)) * length(dFdy(oldPosition));
        float newArea = length(dFdx(newPosition)) * length(dFdy(newPosition));
        
        float ratio;
        
        // 防止除零错误并增强对比度
        if (newArea == 0.0 || newArea < 0.001) {
          ratio = 50.0; // 设置合理的最大值
        } else {
          ratio = clamp(oldArea / newArea, 0.1, 50.0);
        }
        
        // 增强焦散强度并添加非线性增强
        causticsIntensity = causticsFactor * pow(ratio, 1.5);
      }
      
      // 增强基础颜色，确保与光源颜色一致且可见
      vec3 baseColor = lightColor * baseIntensity;
      
      // 组合效果 - 使用光源颜色确保一致性
       vec3 finalColor = baseColor + lightColor * causticsIntensity;
       
       // 确保最小可见度并增强对比度
       finalColor = max(finalColor, lightColor * 0.5);
       
       // 增加饱和度和亮度
       finalColor = clamp(finalColor * 1.5, 0.0, 2.0);
       
       gl_FragColor = vec4(finalColor, 0.9);
    }
  `;
  
  // 手动触发焦散投影计算
  const { parameters } = useProjectStore();
  
  const calculateCaustics = useCallback(async () => {
    console.log('calculateCaustics 函数被调用');
    const startTime = Date.now(); // 记录开始时间
    setIsCalculating(true);
    onCalculatingChange?.(true);
    
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
    setIsCalculating(true);
    setRenderProgress(0);
    setRenderStage('初始化渲染器...');
    setHasRendered(false);
    
    // 模拟异步处理以显示进度
    await new Promise(resolve => setTimeout(resolve, 100));
    
    setRenderProgress(10);
    setRenderStage('创建渲染器...');
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // 创建渲染器
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(1024, 1024);
    rendererRef.current = renderer;
    
    setRenderProgress(20);
    setRenderStage('创建渲染目标...');
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // 创建焦散渲染目标
    const causticsTarget = new THREE.WebGLRenderTarget(1024, 1024, {
      type: THREE.FloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter
    });
    causticsTargetRef.current = causticsTarget;
    
    setRenderProgress(30);
    setRenderStage('设置相机...');
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // 创建光源相机
    const lightCamera = new THREE.OrthographicCamera(-150, 150, 150, -150, 0.1, 1000);
    lightCamera.position.set(0, 0, 100);
    lightCamera.lookAt(0, 0, 0);
    lightCameraRef.current = lightCamera;
    
    setRenderProgress(40);
    setRenderStage('生成透镜几何体...');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 创建水面几何体
    const waterGeometry = new THREE.PlaneGeometry(300, 300, resolution, resolution);
    
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
          const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
          
          if (!gl) {
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
            const shader = gl.createShader(type)!;
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
              console.error('着色器编译错误:', gl.getShaderInfoLog(shader));
              gl.deleteShader(shader);
              return null;
            }
            return shader;
          };
          
          const vertexShader = compileShader(vertexShaderSource, gl.VERTEX_SHADER);
          const fragmentShader = compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER);
          
          if (!vertexShader || !fragmentShader) {
            throw new Error('着色器编译失败');
          }
          
          // 创建程序
          const program = gl.createProgram()!;
          gl.attachShader(program, vertexShader);
          gl.attachShader(program, fragmentShader);
          gl.linkProgram(program);
          
          if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('程序链接错误:', gl.getProgramInfoLog(program));
            throw new Error('着色器程序链接失败');
          }
          
          gl.useProgram(program);
          
          // 设置画布大小
          canvas.width = resolution;
          canvas.height = resolution;
          gl.viewport(0, 0, resolution, resolution);
          
          // 创建顶点缓冲区（全屏四边形）
          const positions = new Float32Array([
            -1, -1,
             1, -1,
            -1,  1,
             1,  1
          ]);
          
          const positionBuffer = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
          gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
          
          const positionLocation = gl.getAttribLocation(program, 'a_position');
          gl.enableVertexAttribArray(positionLocation);
          gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
          
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
          const vertexTexture = gl.createTexture();
          gl.bindTexture(gl.TEXTURE_2D, vertexTexture);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, textureSize, textureSize, 0, gl.RGBA, gl.FLOAT, vertexData);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          
          // 设置uniform变量
          gl.uniform1i(gl.getUniformLocation(program, 'u_vertexData'), 0);
          gl.uniform1f(gl.getUniformLocation(program, 'u_vertexCount'), vertexCount);
          gl.uniform1f(gl.getUniformLocation(program, 'u_minZ'), minZ);
          gl.uniform1f(gl.getUniformLocation(program, 'u_maxZ'), maxZ);
          gl.uniform1f(gl.getUniformLocation(program, 'u_lensWidth'), lensWidth);
          gl.uniform1f(gl.getUniformLocation(program, 'u_lensHeight'), lensHeight);
          gl.uniform1f(gl.getUniformLocation(program, 'u_resolution'), resolution);
          
          setRenderProgress(70);
          setRenderStage('GPU渲染中...');
          
          // 执行GPU计算
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
          
          setRenderProgress(80);
          setRenderStage('读取GPU计算结果...');
          
          // 读取结果
          const pixels = new Uint8Array(resolution * resolution * 4);
          gl.readPixels(0, 0, resolution, resolution, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
          
          // 复制到ImageData
          for (let i = 0; i < pixels.length; i++) {
            imageData.data[i] = pixels[i];
          }
          
          // 清理GPU资源
          gl.deleteTexture(vertexTexture);
          gl.deleteBuffer(positionBuffer);
          gl.deleteShader(vertexShader);
          gl.deleteShader(fragmentShader);
          gl.deleteProgram(program);
          
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
        
        console.log('CPU高度图生成完成');
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
    
    // 获取光源颜色 - 确保颜色鲜明可见
    const lightColor = lightSource?.color ? 
      new THREE.Vector3(
        Math.max(lightSource.color.r || 1, 0.8), 
        Math.max(lightSource.color.g || 1, 0.8), 
        Math.max(lightSource.color.b || 1, 0.8)
      ) :
      new THREE.Vector3(1.0, 1.0, 0.8); // 默认暖白光，更容易看见
    
    setRenderProgress(80);
    setRenderStage('编译着色器...');
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // 创建焦散材质 - 优化混合模式和透明度确保最佳可见性
    const causticsMaterial = new THREE.ShaderMaterial({
      uniforms: {
        light: { value: new THREE.Vector3(0, 0, 100) },
        lightColor: { value: lightColor },
        water: { value: waterTexture },
        env: { value: null },
        deltaEnvTexture: { value: 0.01 }
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending, // 使用加法混合确保焦散效果可见
      side: THREE.DoubleSide,
      depthWrite: false, // 禁用深度写入避免遮挡
      depthTest: false, // 禁用深度测试确保渲染
      opacity: 0.8
    });
    
    causticsMaterial.extensions = {
      derivatives: true
    };
    
    setRenderProgress(90);
    setRenderStage('创建水面网格...');
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // 创建水面网格
    const waterMesh = new THREE.Mesh(waterGeometry, causticsMaterial);
    waterMeshRef.current = waterMesh;
    
    setRenderProgress(95);
    setRenderStage('执行焦散渲染...');
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // 添加调试信息
    console.log('焦散渲染调试信息:', {
      lightColor: lightColor,
      materialUniforms: causticsMaterial.uniforms,
      waterTextureSize: `${waterTexture.image.width}x${waterTexture.image.height}`,
      blendingMode: causticsMaterial.blending,
      transparent: causticsMaterial.transparent
    });
    
    // 渲染焦散
    const scene = new THREE.Scene();
    scene.add(waterMesh);
    
    // 设置光源相机位置
    lightCamera.position.set(0, 0, 100);
    lightCamera.lookAt(0, 0, 0);
    lightCamera.updateMatrixWorld();
    
    console.log('光源相机设置:', {
      position: lightCamera.position,
      target: new THREE.Vector3(0, 0, 0)
    });
    
    renderer.setRenderTarget(causticsTarget);
    renderer.setClearColor(new THREE.Color(0, 0, 0), 0);
    renderer.clear();
    renderer.render(scene, lightCamera);
    renderer.setRenderTarget(null);
    
    setRenderProgress(100);
    setRenderStage('渲染完成!');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 设置焦散纹理并添加调试信息
    const texture = causticsTarget.texture;
    texture.needsUpdate = true;
    console.log('焦散纹理创建完成:', {
      width: texture.image?.width || 'unknown',
      height: texture.image?.height || 'unknown',
      format: texture.format,
      type: texture.type
    });
    
    setCausticsTexture(texture);
    setHasRendered(true);
    setIsCalculating(false);
    onCalculatingChange?.(false);
    
    console.log('焦散计算完成，纹理已设置');
    
    // 将渲染结果保存到store
    try {
      // 创建一个临时canvas来获取纹理的图像数据
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 512;
      canvas.height = 512;
      
      // 从WebGL纹理获取图像数据
      const tempRenderer = new THREE.WebGLRenderer({ preserveDrawingBuffer: true });
      tempRenderer.setSize(512, 512);
      const tempScene = new THREE.Scene();
      const tempCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
      
      // 创建一个平面来显示纹理
      const planeGeometry = new THREE.PlaneGeometry(2, 2);
      const planeMaterial = new THREE.MeshBasicMaterial({ map: texture });
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
      waterGeometry.dispose();
    } catch (error) {
      console.error('焦散计算过程中发生错误:', error);
      setRenderStage('计算失败: ' + (error as Error).message);
      setIsCalculating(false);
      onCalculatingChange?.(false);
    }
  }, []); // 移除所有依赖，避免参数变化时重复创建函数
  
  // 使用useRef避免函数引用变化导致的重复触发
  const calculateCausticsRef = useRef(calculateCaustics);
  calculateCausticsRef.current = calculateCaustics;
  
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
            opacity={0.8}
            blending={THREE.AdditiveBlending}
            side={THREE.FrontSide}
          />
        </mesh>
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
                
                {/* 基础墙面 - 始终显示，修正z轴方向 */}
                {viewerSettings.showWall && (
                  <>
                    <mesh position={[0, 0, -viewerSettings.wallDistance]} receiveShadow>
                      <planeGeometry args={[Math.max((parameters.lensWidth || 50) * 4, 200), Math.max((parameters.lensHeight || 50) * 4, 150)]} />
                      <meshLambertMaterial 
                        color={viewerSettings.showCaustics ? "#f8f8f8" : "#e0e0e0"} 
                        transparent 
                        opacity={viewerSettings.showCaustics ? 0.7 : 0.9} 
                        side={THREE.DoubleSide} 
                      />
                    </mesh>
                    
                    {/* 投影光源 - 位置在透镜前方（正Z轴），照射方向指向墙面（负Z轴） */}
                    <directionalLight
                      position={[0, 0, viewerSettings.wallDistance * 0.5]}
                      target-position={[0, 0, -viewerSettings.wallDistance]}
                      intensity={0.4}
                      color="#ffffff"
                    />
                  </>
                )}
                
                {/* 焦散投影效果 - 叠加在基础墙面上，修正z轴方向 */}
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
                           // 确保点光源与透镜中心在XY平面对齐，Z轴保持距离
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
    </div>
  );
};