import { ContactShadows, Line, OrbitControls } from '@react-three/drei';
import { Canvas, type ThreeEvent, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { findSnapHost } from '../chem/bondRules';
import { targetRelativePosition } from '../chem/targetGeometry';
import type { Atom, Vec3 } from '../chem/types';
import { useBuildStore } from '../stores/buildStore';
import { MoleculeModel } from './MoleculeModel';
import { SceneLights } from './SceneLights';
import { StagePedestal } from './StagePedestal';

interface DragState {
  id: string;
  plane: THREE.Plane;
  offset: THREE.Vector3;
  startX: number;
  startY: number;
  moved: boolean;
}

export function BuildScene() {
  return (
    <Canvas
      dpr={[1, 1.8]}
      camera={{ position: [0, 1.9, 6], fov: 42 }}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => {
        gl.domElement.style.touchAction = 'none';
      }}
      role="img"
      aria-label="분자 조립 3D 실험대"
    >
      <SceneLights />
      <BuildSceneContents />
      <StagePedestal />
      <ContactShadows
        position={[0, -2.08, 0]}
        opacity={0.34}
        scale={7}
        blur={2.6}
        far={4}
        color="#172015"
      />
    </Canvas>
  );
}

function BuildSceneContents() {
  const atoms = useBuildStore((state) => state.atoms);
  const bonds = useBuildStore((state) => state.bonds);
  const selectedAtomId = useBuildStore((state) => state.selectedAtomId);
  const measureTargetId = useBuildStore((state) => state.measureTargetId);
  const showAngles = useBuildStore((state) => state.showAngles);
  const showPolarity = useBuildStore((state) => state.showPolarity);
  const showLonePairs = useBuildStore((state) => state.showLonePairs);
  const dragMode = useBuildStore((state) => state.dragMode);
  const targetId = useBuildStore((state) => state.targetId);
  const dragging = useBuildStore((state) => state.dragging);
  const [preview, setPreview] = useState<{ position: Vec3; hostId: string } | null>(null);
  const selectAtom = useBuildStore((state) => state.selectAtom);
  const moveAtom = useBuildStore((state) => state.moveAtom);
  const snapDraggedAtom = useBuildStore((state) => state.snapDraggedAtom);
  const setDragging = useBuildStore((state) => state.setDragging);
  const { camera, gl } = useThree();
  const dragRef = useRef<DragState | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const pointer = useMemo(() => new THREE.Vector2(), []);

  useEffect(
    () => () => {
      cleanupRef.current?.();
    },
    [],
  );

  const handleAtomPointerDown = useCallback(
    (atom: Atom, event: ThreeEvent<PointerEvent>) => {
      selectAtom(atom.id);
      if (dragMode === 'rotate') return;
      const degree = bonds.filter((bond) => bond.a === atom.id || bond.b === atom.id).length;
      if (degree > 0) return;
      event.stopPropagation();
      const normal = new THREE.Vector3();
      camera.getWorldDirection(normal);
      const atomPosition = new THREE.Vector3(...atom.position);
      const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, atomPosition);
      const hit = new THREE.Vector3();
      if (!event.ray.intersectPlane(plane, hit)) return;
      dragRef.current = {
        id: atom.id,
        plane,
        offset: atomPosition.clone().sub(hit),
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
      };
      setDragging(true);
      gl.domElement.style.cursor = 'grabbing';

      const handleMove = (native: PointerEvent) => {
        const drag = dragRef.current;
        if (!drag) return;
        if (Math.hypot(native.clientX - drag.startX, native.clientY - drag.startY) > 4) {
          drag.moved = true;
        }
        const rect = gl.domElement.getBoundingClientRect();
        pointer.x = ((native.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((native.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const intersection = new THREE.Vector3();
        if (!raycaster.ray.intersectPlane(drag.plane, intersection)) return;
        intersection.add(drag.offset);
        const position: Vec3 = [intersection.x, intersection.y, intersection.z];
        const store = useBuildStore.getState();
        const dragged = store.atoms.find((candidate) => candidate.id === drag.id);
        if (dragged) {
          const staged = { ...dragged, position };
          const snap = findSnapHost(staged, store.atoms, store.bonds);
          if (snap) {
            const targetGeometry = targetRelativePosition(store.targetId, staged, snap.host);
            setPreview({
              position: targetGeometry?.position ?? snap.position,
              hostId: snap.host.id,
            });
          } else {
            setPreview(null);
          }
        }
        moveAtom(drag.id, position);
      };

      const handleUp = () => {
        cleanupRef.current?.();
        cleanupRef.current = null;
        const drag = dragRef.current;
        dragRef.current = null;
        setPreview(null);
        gl.domElement.style.cursor = '';
        if (!drag) {
          setDragging(false);
          return;
        }
        if (drag.moved) snapDraggedAtom(drag.id);
        else setDragging(false);
      };

      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
      window.addEventListener('pointercancel', handleUp);
      cleanupRef.current = () => {
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
        window.removeEventListener('pointercancel', handleUp);
      };
    },
    [
      atoms,
      bonds,
      camera,
      dragMode,
      gl,
      moveAtom,
      pointer,
      raycaster,
      selectAtom,
      setDragging,
      snapDraggedAtom,
      targetId,
    ],
  );

  return (
    <>
      <MoleculeModel
        atoms={atoms}
        bonds={bonds}
        selectedAtomId={selectedAtomId}
        measureFromId={selectedAtomId}
        measureToId={measureTargetId}
        showAngles={showAngles}
        showPolarity={showPolarity}
        showLonePairs={showLonePairs}
        interactive
        allowDrag={dragMode === 'move'}
        onAtomPointerDown={handleAtomPointerDown}
      />
      {preview
        ? (() => {
            const host = atoms.find((atom) => atom.id === preview.hostId);
            if (!host) return null;
            return (
              <group>
                <mesh position={preview.position}>
                  <sphereGeometry args={[0.22, 20, 14]} />
                  <meshBasicMaterial color="#e0b866" transparent opacity={0.42} depthWrite={false} />
                </mesh>
                <Line
                  points={[host.position, preview.position]}
                  color="#e0b866"
                  lineWidth={2}
                  dashed
                  dashSize={0.14}
                  gapSize={0.1}
                  transparent
                  opacity={0.8}
                />
              </group>
            );
          })()
        : null}
      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={4.2}
        maxDistance={11}
        target={[0, 0.3, 0]}
        enabled={!dragging}
      />
    </>
  );
}
