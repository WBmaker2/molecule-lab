export function isWebGLAvailable(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const context =
      canvas.getContext('webgl2') ?? canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl');
    if (context && 'getExtension' in context) {
      const loseExtension = context.getExtension('WEBGL_lose_context');
      loseExtension?.loseContext();
    }
    return context !== null;
  } catch {
    return false;
  }
}
