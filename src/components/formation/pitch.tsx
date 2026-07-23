export function Pitch() {
  return (
    <svg
      viewBox="0 0 320 440"
      className="block w-full rounded-xl"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <pattern id="clearfc-stripes" width="320" height="55" patternUnits="userSpaceOnUse">
          <rect width="320" height="55" fill="#1c5e22" />
          <rect width="320" height="27.5" fill="#14491a" />
        </pattern>
        <radialGradient id="clearfc-flood" cx="50%" cy="32%" r="62%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.2" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.3" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="320" height="440" fill="url(#clearfc-stripes)" />
      <rect x="0" y="0" width="320" height="440" fill="url(#clearfc-flood)" />
      <g stroke="#ffffff" strokeOpacity="0.7" strokeWidth="2" fill="none">
        <rect x="10" y="10" width="300" height="420" rx="4" />
        <line x1="10" y1="220" x2="310" y2="220" />
        <circle cx="160" cy="220" r="42" />
        <circle cx="160" cy="220" r="2.5" fill="#fff" stroke="none" />
        <rect x="90" y="10" width="140" height="58" />
        <rect x="125" y="10" width="70" height="24" />
        <rect x="90" y="372" width="140" height="58" />
        <rect x="125" y="406" width="70" height="24" />
      </g>
    </svg>
  );
}
