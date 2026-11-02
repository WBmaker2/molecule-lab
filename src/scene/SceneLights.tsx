export function SceneLights() {
  return (
    <>
      <hemisphereLight args={['#f5ead2', '#1d2519', 1.35]} />
      <directionalLight position={[4, 6, 5]} intensity={2.3} color="#ffe9c8" />
      <directionalLight position={[-5, 2, -3]} intensity={1.2} color="#b6c8c5" />
      <pointLight position={[0, -2.5, 2.4]} intensity={8} distance={11} color="#9b6e42" />
    </>
  );
}
