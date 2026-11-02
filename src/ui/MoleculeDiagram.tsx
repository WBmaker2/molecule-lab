import { getElement } from '../chem/elements';
import type { MoleculeData } from '../chem/types';

interface MoleculeDiagramProps {
  molecule: MoleculeData;
  className?: string;
}

export function MoleculeDiagram({ molecule, className }: MoleculeDiagramProps) {
  const width = 220;
  const height = 132;
  const padding = 18;
  const projected = molecule.atoms.map((atom) => ({
    x: atom.position[0] + atom.position[2] * 0.42,
    y: -(atom.position[1] + atom.position[2] * 0.18),
  }));
  const xs = projected.map((point) => point.x);
  const ys = projected.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(0.001, maxX - minX);
  const spanY = Math.max(0.001, maxY - minY);
  const scale = Math.min(56, (width - padding * 2) / spanX, (height - padding * 2) / spanY);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const points = projected.map((point) => ({
    x: width / 2 + (point.x - centerX) * scale,
    y: height / 2 + (point.y - centerY) * scale,
  }));

  return (
    <svg
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${molecule.nameKo} 분자 구조 도해`}
    >
      <defs>
        <radialGradient id={`diagram-glow-${molecule.id}`} cx="50%" cy="42%" r="62%">
          <stop offset="0%" stopColor="#44503b" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#2b3426" stopOpacity="0.12" />
        </radialGradient>
      </defs>
      <rect
        x="1"
        y="1"
        width={width - 2}
        height={height - 2}
        rx="16"
        fill={`url(#diagram-glow-${molecule.id})`}
        stroke="rgba(214, 198, 164, 0.18)"
      />
      {molecule.bonds.map((bond, index) => {
        const first = points[bond.a];
        const second = points[bond.b];
        if (!first || !second) return null;
        const dx = second.x - first.x;
        const dy = second.y - first.y;
        const length = Math.hypot(dx, dy) || 1;
        const px = (-dy / length) * 2.4;
        const py = (dx / length) * 2.4;
        const offsets = bond.order === 3 ? [-1, 0, 1] : bond.order === 2 ? [-1, 1] : [0];
        return (
          <g key={index}>
            {offsets.map((offset, offsetIndex) => (
              <line
                key={offsetIndex}
                x1={first.x + px * offset}
                y1={first.y + py * offset}
                x2={second.x + px * offset}
                y2={second.y + py * offset}
                stroke={bond.ionic ? '#b6a77f' : '#a08f70'}
                strokeWidth={bond.order === 1 ? 2.4 : 1.6}
                strokeLinecap="round"
                strokeDasharray={bond.ionic ? '4 4' : undefined}
                opacity={bond.ionic ? 0.8 : 0.9}
              />
            ))}
          </g>
        );
      })}
      {molecule.atoms.map((atom, index) => {
        const element = getElement(atom.element);
        const point = points[index];
        if (!point) return null;
        const radius = Math.max(6.5, Math.min(13.5, element.radius * scale * 0.58));
        const textColor = atom.element === 'H' || atom.element === 'Ag' ? '#2b2920' : '#fff9ec';
        return (
          <g key={index}>
            <circle
              cx={point.x}
              cy={point.y}
              r={radius + 2.5}
              fill={element.color}
              opacity="0.12"
            />
            <circle
              cx={point.x}
              cy={point.y}
              r={radius}
              fill={element.color}
              stroke={element.deepColor}
              strokeWidth="1"
            />
            <text
              x={point.x}
              y={point.y + 0.5}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={textColor}
              fontSize={radius * 0.95}
              fontFamily="'Avenir Next', 'Apple SD Gothic Neo', sans-serif"
              fontWeight="700"
            >
              {element.symbol}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
