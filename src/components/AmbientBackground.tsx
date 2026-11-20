import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface ParticleSpec {
  id: number;
  left: string;
  top: string;
  size: number;
  duration: number;
  delay: number;
  driftX: number;
  driftY: number;
  colorClass: string;
}

const PARTICLES: ParticleSpec[] = [
  { id: 1, left: '8%', top: '18%', size: 4, duration: 14, delay: 0, driftX: 18, driftY: -36, colorClass: 'bg-sky-400/35' },
  { id: 2, left: '16%', top: '62%', size: 3, duration: 18, delay: 1.5, driftX: -14, driftY: -42, colorClass: 'bg-indigo-400/30' },
  { id: 3, left: '24%', top: '34%', size: 5, duration: 16, delay: 0.8, driftX: 22, driftY: -30, colorClass: 'bg-sky-300/25' },
  { id: 4, left: '33%', top: '78%', size: 3, duration: 20, delay: 2.2, driftX: -20, driftY: -48, colorClass: 'bg-emerald-400/25' },
  { id: 5, left: '41%', top: '22%', size: 4, duration: 15, delay: 1.1, driftX: 16, driftY: -35, colorClass: 'bg-indigo-300/30' },
  { id: 6, left: '49%', top: '54%', size: 3, duration: 19, delay: 3.0, driftX: -18, driftY: -40, colorClass: 'bg-sky-400/30' },
  { id: 7, left: '57%', top: '14%', size: 5, duration: 17, delay: 0.4, driftX: 15, driftY: -28, colorClass: 'bg-emerald-300/25' },
  { id: 8, left: '64%', top: '70%', size: 4, duration: 16, delay: 2.6, driftX: -22, driftY: -44, colorClass: 'bg-sky-300/30' },
  { id: 9, left: '72%', top: '38%', size: 3, duration: 21, delay: 1.8, driftX: 20, driftY: -38, colorClass: 'bg-indigo-400/30' },
  { id: 10, left: '81%', top: '82%', size: 5, duration: 15, delay: 0.6, driftX: -16, driftY: -36, colorClass: 'bg-sky-400/30' },
  { id: 11, left: '88%', top: '26%', size: 3, duration: 18, delay: 2.9, driftX: 14, driftY: -32, colorClass: 'bg-emerald-400/25' },
  { id: 12, left: '93%', top: '58%', size: 4, duration: 17, delay: 1.3, driftX: -15, driftY: -40, colorClass: 'bg-indigo-300/30' },
  { id: 13, left: '12%', top: '86%', size: 4, duration: 19, delay: 0.9, driftX: 12, driftY: -34, colorClass: 'bg-sky-400/25' },
  { id: 14, left: '46%', top: '88%', size: 3, duration: 16, delay: 2.1, driftX: -14, driftY: -30, colorClass: 'bg-sky-300/30' },
  { id: 15, left: '76%', top: '16%', size: 4, duration: 20, delay: 1.4, driftX: 18, driftY: -36, colorClass: 'bg-indigo-400/25' },
];

export const AmbientBackground: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      data-testid="ambient-background"
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none"
    >
      {/* 1. Gradientes Ambientales Animados (Mesh Orbs Sutiles) */}
      <motion.div
        animate={
          prefersReducedMotion
            ? undefined
            : {
                x: [0, 45, -25, 0],
                y: [0, -35, 25, 0],
                scale: [1, 1.08, 0.95, 1],
              }
        }
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute -top-32 -left-24 w-[520px] h-[520px] rounded-full bg-sky-500/12 blur-[120px]"
      />

      <motion.div
        animate={
          prefersReducedMotion
            ? undefined
            : {
                x: [0, -50, 30, 0],
                y: [0, 40, -30, 0],
                scale: [1, 0.94, 1.06, 1],
              }
        }
        transition={{
          duration: 26,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute top-1/4 -right-32 w-[560px] h-[560px] rounded-full bg-indigo-500/12 blur-[130px]"
      />

      <motion.div
        animate={
          prefersReducedMotion
            ? undefined
            : {
                x: [0, 35, -35, 0],
                y: [0, -25, 20, 0],
                scale: [1, 1.05, 0.96, 1],
              }
        }
        transition={{
          duration: 24,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute -bottom-40 left-1/3 w-[480px] h-[480px] rounded-full bg-emerald-500/8 blur-[120px]"
      />

      {/* 2. Partículas Flotantes Sutiles */}
      {PARTICLES.map((p) => (
        <motion.span
          key={p.id}
          style={{
            left: p.left,
            top: p.top,
            width: `${p.size}px`,
            height: `${p.size}px`,
          }}
          animate={
            prefersReducedMotion
              ? undefined
              : {
                  x: [0, p.driftX, 0],
                  y: [0, p.driftY, 0],
                  opacity: [0.18, 0.55, 0.18],
                  scale: [1, 1.25, 1],
                }
          }
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className={`absolute rounded-full ${p.colorClass} shadow-[0_0_8px_rgba(56,189,248,0.25)]`}
        />
      ))}

      {/* 3. Viñeta Oscura Sutil para Garantizar Contraste y Legibilidad */}
      <div className="absolute inset-0 bg-radial from-transparent via-[#0B0F17]/40 to-[#0B0F17]/85" />
    </div>
  );
};
