import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

interface AtomLabelProps {
  symbol: string;
  color: string;
  scale: number;
}

export function AtomLabel({ symbol, color, scale }: AtomLabelProps) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.clearRect(0, 0, 128, 128);
    context.font = '700 82px "Avenir Next", Avenir, "Apple SD Gothic Neo", sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.lineJoin = 'round';
    context.lineWidth = 12;
    context.strokeStyle = 'rgba(18, 23, 15, 0.62)';
    context.strokeText(symbol, 64, 68);
    context.fillStyle = color;
    context.fillText(symbol, 64, 68);
    const canvasTexture = new THREE.CanvasTexture(canvas);
    canvasTexture.colorSpace = THREE.SRGBColorSpace;
    canvasTexture.minFilter = THREE.LinearFilter;
    canvasTexture.magFilter = THREE.LinearFilter;
    canvasTexture.needsUpdate = true;
    return canvasTexture;
  }, [symbol, color]);

  useEffect(() => () => texture?.dispose(), [texture]);

  if (!texture) return null;

  return (
    <sprite position={[0, 0, 0]} scale={[scale, scale, scale]} renderOrder={10}>
      <spriteMaterial
        map={texture}
        transparent
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </sprite>
  );
}
