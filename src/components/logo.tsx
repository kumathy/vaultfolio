import Link from "next/link";

const TILE =
  "M32.00 16.00 L31.99 19.54 L31.96 21.01 L31.91 22.13 L31.85 23.07 L31.76 23.89 L31.65 24.62 L31.53 25.29 L31.38 25.90 L31.21 26.46 L31.03 26.99 L30.82 27.47 L30.59 27.93 L30.34 28.35 L30.07 28.74 L29.77 29.11 L29.45 29.45 L29.11 29.77 L28.74 30.07 L28.35 30.34 L27.93 30.59 L27.47 30.82 L26.99 31.03 L26.46 31.21 L25.90 31.38 L25.29 31.53 L24.62 31.65 L23.89 31.76 L23.07 31.85 L22.13 31.91 L21.01 31.96 L19.54 31.99 L16.00 32.00 L12.46 31.99 L10.99 31.96 L9.87 31.91 L8.93 31.85 L8.11 31.76 L7.38 31.65 L6.71 31.53 L6.10 31.38 L5.54 31.21 L5.01 31.03 L4.53 30.82 L4.07 30.59 L3.65 30.34 L3.26 30.07 L2.89 29.77 L2.55 29.45 L2.23 29.11 L1.93 28.74 L1.66 28.35 L1.41 27.93 L1.18 27.47 L0.97 26.99 L0.79 26.46 L0.62 25.90 L0.47 25.29 L0.35 24.62 L0.24 23.89 L0.15 23.07 L0.09 22.13 L0.04 21.01 L0.01 19.54 L0.00 16.00 L0.01 12.46 L0.04 10.99 L0.09 9.87 L0.15 8.93 L0.24 8.11 L0.35 7.38 L0.47 6.71 L0.62 6.10 L0.79 5.54 L0.97 5.01 L1.18 4.53 L1.41 4.07 L1.66 3.65 L1.93 3.26 L2.23 2.89 L2.55 2.55 L2.89 2.23 L3.26 1.93 L3.65 1.66 L4.07 1.41 L4.53 1.18 L5.01 0.97 L5.54 0.79 L6.10 0.62 L6.71 0.47 L7.38 0.35 L8.11 0.24 L8.93 0.15 L9.87 0.09 L10.99 0.04 L12.46 0.01 L16.00 0.00 L19.54 0.01 L21.01 0.04 L22.13 0.09 L23.07 0.15 L23.89 0.24 L24.62 0.35 L25.29 0.47 L25.90 0.62 L26.46 0.79 L26.99 0.97 L27.47 1.18 L27.93 1.41 L28.35 1.66 L28.74 1.93 L29.11 2.23 L29.45 2.55 L29.77 2.89 L30.07 3.26 L30.34 3.65 L30.59 4.07 L30.82 4.53 L31.03 5.01 L31.21 5.54 L31.38 6.10 L31.53 6.71 L31.65 7.38 L31.76 8.11 L31.85 8.93 L31.91 9.87 L31.96 10.99 L31.99 12.46Z";

// Rising chart line whose points are linked notes, as in Obsidian's graph view.
const LINE = "M7.5 22.5 L13 16.5 L18.5 18.5 L25 9.5";
const NODES = [
  [7.5, 22.5],
  [13, 16.5],
  [18.5, 18.5],
  [25, 9.5],
];

const LINKS = ["M18.5 18.5 L24.5 23", "M13 16.5 L10 10.5"];
const LINK_ENDS = [
  [24.5, 23],
  [10, 10.5],
];

const LINK_COLOR = "color-mix(in srgb, #fff 50%, var(--accent-strong))";

export function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={className}>
      <path d={TILE} className="fill-accent-strong" />
      {/* Solid half-white, not transparency, so the link lines do not show
          through their end dots. */}
      <g
        strokeWidth="1.08"
        strokeLinecap="round"
        style={{ stroke: LINK_COLOR }}
      >
        {LINKS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      <g style={{ fill: LINK_COLOR }}>
        {LINK_ENDS.map(([x, y]) => (
          <circle key={`e${x}`} cx={x} cy={y} r="1.26" />
        ))}
      </g>
      <path
        d={LINE}
        fill="none"
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g fill="#fff">
        {NODES.map(([x, y]) => (
          <circle key={`n${x}`} cx={x} cy={y} r="1.8" />
        ))}
      </g>
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2.5 rounded-lg"
    >
      <LogoMark />
      <span className="text-[1.05rem] font-semibold tracking-tight text-foreground transition-colors group-hover:text-accent">
        Vaultfolio
      </span>
    </Link>
  );
}
