import { useMemo } from 'react';
import { isWebGLAvailable } from '../lib/webgl';

interface WebGLGateProps {
  label: string;
  summary: string;
  forceFallback?: boolean;
  children: React.ReactNode;
}

export function WebGLGate({ label, summary, forceFallback = false, children }: WebGLGateProps) {
  const available = useMemo(() => isWebGLAvailable(), []);
  if (forceFallback || !available) {
    return (
      <div className="webgl-fallback" data-testid="webgl-fallback" role="img" aria-label={label}>
        <strong>간단 모드로 표시합니다</strong>
        <p>{summary}</p>
        <p>이 화면의 수치와 설명은 그대로 이용할 수 있습니다.</p>
      </div>
    );
  }
  return <>{children}</>;
}
