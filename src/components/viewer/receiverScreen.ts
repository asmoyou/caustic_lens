import { BoxGeometry, Group, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import type { Texture } from 'three';

export function createReceiverScreen(width: number, texture: Texture | null) {
  const object = new Group();
  const surfaceGeometry = new PlaneGeometry(width, width).rotateY(Math.PI);
  const surfaceMaterial = new MeshBasicMaterial({ map: texture, color: texture ? '#ffffff' : '#060708', toneMapped: false });
  const surface = new Mesh(surfaceGeometry, surfaceMaterial);
  surface.name = 'caustic-screen';
  surface.userData.projectionReady = !!texture;
  const backingGeometry = new BoxGeometry(width + 6, width + 6, 1);
  const backingMaterial = new MeshBasicMaterial({ color: '#343639' });
  const backing = new Mesh(backingGeometry, backingMaterial);
  backing.name = 'receiver-backing';
  // The opaque support is beyond the receiving plane along the light direction.
  backing.position.z = 0.6;
  object.add(surface, backing);
  return {
    object,
    dispose() {
      surfaceGeometry.dispose();
      surfaceMaterial.dispose();
      backingGeometry.dispose();
      backingMaterial.dispose();
    },
  };
}
