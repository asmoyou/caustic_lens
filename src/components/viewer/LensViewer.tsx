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
const LensMesh: React.FC<{ settings: ViewerSettings }> = ({ settings }) => {
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
      <mesh position={[25, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 50]} rotation={[0, 0, Math.PI / 2]} />
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
      <mesh position={[0, 0, 25]}>
        <cylinderGeometry args={[0.2, 0.2, 50]} rotation={[Math.PI / 2, 0, 0]} />
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

// 光照设置
const LightingSetup: React.FC<{ intensity: number }> = ({ intensity }) => {
  return (
    <>
      <ambientLight intensity={0.4 * intensity} />
      <directionalLight 
        position={[10, 10, 5]} 
        intensity={0.8 * intensity}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <pointLight position={[-10, -10, -5]} intensity={0.3 * intensity} />
      <hemisphereLight skyColor="#87CEEB" groundColor="#362d1d" intensity={0.2 * intensity} />
    </>
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
}> = ({ show, distance, intensity, lensWidth, lensHeight, geometry, targetShape }) => {
  const [causticPoints, setCausticPoints] = useState<any[]>([]);
  const wallRef = useRef<THREE.Mesh>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  
  if (!show) return null;
  
  // 墙面尺寸应该比透镜尺寸大，至少是透镜尺寸的4倍
  const wallWidth = useMemo(() => Math.max(lensWidth * 4, 200), [lensWidth]); // 最小200mm
  const wallHeight = useMemo(() => Math.max(lensHeight * 4, 150), [lensHeight]); // 最小150mm
  
  // 计算焦散投影
  useEffect(() => {
    if (!geometry || !targetShape) return;
    
    // 简化的焦散计算 - 基于透镜几何体和目标形状
    const points: any[] = [];
    const rayCount = 500; // 减少光线数量以提高性能
    
    for (let i = 0; i < rayCount; i++) {
      // 生成随机入射光线
      const x = (Math.random() - 0.5) * lensWidth;
      const y = (Math.random() - 0.5) * lensHeight;
      
      // 简化的折射计算
      const refractedX = x * (1 + Math.random() * 0.2 - 0.1);
      const refractedY = y * (1 + Math.random() * 0.2 - 0.1);
      
      // 投影到墙面
      const projectedX = refractedX * (distance / 100);
      const projectedY = refractedY * (distance / 100);
      
      // 检查是否在墙面范围内
      const maxWallWidth = Math.max(lensWidth * 4, 200);
      const maxWallHeight = Math.max(lensHeight * 4, 150);
      if (Math.abs(projectedX) < maxWallWidth/2 && Math.abs(projectedY) < maxWallHeight/2) {
        points.push({
          x: projectedX,
          y: projectedY,
          intensity: Math.random() * 0.5 + 0.5
        });
      }
    }
    
    setCausticPoints(points);
  }, [geometry, targetShape, distance, lensWidth, lensHeight]);
  
  // 创建焦散纹理
  useEffect(() => {
    if (causticPoints.length === 0) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = 512;
    canvas.height = 512;
    
    // 清除画布 - 使用更深的背景色以便看到投影效果
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 绘制焦散点
    causticPoints.forEach(point => {
      const canvasX = (point.x / wallWidth + 0.5) * canvas.width;
      const canvasY = (1 - (point.y / wallHeight + 0.5)) * canvas.height;
      
      const gradient = ctx.createRadialGradient(canvasX, canvasY, 0, canvasX, canvasY, 12);
      gradient.addColorStop(0, `rgba(255, 255, 0, ${point.intensity * intensity * 0.8})`);
      gradient.addColorStop(0.5, `rgba(255, 200, 0, ${point.intensity * intensity * 0.4})`);
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(canvasX, canvasY, 12, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // 创建纹理
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    textureRef.current = texture;
  }, [causticPoints, intensity, lensWidth, lensHeight]);
  
  return (
    <>
      {/* 墙面 */}
      <mesh 
        ref={wallRef}
        position={[0, 0, distance]}
        receiveShadow
      >
        <planeGeometry args={[wallWidth / 10, wallHeight / 10]} />
        <meshLambertMaterial 
          map={textureRef.current}
          transparent 
          opacity={0.9}
        />
      </mesh>
      
      {/* 环境光照 */}
      <directionalLight
        position={[0, 0, -distance/2]}
        target-position={[0, 0, distance]}
        intensity={intensity * 0.5}
        color="#ffffff"
      />
      
      {/* 焦散光点 - 3D效果 */}
      {causticPoints.slice(0, 50).map((point, i) => (
        <pointLight
          key={i}
          position={[point.x / 10, point.y / 10, distance - 0.5]}
          intensity={point.intensity * intensity * 0.3}
          distance={2}
          decay={2}
          color="#ffffff"
        />
      ))}
      
      {/* 光源位置可视化 */}
      <mesh position={[0, 0, -50]}>
        <sphereGeometry args={[2, 16, 16]} />
        <meshBasicMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={0.5} />
      </mesh>
      
      {/* 光源标签 */}
      <Html position={[0, 5, -50]}>
        <div style={{
          background: 'rgba(255,255,0,0.8)',
          color: 'black',
          padding: '2px 6px',
          borderRadius: '3px',
          fontSize: '10px',
          whiteSpace: 'nowrap',
          fontWeight: 'bold'
        }}>
          光源
        </div>
      </Html>
      
      {/* 墙面标签 */}
      <Html position={[0, wallHeight/20 + 1, distance]}>
        <div style={{
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          whiteSpace: 'nowrap'
        }}>
          焦散投影墙面 ({distance}mm) - {causticPoints.length} 光点
        </div>
      </Html>
    </>
  );
};

// 墙面组件 - 兼容旧版本
const Wall: React.FC<{ show: boolean; distance: number; intensity: number; lensWidth: number; lensHeight: number }> = ({ show, distance, intensity, lensWidth, lensHeight }) => {
  const { geometry, targetShape } = useProjectStore();
  
  return (
    <CausticProjection
      show={show}
      distance={distance}
      intensity={intensity}
      lensWidth={lensWidth}
      lensHeight={lensHeight}
      geometry={geometry}
      targetShape={targetShape || []}
    />
  );
};

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
  const { geometry, isProcessing, currentImage, parameters } = useProjectStore();
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

  // 监听参数变化，更新材料类型
  useEffect(() => {
    if (parameters.material) {
      setViewerSettings(prev => ({
        ...prev,
        materialType: parameters.material as any
      }));
    }
  }, [parameters.material]);

  // 监听目标距离变化，更新墙面距离
  useEffect(() => {
    if (parameters.targetDistance) {
      setViewerSettings(prev => ({
        ...prev,
        wallDistance: parameters.targetDistance
      }));
    }
  }, [parameters.targetDistance]);

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      {currentImage ? (
        <div style={{ height: '100%' }}>
          {geometry ? (
            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
              <WebGLErrorBoundary>
                <Canvas
                  style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                  camera={{ position: [0, 0, 100], fov: 50 }}
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
                <LightingSetup intensity={viewerSettings.lightIntensity} />
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
                <LensMesh settings={viewerSettings} />
                {/* 简化的投影墙面 */}
                {viewerSettings.showWall && (
                  <>
                    <mesh position={[0, 0, viewerSettings.wallDistance]} receiveShadow>
                      <planeGeometry args={[Math.max((parameters.lensWidth || 50) * 4, 200) / 10, Math.max((parameters.lensHeight || 50) * 4, 150) / 10]} />
                      <meshLambertMaterial color="#e0e0e0" transparent opacity={0.9} />
                    </mesh>
                    
                    {/* 投影光源 */}
                    <directionalLight
                      position={[0, 0, -viewerSettings.wallDistance/2]}
                      target-position={[0, 0, viewerSettings.wallDistance]}
                      intensity={0.4}
                      color="#ffffff"
                    />
                  </>
                )}
                <Environment preset="sunset" background={false} />
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
                          max={50}
                          value={viewerSettings.wallDistance}
                          onChange={(value) => setViewerSettings(prev => ({ ...prev, wallDistance: value }))}
                          size="small"
                        />
                      </div>
                    )}
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