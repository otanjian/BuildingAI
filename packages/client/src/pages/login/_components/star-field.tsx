import { useMemo } from "react";

/** Deterministic PRNG (mulberry32) so the starfield stays stable across re-renders. */
function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Star {
  left: string;
  top: string;
  size: number;
  opacity: number;
  color: string;
  glow: boolean;
  duration: number;
  delay: number;
}

interface ShootingStar {
  left: string;
  top: string;
  rotate: string;
  translateX: string;
  translateY: string;
  gradient: string;
  duration: number;
  delay: number;
}

const STAR_COLORS = ["#ffffff", "#e2e8f0", "#c7d2fe", "#bae6fd", "#ddd6fe"];

function buildStars(count: number): Star[] {
  const rand = mulberry32(20260805);
  return Array.from({ length: count }, () => {
    const size = rand() < 0.08 ? 3 : rand() < 0.4 ? 2 : 1;
    return {
      left: `${(rand() * 100).toFixed(2)}%`,
      top: `${(rand() * 100).toFixed(2)}%`,
      size,
      opacity: 0.25 + rand() * 0.65,
      color: STAR_COLORS[Math.floor(rand() * STAR_COLORS.length)],
      glow: rand() < 0.25,
      duration: 2.4 + rand() * 4.6,
      delay: -rand() * 8,
    };
  });
}

const SHOOTING_STARS: ShootingStar[] = [
  {
    left: "72%",
    top: "12%",
    rotate: "45deg",
    translateX: "52vw",
    translateY: "52vh",
    gradient: "linear-gradient(270deg, #e2e8f0, rgba(165,180,252,0.4), transparent)",
    duration: 9,
    delay: 3,
  },
  {
    left: "18%",
    top: "28%",
    rotate: "-45deg",
    translateX: "-52vw",
    translateY: "52vh",
    gradient: "linear-gradient(90deg, #e2e8f0, rgba(199,210,254,0.35), transparent)",
    duration: 12,
    delay: 8,
  },
  {
    left: "58%",
    top: "8%",
    rotate: "45deg",
    translateX: "60vw",
    translateY: "60vh",
    gradient: "linear-gradient(270deg, #ffffff, rgba(186,230,253,0.3), transparent)",
    duration: 14,
    delay: 15,
  },
];

interface StarFieldProps {
  /** Approximate number of twinkling stars to render. */
  density?: number;
}

function StarField({ density = 140 }: StarFieldProps) {
  const stars = useMemo(() => buildStars(density), [density]);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {stars.map((star, index) => (
        <span
          key={index}
          className="star absolute rounded-full"
          style={
            {
              left: star.left,
              top: star.top,
              width: star.size,
              height: star.size,
              background: star.color,
              boxShadow: star.glow ? `0 0 ${star.size * 4}px ${star.color}` : undefined,
              "--star-o": star.opacity,
              animationDuration: `${star.duration}s`,
              animationDelay: `${star.delay}s`,
            } as React.CSSProperties
          }
        />
      ))}
      {SHOOTING_STARS.map((shoot, index) => (
        <span
          key={`shoot-${index}`}
          className="shooting-star"
          style={
            {
              left: shoot.left,
              top: shoot.top,
              background: shoot.gradient,
              "--shoot-rotate": shoot.rotate,
              "--shoot-x": shoot.translateX,
              "--shoot-y": shoot.translateY,
              animationDuration: `${shoot.duration}s`,
              animationDelay: `${shoot.delay}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

export { StarField };
