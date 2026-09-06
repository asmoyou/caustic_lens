import { useEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { Edges, Environment, Lightformer, OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Box3, CanvasTexture, DoubleSide, LinearFilter, MathUtils, SRGBColorSpace, Vector3 } from 'three';
import type { LensGeometry } from '../../types';
import type { ProjectionPreview } from './useProjectionPreview';
import { toBufferGeometry } from '../../utils/geometry';
import { createReceiverScreen } from './receiverScreen';

export type ViewerMode = 'optical' | 'model' | 'projection';
interface SceneProps {
  geometry: LensGeometry;
  preview: ProjectionPreview | null;
  mode: ViewerMode;
  distance: number;
  refractiveIndex: number;
  wireframe: boolean;
  showGrid: boolean;
  showRays: boolean;
  autoRotate: boolean;
  resetKey: number;
}

function CameraRig({ bounds, mode, autoRotate, resetKey }: {
  bounds: Box3; mode: ViewerMode; autoRotate: boolean; resetKey: number;
}) {
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera, size } = useThree();
  useEffect(() => {
    const center = bounds.getCenter(new Vector3());
    const direction = (mode === 'optical' ? new Vector3(-1.35, 0.48, -1) :
      mode === 'model' ? new Vector3(0.55, 0.25, 1) : new Vector3(0, 0, -1)).normalize();
    const right = new Vector3(0, 1, 0).cross(direction).normalize();
    const up = direction.clone().cross(right).normalize();
    const tanV = Math.tan(MathUtils.degToRad(40) / 2);
    const tanH = tanV * size.width / size.height;
    let distance = 0;
    for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
      const offset = new Vector3(x, y, z).sub(center);
      distance = Math.max(distance, Math.abs(offset.dot(right)) / tanH + offset.dot(direction),
        Math.abs(offset.dot(up)) / tanV + offset.dot(direction));
    }
    camera.position.copy(center).addScaledVector(direction, distance * (mode === 'projection' ? 1.12 : 1.14));
    camera.near = Math.max(0.5, distance / 100);
    camera.far = Math.max(5000, distance * 20);
    camera.updateProjectionMatrix();
    controls.current?.target.copy(center);
    controls.current?.update();
  }, [camera, bounds, mode, resetKey, size.width, size.height]);
  return <OrbitControls ref={controls} makeDefault autoRotate={autoRotate && mode !== 'projection'} autoRotateSpeed={0.7}
    minDistance={30} maxDistance={10000} enableDamping enableRotate={mode !== 'projection'} />;
}

export function OpticalScene({ geometry, preview, mode, distance, refractiveIndex, wireframe,
  showGrid, showRays, autoRotate, resetKey }: SceneProps) {
  const buffer = useMemo(() => toBufferGeometry(geometry), [geometry]);
  useEffect(() => () => buffer.dispose(), [buffer]);
  const box = buffer.boundingBox!;
  const dimensions = box.getSize(new Vector3());
  const center = box.getCenter(new Vector3());
  const screenWidth = preview?.result.screenWidth ?? Math.max(dimensions.x, dimensions.y) * 1.3;
  const displayDistance = Math.min(distance, Math.max(dimensions.x, dimensions.y) * 2.1);
  const screenZ = box.max.z + displayDistance;
  const sourceZ = box.min.z - 75;
  const texture = useMemo(() => {
    if (!preview) return null;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = preview.result.resolution;
    const ctx = canvas.getContext('2d')!;
    const image = ctx.createImageData(canvas.width, canvas.height);
    image.data.set(preview.result.pixels);
    ctx.putImageData(image, 0, 0);
    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    map.minFilter = map.magFilter = LinearFilter;
    return map;
  }, [preview]);
  useEffect(() => () => texture?.dispose(), [texture]);
  const receiver = useMemo(() => createReceiverScreen(screenWidth, texture), [screenWidth, texture]);
  useEffect(() => () => receiver.dispose(), [receiver]);
  const framing = useMemo(() => {
    if (mode === 'model') return box.clone().expandByScalar(3);
    const half = screenWidth / 2 + 5;
    return new Box3(new Vector3(center.x - half, center.y - half, mode === 'projection' ? screenZ - 1 : sourceZ - 8),
      new Vector3(center.x + half, center.y + half, screenZ + 1));
  }, [mode, box, center.x, center.y, screenWidth, screenZ, sourceZ]);
  const rayPositions = useMemo(() => {
    const positions: number[] = [];
    for (const path of preview?.result.rayPaths ?? []) {
      const { entry, exit, target } = path;
      positions.push(entry.x, entry.y, sourceZ + 1, entry.x, entry.y, entry.z,
        entry.x, entry.y, entry.z, exit.x, exit.y, exit.z,
        exit.x, exit.y, exit.z, target.x, target.y, screenZ);
    }
    return new Float32Array(positions);
  }, [preview, sourceZ, screenZ]);

  return <>
    <color attach="background" args={['#08090b']} />
    <ambientLight intensity={0.35} />
    <directionalLight position={[-80, 180, 150]} intensity={3} color="#ffffff" />
    <directionalLight position={[120, 0, -100]} intensity={2} color="#ffffff" />
    <Environment resolution={128} frames={1}>
      <Lightformer position={[0, 5, -5]} scale={[10, 2, 1]} intensity={4} color="#ffffff" />
      <Lightformer position={[-5, 0, 2]} rotation={[0, Math.PI / 2, 0]} scale={[2, 8, 1]} intensity={3} color="#ffffff" />
      <Lightformer position={[5, 2, 4]} rotation={[0, -Math.PI / 2, 0]} scale={[1, 8, 1]} intensity={2} color="#ffffff" />
    </Environment>
    {mode !== 'projection' && <mesh geometry={buffer}>
      <meshPhysicalMaterial color="#ffffff" transmission={wireframe ? 0 : 0.98} thickness={dimensions.z}
        ior={refractiveIndex} roughness={0.055} metalness={0} clearcoat={1} envMapIntensity={1.2}
        wireframe={wireframe} side={DoubleSide} />
      {!wireframe && <Edges threshold={35} color="#c5ced6" transparent opacity={0.32} />}
    </mesh>}
    {mode !== 'model' && <primitive object={receiver.object} position={[center.x, center.y, screenZ]} />}
    {mode === 'optical' && <>
      <group position={[center.x, center.y, sourceZ]}>
        <mesh position={[0, 0, -4]}><boxGeometry args={[dimensions.x + 8, dimensions.y + 8, 8]} />
          <meshStandardMaterial color="#25272a" metalness={0.5} roughness={0.4} /></mesh>
        <mesh position={[0, 0, 0.1]}><planeGeometry args={[dimensions.x - 4, dimensions.y - 4]} />
          <meshBasicMaterial color="#eceeef" side={DoubleSide} toneMapped={false} /></mesh>
      </group>
      {showRays && rayPositions.length > 0 && <lineSegments>
        <bufferGeometry><bufferAttribute attach="attributes-position" args={[rayPositions, 3]} /></bufferGeometry>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.16} depthWrite={false} toneMapped={false} />
      </lineSegments>}
    </>}
    {showGrid && mode !== 'projection' && <gridHelper args={[600, 30, '#35363a', '#202125']}
      position={[center.x, Math.min(box.min.y, center.y - screenWidth / 2) - 8, (sourceZ + screenZ) / 2]} />}
    <CameraRig bounds={framing} mode={mode} autoRotate={autoRotate} resetKey={resetKey} />
  </>;
}
