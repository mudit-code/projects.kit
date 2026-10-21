'use client';

import React, { useEffect, useState, useRef } from 'react';

export interface KitScreenLoaderProps {
  /**
   * Mode:
   * - 'full': Plays the complete project.kit intro animation from the html file
   * - 'loader' | 'heartbeat': Heartbeat animation of the logo (for loads/fetches > 100ms)
   */
  mode?: 'full' | 'loader' | 'heartbeat';
  /** Fullscreen overlay */
  fullScreen?: boolean;
  /** Whether to show the line loader progress bar below the animation */
  showProgressBar?: boolean;
  /** Custom status / loading message displayed underneath */
  message?: string;
  /** Additional custom class */
  className?: string;
  /** Background transparency */
  transparent?: boolean;
  /** Controlled progress (0 to 100) */
  progress?: number;
  /** Signal that the page or fetch has finished loading */
  isComplete?: boolean;
  /** Callback fired when progress reaches 100% and finishes */
  onComplete?: () => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  loop?: boolean;
  duration?: number;
}

export function KitScreenLoader({
  mode = 'heartbeat',
  fullScreen = false,
  showProgressBar = true,
  message,
  className = '',
  transparent = false,
  progress,
  isComplete = false,
  onComplete,
  size = 'md',
}: KitScreenLoaderProps) {
  const isHeartbeatOnly = mode === 'loader' || mode === 'heartbeat';
  const stageRef = useRef<HTMLDivElement | null>(null);

  // Sizing for Version 1 and Version 2 heartbeat loaders (slightly smaller, proportional)
  const heartbeatLogoSize =
    size === 'sm' ? '105px' :
    size === 'lg' ? '155px' :
    size === 'xl' ? '180px' :
    '135px';

  const lineLoaderWidth =
    size === 'sm' ? '120px' :
    size === 'lg' ? '175px' :
    size === 'xl' ? '192px' :
    '150px';

  // Progressive Line Loader state
  const [internalProgress, setInternalProgress] = useState(isHeartbeatOnly ? 25 : 8);

  useEffect(() => {
    if (typeof progress === 'number') {
      setInternalProgress(progress);
      return;
    }

    if (isComplete) {
      setInternalProgress(100);
      const timer = setTimeout(() => {
        onComplete?.();
      }, 90);
      return () => clearTimeout(timer);
    }

    const interval = setInterval(() => {
      setInternalProgress((prev) => {
        if (prev >= 92) return 92;
        const diff = 92 - prev;
        const step = Math.max(1, Math.ceil(diff * 0.15));
        return Math.min(92, prev + step);
      });
    }, 75);

    return () => clearInterval(interval);
  }, [progress, isComplete, onComplete, isHeartbeatOnly]);

  const currentProgress = typeof progress === 'number' ? progress : internalProgress;

  // Exact JavaScript from projects.kit intro.html
  useEffect(() => {
    const s = stageRef.current;
    if (!s) return;

    if (isHeartbeatOnly) {
      s.className = 'stage lo done';
      return;
    }

    // Full animation mode
    s.className = 'stage hold';

    function prep(stageElem: HTMLElement) {
      const p = stageElem.querySelector('.pp') as HTMLElement | null;
      if (!p || !p.getBoundingClientRect) return;
      const r = p.getBoundingClientRect();
      const sr = stageElem.getBoundingClientRect();
      const cs = getComputedStyle(p);
      const canvas = document.createElement('canvas');
      const c = canvas.getContext('2d');
      if (!c) return;
      c.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      const m = c.measureText('P');
      const cap = m.actualBoundingBoxAscent || r.height * 0.8;
      const fa = (m as any).fontBoundingBoxAscent || r.height * 0.8;
      const size = Math.min(window.innerWidth * 0.46, 200);
      const L = size / 1930;
      const sc = (size * 0.61) / cap;
      const ox = r.left + r.width / 2;
      const oy = r.top + r.height / 2;
      const gy = r.top + fa - cap / 2;
      const th = (16 * Math.PI) / 180;
      const vy = gy - oy;
      stageElem.style.setProperty('--dx', (sr.left + sr.width / 2 - ox + 92 * L + sc * vy * Math.sin(th)) + 'px');
      stageElem.style.setProperty('--dy', (sr.top + sr.height / 2 - oy + 45 * L - sc * vy * Math.cos(th)) + 'px');
      stageElem.style.setProperty('--s', String(sc));
    }

    let doneTimer: NodeJS.Timeout | null = null;

    const startAnimation = () => {
      if (!stageRef.current) return;
      prep(stageRef.current);
      stageRef.current.classList.remove('hold');
      doneTimer = setTimeout(() => {
        if (stageRef.current) {
          stageRef.current.classList.add('done');
        }
      }, 4900);
    };

    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
      Promise.race([
        document.fonts.ready,
        new Promise((resolve) => setTimeout(resolve, 800)),
      ]).then(startAnimation);
    } else {
      startAnimation();
    }

    return () => {
      if (doneTimer) clearTimeout(doneTimer);
    };
  }, [isHeartbeatOnly]);

  const containerClasses = fullScreen
    ? `fixed inset-0 z-[99999] flex flex-col items-center justify-center ${
        transparent ? 'bg-[#F6F5F2]/95 backdrop-blur-md' : 'bg-[#F6F5F2]'
      } transition-opacity duration-200 select-none`
    : `relative w-full h-full min-h-[180px] flex flex-col items-center justify-center select-none ${className}`;

  return (
    <div className={containerClasses} style={{ ['--bg' as any]: '#F6F5F2', ['--ink' as any]: '#0B2A6F', ['--brand' as any]: '#1C3A7F', ['--line' as any]: '#D0D5DD' }}>
      {/* Exact Google Font from original html */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lato:wght@700;900&display=swap" />

      {/* Exact untouched CSS from projects.kit intro.html */}
      <style>{`
        :root {
          --bg: #F6F5F2;
          --ink: #0B2A6F;
          --brand: #1C3A7F;
          --line: #D0D5DD;
        }
        @media (prefers-color-scheme: dark) {
          :root:not([data-theme="light"]) {
            --bg: #0B1220;
            --ink: #E6ECFA;
            --brand: #3D6FDB;
            --line: #344054;
          }
        }
        :root[data-theme="dark"] {
          --bg: #0B1220;
          --ink: #E6ECFA;
          --brand: #3D6FDB;
          --line: #344054;
        }
        .stage {
          position: relative;
          overflow: ${isHeartbeatOnly ? 'visible' : 'hidden'};
          width: ${isHeartbeatOnly ? heartbeatLogoSize : 'min(80vw, 520px)'};
          height: ${isHeartbeatOnly ? heartbeatLogoSize : '260px'};
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: Calibri, Carlito, Lato, sans-serif;
          color: var(--ink, #0B2A6F);
        }
        .hold * { animation-play-state: paused !important; }
        .wm {
          position: absolute;
          inset: 0;
          z-index: 2;
          margin: auto;
          width: max-content;
          height: max-content;
          pointer-events: none;
          font-size: clamp(40px, 11vw, 76px);
          font-weight: 700;
          display: flex;
          align-items: baseline;
          white-space: nowrap;
          text-rendering: geometricPrecision;
          -webkit-font-smoothing: antialiased;
        }
        .w {
          display: inline-block;
          opacity: 0;
          animation: rise .9s cubic-bezier(.22, 1, .36, 1) forwards;
        }
        .a { animation-delay: .15s; }
        .k { animation-delay: .8s; }
        .c {
          display: inline-block;
          animation: er .18s ease-in var(--d) forwards;
        }
        .pp {
          display: inline-grid;
          align-items: baseline;
          justify-items: start;
          transform-origin: center center;
          will-change: transform, opacity, color;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          transform-style: preserve-3d;
          animation: pflight 1.15s cubic-bezier(.4, 0, .2, 1) 2.85s forwards,
                     pcol .4s ease 3.5s forwards,
                     pfade .7s ease 4s forwards;
        }
        .pp * {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          will-change: transform, opacity;
        }
        .gl { grid-area: 1/1; animation: out .25s ease 2.55s forwards; }
        .gu { grid-area: 1/1; opacity: 0; animation: gin .3s cubic-bezier(.22, 1, .36, 1) 2.55s forwards; }
        .dot {
          display: inline-block;
          width: .2em;
          height: .2em;
          margin: 0 .1em;
          background: var(--brand);
          border-radius: .05em;
          transform: rotate(45deg) scale(0);
          animation: dotin .6s cubic-bezier(.22, 1.4, .4, 1) .6s forwards, out .18s ease-in 2.05s forwards;
        }
        .logo {
          position: absolute;
          inset: 0;
          z-index: 1;
          margin: auto;
          width: ${isHeartbeatOnly ? heartbeatLogoSize : 'min(46vw, 200px)'};
          height: ${isHeartbeatOnly ? heartbeatLogoSize : 'min(46vw, 200px)'};
          opacity: 0;
          transform: scale(.2) rotate(-90deg);
          animation: pop .8s cubic-bezier(.2, 1.3, .3, 1) 2.9s forwards, lbeat .9s ease-out 4.15s;
        }
        .stage svg { display: block; width: 100%; height: 100%; }
        .ed { stroke-dasharray: 1; stroke-dashoffset: 1; animation: draw .5s ease-out forwards; }
        .e1 { animation-delay: 3.9s; }
        .e2 { animation-delay: 4s; }
        .e3 { animation-delay: 4.1s; }
        .e4 { animation-delay: 4.2s; }
        .np {
          transform-box: fill-box;
          transform-origin: center;
          transform: scale(0);
          animation: npop .45s cubic-bezier(.2, 1.6, .4, 1) forwards;
        }
        .n1 { animation-delay: 3.85s; }
        .n2 { animation-delay: 3.95s; }
        .n3 { animation-delay: 4.05s; }
        .pl { transform-box: fill-box; transform-origin: center; }
        .done .pl { animation: beat 1.4s ease-in-out infinite; }
        .done .n2 .pl { animation-delay: .12s; }
        .done .n3 .pl { animation-delay: .24s; }
        .lo .wm { display: none !important; }
        .lo .logo {
          animation: none !important;
          opacity: 1 !important;
          transform: none !important;
        }
        .lo .ed { animation: none !important; stroke-dashoffset: 0 !important; }
        .lo .np { animation: none !important; transform: scale(1) !important; }
        .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
        @keyframes rise { from { opacity: 0; transform: translate3d(0, 12px, 0); } to { opacity: 1; transform: translate3d(0, 0, 0); } }
        @keyframes er { from { opacity: 1; transform: translate3d(0, 0, 0); } to { opacity: 0; transform: translate3d(-6px, 0, 0); } }
        @keyframes out { from { opacity: 1; } to { opacity: 0; } }
        @keyframes gin { from { opacity: 0; transform: scale(.9); } to { opacity: 1; transform: scale(1); } }
        @keyframes pflight {
          0%   { transform: translate3d(0, 0, 0) rotate(0deg) scale(1); }
          35%  { transform: translate3d(0, 0, 0) rotate(16deg) scale(1); }
          100% { transform: translate3d(var(--dx, 0px), var(--dy, 0px), 0) rotate(16deg) scale(var(--s, 2)); }
        }
        @keyframes ptilt { from { transform: translate3d(0, 0, 0) rotate(0deg) scale(1); } to { transform: translate3d(0, 0, 0) rotate(16deg) scale(1); } }
        @keyframes pmove { from { transform: translate3d(0, 0, 0) rotate(16deg) scale(1); } to { transform: translate3d(var(--dx, 0px), var(--dy, 0px), 0) rotate(16deg) scale(var(--s, 2)); } }
        @keyframes pcol { from { color: var(--ink); } to { color: var(--bg); } }
        @keyframes pfade { from { opacity: 1; } to { opacity: 0; } }
        @keyframes dotin { to { transform: rotate(45deg) scale(1); } }
        @keyframes pop { to { opacity: 1; transform: none; } }
        @keyframes lbeat { 0%, 100% { transform: scale(1); } 25% { transform: scale(1.07); } 45% { transform: scale(.99); } 65% { transform: scale(1.035); } }
        @keyframes draw { to { stroke-dashoffset: 0; } }
        @keyframes npop { to { transform: scale(1); } }
        @keyframes beat { 0%, 56%, 100% { transform: scale(1); } 14% { transform: scale(.82); } 28% { transform: scale(1); } 42% { transform: scale(.9); } }
        @keyframes kit-dot-fade { 0%, 100% { opacity: 0.25; } 50% { opacity: 1; } }
        .animate-kit-dot-1 { animation: kit-dot-fade 1.2s ease-in-out 0s infinite; }
        .animate-kit-dot-2 { animation: kit-dot-fade 1.2s ease-in-out 0.2s infinite; }
        .animate-kit-dot-3 { animation: kit-dot-fade 1.2s ease-in-out 0.4s infinite; }
      `}</style>

      {/* Stage + loader grouped together so they center as a unit */}
      <div className="flex flex-col items-center" style={{ gap: '1px' }}>
      <div ref={stageRef} className={`stage ${isHeartbeatOnly ? 'lo done' : 'hold'}`}>
        <div className="wm" aria-hidden="true">
          <span className="w a">
            <span className="pp">
              <span className="gl">p</span>
              <span className="gu">P</span>
            </span>
            <span className="c" style={{ ['--d' as any]: '2.4s' }}>r</span>
            <span className="c" style={{ ['--d' as any]: '2.35s' }}>o</span>
            <span className="c" style={{ ['--d' as any]: '2.3s' }}>j</span>
            <span className="c" style={{ ['--d' as any]: '2.25s' }}>e</span>
            <span className="c" style={{ ['--d' as any]: '2.2s' }}>c</span>
            <span className="c" style={{ ['--d' as any]: '2.15s' }}>t</span>
            <span className="c" style={{ ['--d' as any]: '2.1s' }}>s</span>
          </span>
          <span className="dot" />
          <span className="w k">
            <span className="c" style={{ ['--d' as any]: '2s' }}>k</span>
            <span className="c" style={{ ['--d' as any]: '1.95s' }}>i</span>
            <span className="c" style={{ ['--d' as any]: '1.9s' }}>t</span>
          </span>
        </div>

        <div className="logo">
          <svg viewBox="0 0 1930 1930" role="img" aria-label="projects.kit logo">
            <defs>
              <mask id="cut-screenloader" maskUnits="userSpaceOnUse" x="0" y="0" width="1930" height="1930">
                <rect width="1930" height="1930" fill="#fff" />
                <g fill="none" stroke="#000" strokeWidth="105">
                  <path className="ed e1" pathLength="1" d="M928 585L770 1135" />
                  <path className="ed e2" pathLength="1" d="M928 585L1345 1005" />
                  <path className="ed e3" pathLength="1" d="M770 1135L1345 1005" />
                  <path className="ed e4" pathLength="1" d="M770 1135L587 1732" />
                </g>
                <g fill="#000">
                  <g className="np n1"><circle className="pl" cx="928" cy="585" r="165" /></g>
                  <g className="np n2"><circle className="pl" cx="1345" cy="1005" r="165" /></g>
                  <g className="np n3"><circle className="pl" cx="770" cy="1135" r="165" /></g>
                </g>
              </mask>
            </defs>
            <polygon
              points="965,413.5 1516.5,965 965,1516.5 413.5,965"
              fill="var(--brand)"
              stroke="var(--brand)"
              strokeWidth="600"
              strokeLinejoin="round"
              mask="url(#cut-screenloader)"
            />
          </svg>
        </div>
        <div role="status" className="sr">Loading</div>
      </div>

      {/* Line Loader directly below the animation stage (never shown in intro mode) */}
      {mode !== 'full' && (showProgressBar || message) && (
        <div className="flex flex-col items-center shrink-0" style={{ width: lineLoaderWidth }}>
          {showProgressBar && (
            <div
              style={{ width: lineLoaderWidth, height: '6px', borderRadius: '999px', overflow: 'hidden', background: '#D0D5DD' }}
            >
              <div
                style={{ height: '100%', borderRadius: '999px', width: `${currentProgress}%`, background: '#1C3A7F', transition: 'width 300ms ease-out' }}
              />
            </div>
          )}

          <div className="flex items-center justify-center gap-1.5" style={{ marginTop: '8px' }}>
            {message ? (
              <span style={{ fontSize: '11px', fontWeight: 500, color: '#0B2A6F', opacity: 0.6 }}>
                {message}
              </span>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="animate-kit-dot-1" style={{ display: 'inline-block', width: '5px', height: '5px', borderRadius: '50%', background: '#1C3A7F' }} />
                <span className="animate-kit-dot-2" style={{ display: 'inline-block', width: '5px', height: '5px', borderRadius: '50%', background: '#1C3A7F' }} />
                <span className="animate-kit-dot-3" style={{ display: 'inline-block', width: '5px', height: '5px', borderRadius: '50%', background: '#1C3A7F' }} />
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export const KitPipelineLoader = KitScreenLoader;
export const LogoLoader = KitScreenLoader;
export default KitScreenLoader;
