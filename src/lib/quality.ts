export type RenderQuality = 'high' | 'low';

export function decideQuality(current: RenderQuality, fps: number): RenderQuality {
  if (!Number.isFinite(fps) || fps <= 0) return current;
  if (current === 'high' && fps < 35) return 'low';
  if (current === 'low' && fps > 55) return 'high';
  return current;
}
