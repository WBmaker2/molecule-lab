import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export function BuildIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="2.4" />
      <circle cx="5" cy="7" r="1.7" />
      <circle cx="19" cy="7" r="1.7" />
      <circle cx="12" cy="20" r="1.7" />
      <path d="M6.4 8.2 10 10.7M17.6 8.2 14 10.7M12 14.4V18.3" />
    </svg>
  );
}

export function StatesIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9 4v9.2a3 3 0 1 0 6 0V4a3 3 0 0 0-6 0Z" />
      <path d="M12 7v8" />
      <circle cx="12" cy="17" r="1.1" fill="currentColor" stroke="none" />
      <path d="M17.5 6h2.5M17.5 10h2M18.5 14h1.5" />
    </svg>
  );
}

export function ReactionIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M10 3h4M11 3v6.2L5.8 18a2.3 2.3 0 0 0 2 3.4h8.4a2.3 2.3 0 0 0 2-3.4L13 9.2V3" />
      <path d="M8 15h8" />
      <circle cx="10.5" cy="18" r=".9" fill="currentColor" stroke="none" />
      <circle cx="13.8" cy="17" r=".7" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function LibraryIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5Z" />
      <path d="M4 5.5v15A2.5 2.5 0 0 0 6.5 23H20v-5" />
      <path d="M8 7h8M8 11h5" />
    </svg>
  );
}

export function QuizIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9 9a3 3 0 1 1 5.2 2c-.9.8-1.7 1.4-1.7 2.8" />
      <circle cx="12" cy="17.8" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

export function AngleIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 19h16M4 19 13 5" />
      <path d="M9.2 19a5 5 0 0 0-1.6-3.6" />
    </svg>
  );
}

export function PolarityIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 12h13" />
      <path d="m13 8 4 4-4 4" />
      <path d="M4 7v10" />
    </svg>
  );
}

export function HeatIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 21c3.4 0 6-2.5 6-5.9 0-4.3-4.4-6.5-4.4-10.6-2.7 1.5-5 4.1-5 7.1 0 1.2.4 2.1 1 2.9-1.6.4-2.6 1.9-2.6 3.5C7 20 9.1 21 12 21Z" />
    </svg>
  );
}

export function CoolIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9" />
      <path d="m9.2 4.8 2.8 2.4 2.8-2.4M9.2 19.2l2.8-2.4 2.8 2.4" />
    </svg>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M8 5.5 19 12 8 18.5Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function PauseIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M8 5h3v14H8zM14 5h3v14h-3z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function RestartIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4.6 10a8 8 0 1 1 1.2 8" />
      <path d="M4 5v5h5" />
    </svg>
  );
}

export function StepBackIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M18 6 9 12l9 6V6ZM6 5v14" />
    </svg>
  );
}

export function StepForwardIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m6 6 9 6-9 6V6ZM18 5v14" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m5 12.5 4.2 4.2L19 7" />
    </svg>
  );
}

export function ArrowIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 12h16M14 6l6 6-6 6" />
    </svg>
  );
}

export function SparkIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  );
}

export function BrandMark(props: IconProps) {
  return (
    <svg viewBox="0 0 40 40" fill="none" aria-hidden {...props}>
      <circle cx="20" cy="20" r="5.4" fill="#b87a52" />
      <circle cx="9" cy="12" r="3.2" fill="#8bab72" />
      <circle cx="31" cy="12" r="3.2" fill="#b99ac8" />
      <circle cx="20" cy="33" r="3.2" fill="#c9a24d" />
      <path
        d="M11.6 14.2 16 17.6M28.4 14.2 24 17.6M20 25.4v4.4"
        stroke="#6f7b63"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="20" cy="20" r="14.6" stroke="#8a7f68" strokeWidth="1" opacity=".5" />
    </svg>
  );
}
