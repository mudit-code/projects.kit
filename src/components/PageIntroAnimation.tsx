'use client';

/**
 * PageIntroAnimation — Version 3 screen loader
 *
 * Plays the full projects.kit intro animation (text → logo construction)
 * on first page visit.  When the logo is fully drawn (~4.8 s) it FLIP-
 * animates from the overlay centre to the hero logo position in the
 * landing page while the page content fades in behind the dissolving
 * overlay.  No heartbeat.  No loading bar.
 *
 * All CSS classes use the `pki-` prefix to avoid collision with
 * KitScreenLoader's unscoped `.stage`, `.logo`, etc. classes.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';

type Phase = 'playing' | 'flying' | 'done';

export interface PageIntroAnimationProps {
  /** Ref to the hero logo wrapper element in the landing page */
  heroLogoRef: React.RefObject<HTMLElement | null>;
  /** Fired when the overlay is completely gone */
  onComplete: () => void;
  /** Fired when the logo starts moving — page should begin fading in */
  onStartReveal: () => void;
}

const LOGO_CONSTRUCT_MS = 4800; // logo fully drawn by this point
const FLY_DURATION_MS   = 520;  // logo-fly + overlay-fade duration
const REVEAL_DELAY_MS   = 80;   // tiny offset before page fade starts

export function PageIntroAnimation({
  heroLogoRef,
  onComplete,
  onStartReveal,
}: PageIntroAnimationProps) {
  const stageRef      = useRef<HTMLDivElement | null>(null);
  const logoRef       = useRef<HTMLDivElement | null>(null);
  const overlayRef    = useRef<HTMLDivElement | null>(null);
  const flyingLogoRef = useRef<HTMLDivElement | null>(null);
  const [phase, setPhase] = useState<Phase>('playing');

  // prep() — mirrors the exact JS from projects.kit intro.html
  const prep = useCallback((stageElem: HTMLElement) => {
    const p = stageElem.querySelector('.pki-pp') as HTMLElement | null;
    if (!p || !p.getBoundingClientRect) return;
    const r  = p.getBoundingClientRect();
    const sr = stageElem.getBoundingClientRect();
    const cs = getComputedStyle(p);
    const canvas = document.createElement('canvas');
    const c = canvas.getContext('2d');
    if (!c) return;
    c.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const m   = c.measureText('P');
    const cap = m.actualBoundingBoxAscent || r.height * 0.8;
    const fa  = (m as any).fontBoundingBoxAscent || r.height * 0.8;
    const size = Math.min(window.innerWidth * 0.46, 200);
    const L    = size / 1930;
    const sc   = (size * 0.61) / cap;
    const ox   = r.left + r.width  / 2;
    const oy   = r.top  + r.height / 2;
    const gy   = r.top  + fa - cap / 2;
    const th   = (16 * Math.PI) / 180;
    const vy   = gy - oy;
    stageElem.style.setProperty('--dx', `${sr.left + sr.width  / 2 - ox + 92 * L + sc * vy * Math.sin(th)}px`);
    stageElem.style.setProperty('--dy', `${sr.top  + sr.height / 2 - oy + 45 * L - sc * vy * Math.cos(th)}px`);
    stageElem.style.setProperty('--s',  String(sc));
  }, []);

  // FLIP transition: fly logo from centre → hero position
  const startFlyTransition = useCallback(() => {
    const logoEl   = logoRef.current;
    const heroEl   = heroLogoRef.current;
    const flyingEl = flyingLogoRef.current;
    const overlay  = overlayRef.current;

    // Fallback: pure cross-fade if refs aren't ready
    if (!logoEl || !heroEl || !flyingEl || !overlay) {
      if (overlay) {
        overlay.style.transition = `opacity ${FLY_DURATION_MS}ms ease`;
        overlay.style.opacity    = '0';
        overlay.style.pointerEvents = 'none';
      }
      setTimeout(onStartReveal, REVEAL_DELAY_MS);
      setPhase('flying');
      setTimeout(() => { setPhase('done'); onComplete(); }, FLY_DURATION_MS + 60);
      return;
    }

    const from = logoEl.getBoundingClientRect();
    const to   = heroEl.getBoundingClientRect();

    // Place flying SVG exactly over the animation logo
    Object.assign(flyingEl.style, {
      display:        'block',
      position:       'fixed',
      left:           `${from.left}px`,
      top:            `${from.top}px`,
      width:          `${from.width}px`,
      height:         `${from.height}px`,
      opacity:        '1',
      transition:     'none',
      pointerEvents:  'none',
    });

    // Force reflow so browser registers the starting state
    void flyingEl.offsetWidth;

    const easing = 'cubic-bezier(.4,0,.2,1)';
    flyingEl.style.transition = [
      `left ${FLY_DURATION_MS}ms ${easing}`,
      `top ${FLY_DURATION_MS}ms ${easing}`,
      `width ${FLY_DURATION_MS}ms ${easing}`,
      `height ${FLY_DURATION_MS}ms ${easing}`,
      `opacity ${Math.round(FLY_DURATION_MS * 0.55)}ms ease ${Math.round(FLY_DURATION_MS * 0.45)}ms`,
    ].join(', ');

    Object.assign(flyingEl.style, {
      left:    `${to.left}px`,
      top:     `${to.top}px`,
      width:   `${to.width}px`,
      height:  `${to.height}px`,
      opacity: '0',
    });

    // Fade the overlay (text + background) out simultaneously
    overlay.style.transition    = `opacity ${FLY_DURATION_MS}ms ease`;
    overlay.style.opacity       = '0';
    overlay.style.pointerEvents = 'none';

    setTimeout(onStartReveal, REVEAL_DELAY_MS);
    setPhase('flying');
    setTimeout(() => { setPhase('done'); onComplete(); }, FLY_DURATION_MS + 60);
  }, [heroLogoRef, onComplete, onStartReveal]);

  // Start animation once mounted
  useEffect(() => {
    const s = stageRef.current;
    if (!s) return;
    s.className = 'pki-stage pki-hold';

    let flyTimer: ReturnType<typeof setTimeout>;

    const startAnimation = () => {
      if (!stageRef.current) return;
      prep(stageRef.current);
      stageRef.current.classList.remove('pki-hold');
      flyTimer = setTimeout(startFlyTransition, LOGO_CONSTRUCT_MS);
    };

    if (typeof document !== 'undefined' && document.fonts?.ready) {
      Promise.race([
        document.fonts.ready,
        new Promise<void>((res) => setTimeout(res, 800)),
      ]).then(startAnimation);
    } else {
      startAnimation();
    }

    return () => clearTimeout(flyTimer);
  }, [prep, startFlyTransition]);

  if (phase === 'done') return null;

  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Lato:wght@700;900&display=swap"
      />
      <style>{`
        .pki-overlay {
          position: fixed; inset: 0; z-index: 99999;
          display: flex; align-items: center; justify-content: center;
          background: #F6F5F2;
        }
        .pki-stage {
          position: relative; overflow: visible;
          width: min(80vw, 540px); height: 260px;
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-family: Calibri, Carlito, Lato, sans-serif;
          color: #0B2A6F;
        }
        .pki-hold * { animation-play-state: paused !important; }
        .pki-wm {
          position: absolute; inset: 0; z-index: 2;
          margin: auto; width: max-content; height: max-content;
          pointer-events: none;
          font-size: clamp(40px, 11vw, 76px); font-weight: 700;
          display: flex; align-items: baseline; white-space: nowrap;
          text-rendering: geometricPrecision; -webkit-font-smoothing: antialiased;
        }
        .pki-w  { display:inline-block; opacity:0; animation:pki-rise .9s cubic-bezier(.22,1,.36,1) forwards; }
        .pki-a  { animation-delay:.15s; }
        .pki-k  { animation-delay:.8s; }
        .pki-c  { display:inline-block; animation:pki-er .18s ease-in var(--d) forwards; }
        .pki-pp {
          display:inline-grid; align-items:baseline; justify-items:start;
          animation:
            pki-ptilt .45s cubic-bezier(.65,0,.35,1) 2.85s forwards,
            pki-pmove .7s  cubic-bezier(.65,0,.35,1) 3.3s  forwards,
            pki-pcol  .4s  ease 3.5s forwards,
            pki-pfade .7s  ease 4s   forwards;
        }
        .pki-gl { grid-area:1/1; animation:pki-out .25s ease 2.55s forwards; }
        .pki-gu { grid-area:1/1; opacity:0; animation:pki-gin .3s cubic-bezier(.22,1,.36,1) 2.55s forwards; }
        .pki-dot {
          display:inline-block; width:.2em; height:.2em; margin:0 .1em;
          background:#1C3A7F; border-radius:.05em;
          transform:rotate(45deg) scale(0);
          animation:
            pki-dotin .6s cubic-bezier(.22,1.4,.4,1) .6s  forwards,
            pki-out   .18s ease-in 2.05s forwards;
        }
        .pki-logo {
          position:absolute; inset:0; z-index:1; margin:auto;
          width:min(46vw,200px); height:min(46vw,200px);
          opacity:0; transform:scale(.2) rotate(-90deg);
          /* No lbeat / heartbeat — V3 stays static after construction */
          animation:pki-pop .8s cubic-bezier(.2,1.3,.3,1) 2.9s forwards;
        }
        .pki-stage svg { display:block; width:100%; height:100%; }
        .pki-ed { stroke-dasharray:1; stroke-dashoffset:1; animation:pki-draw .5s ease-out forwards; }
        .pki-e1 { animation-delay:3.9s;  } .pki-e2 { animation-delay:4s;    }
        .pki-e3 { animation-delay:4.1s;  } .pki-e4 { animation-delay:4.2s;  }
        .pki-np {
          transform-box:fill-box; transform-origin:center; transform:scale(0);
          animation:pki-npop .45s cubic-bezier(.2,1.6,.4,1) forwards;
        }
        .pki-n1 { animation-delay:3.85s; } .pki-n2 { animation-delay:3.95s; } .pki-n3 { animation-delay:4.05s; }
        .pki-pl { transform-box:fill-box; transform-origin:center; }
        /* No .pki-done .pki-pl heartbeat — intentional for V3 */
        .pki-sr { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); }
        .pki-flying { display:none; z-index:100000; pointer-events:none; }
        .pki-flying svg { display:block; width:100%; height:100%; }

        @keyframes pki-rise  { from{opacity:0;transform:translate3d(0,12px,0)} to{opacity:1;transform:translate3d(0,0,0)} }
        @keyframes pki-er    { from{opacity:1;transform:translate3d(0,0,0)} to{opacity:0;transform:translate3d(-6px,0,0)} }
        @keyframes pki-out   { from{opacity:1} to{opacity:0} }
        @keyframes pki-gin   { from{opacity:0;transform:scale(.9)} to{opacity:1;transform:scale(1)} }
        @keyframes pki-ptilt { from{transform:translate3d(0,0,0) rotate(0deg) scale(1)} to{transform:translate3d(0,0,0) rotate(16deg) scale(1)} }
        @keyframes pki-pmove { from{transform:translate3d(0,0,0) rotate(16deg) scale(1)} to{transform:translate3d(var(--dx,0px),var(--dy,0px),0) rotate(16deg) scale(var(--s,2))} }
        @keyframes pki-pcol  { from{color:#0B2A6F} to{color:#F6F5F2} }
        @keyframes pki-pfade { from{opacity:1} to{opacity:0} }
        @keyframes pki-dotin { to{transform:rotate(45deg) scale(1)} }
        @keyframes pki-pop   { to{opacity:1;transform:none} }
        @keyframes pki-draw  { to{stroke-dashoffset:0} }
        @keyframes pki-npop  { to{transform:scale(1)} }
        @media (prefers-reduced-motion:reduce) {
          .pki-stage * { animation-duration:.01ms !important; animation-delay:0s !important; }
          .pki-wm { display:none; }
        }
      `}</style>

      {/* Full-screen overlay */}
      <div ref={overlayRef} className="pki-overlay" aria-hidden="true">
        <div ref={stageRef} className="pki-stage pki-hold">
          {/* Wordmark */}
          <div className="pki-wm" aria-hidden="true">
            <span className="pki-w pki-a">
              <span className="pki-pp">
                <span className="pki-gl">p</span>
                <span className="pki-gu">P</span>
              </span>
              <span className="pki-c" style={{ ['--d' as any]: '2.4s'  }}>r</span>
              <span className="pki-c" style={{ ['--d' as any]: '2.35s' }}>o</span>
              <span className="pki-c" style={{ ['--d' as any]: '2.3s'  }}>j</span>
              <span className="pki-c" style={{ ['--d' as any]: '2.25s' }}>e</span>
              <span className="pki-c" style={{ ['--d' as any]: '2.2s'  }}>c</span>
              <span className="pki-c" style={{ ['--d' as any]: '2.15s' }}>t</span>
              <span className="pki-c" style={{ ['--d' as any]: '2.1s'  }}>s</span>
            </span>
            <span className="pki-dot" />
            <span className="pki-w pki-k">
              <span className="pki-c" style={{ ['--d' as any]: '2s'    }}>k</span>
              <span className="pki-c" style={{ ['--d' as any]: '1.95s' }}>i</span>
              <span className="pki-c" style={{ ['--d' as any]: '1.9s'  }}>t</span>
            </span>
          </div>

          {/* Logo diamond (the element we FLIP from) */}
          <div ref={logoRef} className="pki-logo">
            <svg viewBox="0 0 1930 1930" role="img" aria-label="projects.kit logo">
              <defs>
                <mask id="pki-cut" maskUnits="userSpaceOnUse" x="0" y="0" width="1930" height="1930">
                  <rect width="1930" height="1930" fill="#fff" />
                  <g fill="none" stroke="#000" strokeWidth="105">
                    <path className="pki-ed pki-e1" pathLength="1" d="M928 585L770 1135" />
                    <path className="pki-ed pki-e2" pathLength="1" d="M928 585L1345 1005" />
                    <path className="pki-ed pki-e3" pathLength="1" d="M770 1135L1345 1005" />
                    <path className="pki-ed pki-e4" pathLength="1" d="M770 1135L587 1732" />
                  </g>
                  <g fill="#000">
                    <g className="pki-np pki-n1"><circle className="pki-pl" cx="928"  cy="585"  r="165" /></g>
                    <g className="pki-np pki-n2"><circle className="pki-pl" cx="1345" cy="1005" r="165" /></g>
                    <g className="pki-np pki-n3"><circle className="pki-pl" cx="770"  cy="1135" r="165" /></g>
                  </g>
                </mask>
              </defs>
              <polygon
                points="965,413.5 1516.5,965 965,1516.5 413.5,965"
                fill="#1C3A7F" stroke="#1C3A7F"
                strokeWidth="600" strokeLinejoin="round"
                mask="url(#pki-cut)"
              />
            </svg>
          </div>

          <div role="status" className="pki-sr">Loading projects.kit…</div>
        </div>
      </div>

      {/* Flying logo — positioned by JS, invisible until transition */}
      <div ref={flyingLogoRef} className="pki-flying" aria-hidden="true">
        <svg viewBox="0 0 1930 1930" role="img" aria-label="projects.kit logo">
          <defs>
            <mask id="pki-fly-cut" maskUnits="userSpaceOnUse" x="0" y="0" width="1930" height="1930">
              <rect width="1930" height="1930" fill="#fff" />
              <g fill="none" stroke="#000" strokeWidth="105">
                <line x1="928" y1="585"  x2="770"  y2="1135" />
                <line x1="928" y1="585"  x2="1345" y2="1005" />
                <line x1="770" y1="1135" x2="1345" y2="1005" />
                <line x1="770" y1="1135" x2="587"  y2="1732" />
              </g>
              <g fill="#000">
                <circle cx="928"  cy="585"  r="165" />
                <circle cx="1345" cy="1005" r="165" />
                <circle cx="770"  cy="1135" r="165" />
              </g>
            </mask>
          </defs>
          <polygon
            points="965,413.5 1516.5,965 965,1516.5 413.5,965"
            fill="#1C3A7F" stroke="#1C3A7F"
            strokeWidth="600" strokeLinejoin="round"
            mask="url(#pki-fly-cut)"
          />
        </svg>
      </div>
    </>
  );
}

export default PageIntroAnimation;
