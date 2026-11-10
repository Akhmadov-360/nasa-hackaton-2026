/** SVG filters for the liquid look. Apply `filter: url(#goo)` only to small blob layers, never to text. */
export function GooeyFilter() {
  return (
    <svg width="0" height="0" aria-hidden="true" className="pointer-events-none absolute">
      <defs>
        <filter id="goo" x="-20%" y="-40%" width="140%" height="180%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
          <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10" result="goo" />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
        <filter id="goo-rail" x="-30%" y="-10%" width="160%" height="120%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation="9" result="blur" />
          <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 26 -12" />
        </filter>
        <filter id="goo-soft" x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.4" result="blur" />
          <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 16 -7" />
        </filter>
      </defs>
    </svg>
  );
}
