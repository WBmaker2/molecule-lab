import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

interface WorldLabelProps {
  text: string;
  color: string;
  width?: number;
  height?: number;
}

export function WorldLabel({ text, color, width = 0.82, height = 0.3 }: WorldLabelProps) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 144;
    const context = canvas.getContext('2d');
    if (!context) return null;
    const radius = 44;
    context.beginPath();
    context.roundRect(6, 6, 372, 132, radius);
    context.fillStyle = 'rgba(24, 32, 21, 0.9)';
    context.fill();
    context.lineWidth = 3;
    context.strokeStyle = 'rgba(239, 225, 194, 0.3)';
    context.stroke();
    context.font = '700 66px "Avenir Next", Avenir, "Apple SD Gothic Neo", sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = color;
    context.fillText(text, 192, 75);
    const canvasTexture = new THREE.CanvasTexture(canvas);
    canvasTexture.colorSpace = THREE.SRGBColorSpace;
    canvasTexture.minFilter = THREE.LinearFilter;
    canvasTexture.magFilter = THREE.LinearFilter;
    canvasTexture.needsUpdate = true;
    return canvasTexture;
  }, [text, color]);

  useEffect(() => () => texture?.dispose(), [texture]);

  if (!texture) return null;

  return (
    <sprite scale={[width, height, 1]} renderOrder={12}>
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
