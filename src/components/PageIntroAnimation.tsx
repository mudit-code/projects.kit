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
  /** Ref to the desktop hero logo wrapper element in the landing page */
  heroLogoRef: React.RefObject<HTMLElement | null>;
  /** Optional ref to the mobile hero logo wrapper element */
  mobileHeroLogoRef?: React.RefObject<HTMLElement | null>;
  /** Fired when the overlay is completely gone */
  onComplete: () => void;
  /** Fired when the logo starts moving — page should begin fading in */
  onStartReveal: () => void;
}

// 1.5x faster timing: 4800 / 1.5 = 3200ms
const LOGO_CONSTRUCT_MS = 3200; // logo fully drawn by this point
const FLY_DURATION_MS   = 380;  // logo-fly + overlay-fade duration (smooth FLIP transition)
const REVEAL_DELAY_MS   = 50;   // offset before page fade starts

export function PageIntroAnimation({
  heroLogoRef,
  mobileHeroLogoRef,
  onComplete,
  onStartReveal,
}: PageIntroAnimationProps) {
  const stageRef      = useRef<HTMLDivElement | null>(null);
  const logoRef       = useRef<HTMLDivElement | null>(null);
  const overlayRef    = useRef<HTMLDivElement | null>(null);
  const flyingLogoRef = useRef<HTMLDivElement | null>(null);
  const [phase, setPhase] = useState<Phase>('playing');

  // Stable refs for callbacks and element refs to avoid re-triggering timers on re-render
  const onStartRevealRef = useRef(onStartReveal);
  const onCompleteRef    = useRef(onComplete);
  const heroLogoRefCurrent = useRef(heroLogoRef);
  const mobileHeroLogoRefCurrent = useRef(mobileHeroLogoRef);

  useEffect(() => {
    onStartRevealRef.current = onStartReveal;
    onCompleteRef.current    = onComplete;
    heroLogoRefCurrent.current = heroLogoRef;
    mobileHeroLogoRefCurrent.current = mobileHeroLogoRef;
  });

  const hasStartedRef  = useRef(false);
  const hasFinishedRef = useRef(false);

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

  // Finish immediately (used for skips, escapes, or failsafes)
  const finishImmediately = useCallback(() => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;

    const overlay = overlayRef.current;
    if (overlay) {
      overlay.style.transition = 'opacity 200ms ease';
      overlay.style.opacity    = '0';
      overlay.style.pointerEvents = 'none';
    }

    onStartRevealRef.current();
    setTimeout(() => {
      setPhase('done');
      onCompleteRef.current();
    }, 220);
  }, []);

  // FLIP transition: fly logo from centre → hero position (supports PC and Mobile)
  const startFlyTransition = useCallback(() => {
    if (hasFinishedRef.current) return;

    const logoEl   = logoRef.current;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    // Pick active hero container and fallback if width/height is 0 (hidden responsive container)
    let activeHeroContainer = (isMobile && mobileHeroLogoRefCurrent.current?.current)
      ? mobileHeroLogoRefCurrent.current.current
      : (heroLogoRefCurrent.current?.current || mobileHeroLogoRefCurrent.current?.current);

    if (activeHeroContainer && (activeHeroContainer.offsetWidth === 0 || activeHeroContainer.offsetHeight === 0)) {
      const alt = isMobile ? heroLogoRefCurrent.current?.current : mobileHeroLogoRefCurrent.current?.current;
      if (alt && alt.offsetWidth > 0 && alt.offsetHeight > 0) {
        activeHeroContainer = alt;
      }
    }

    const flyingEl = flyingLogoRef.current;
    const overlay  = overlayRef.current;

    const targetSvg = activeHeroContainer?.querySelector('svg') || activeHeroContainer;
    const sourceSvg = logoEl?.querySelector('svg') || logoEl;

    // Fallback: pure cross-fade if target elements aren't ready
    if (!sourceSvg || !targetSvg || !flyingEl || !overlay) {
      if (overlay) {
        overlay.style.transition = `opacity ${FLY_DURATION_MS}ms ease`;
        overlay.style.opacity    = '0';
        overlay.style.pointerEvents = 'none';
      }
      setTimeout(() => onStartRevealRef.current(), REVEAL_DELAY_MS);
      setPhase('flying');
      setTimeout(() => {
        hasFinishedRef.current = true;
        setPhase('done');
        onCompleteRef.current();
      }, FLY_DURATION_MS + 40);
      return;
    }

    const from = sourceSvg.getBoundingClientRect();
    const to   = targetSvg.getBoundingClientRect();

    // Guard against 0-dimension target (e.g. collapsed or not yet painted)
    if (to.width === 0 || to.height === 0) {
      if (overlay) {
        overlay.style.transition = `opacity ${FLY_DURATION_MS}ms ease`;
        overlay.style.opacity    = '0';
        overlay.style.pointerEvents = 'none';
      }
      setTimeout(() => onStartRevealRef.current(), REVEAL_DELAY_MS);
      setPhase('flying');
      setTimeout(() => {
        hasFinishedRef.current = true;
        setPhase('done');
        onCompleteRef.current();
      }, FLY_DURATION_MS + 40);
      return;
    }

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
      zIndex:         '100000',
    });

    // Hide static logo in the stage so it does not duplicate during flight
    if (logoEl) {
      logoEl.style.opacity = '0';
    }

    // Force reflow so browser registers starting geometry
    void flyingEl.offsetWidth;

    // Smooth physics-based FLIP flight straight into the page position
    const easing = 'cubic-bezier(.22, 1, .36, 1)';
    flyingEl.style.transition = [
      `left ${FLY_DURATION_MS}ms ${easing}`,
      `top ${FLY_DURATION_MS}ms ${easing}`,
      `width ${FLY_DURATION_MS}ms ${easing}`,
      `height ${FLY_DURATION_MS}ms ${easing}`,
    ].join(', ');

    Object.assign(flyingEl.style, {
      left:    `${to.left}px`,
      top:     `${to.top}px`,
      width:   `${to.width}px`,
      height:  `${to.height}px`,
    });

    // Fade the overlay background simultaneously
    overlay.style.transition    = `opacity ${FLY_DURATION_MS}ms ease`;
    overlay.style.opacity       = '0';
    overlay.style.pointerEvents = 'none';

    // Reveal page content around the landing logo
    setTimeout(() => onStartRevealRef.current(), REVEAL_DELAY_MS);
    setPhase('flying');

    // Settle cleanly into the page
    setTimeout(() => {
      hasFinishedRef.current = true;
      setPhase('done');
      onCompleteRef.current();
    }, FLY_DURATION_MS + 40);
  }, []);

  // Start animation once mounted
  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    const s = stageRef.current;
    if (s) {
      s.className = 'pki-stage pki-hold';
    }

    let flyTimer: ReturnType<typeof setTimeout>;

    const startAnimation = () => {
      if (!stageRef.current || hasFinishedRef.current) return;
      prep(stageRef.current);
      stageRef.current.classList.remove('pki-hold');
      flyTimer = setTimeout(startFlyTransition, LOGO_CONSTRUCT_MS);
    };

    // Safety watchdog: guarantees page content reveals even if fonts/timers ever stutter
    const watchdogTimer = setTimeout(() => {
      if (!hasFinishedRef.current) {
        onStartRevealRef.current();
        setTimeout(() => {
          hasFinishedRef.current = true;
          setPhase('done');
          onCompleteRef.current();
        }, 350);
      }
    }, LOGO_CONSTRUCT_MS + FLY_DURATION_MS + 500);

    // Escape key listener to skip intro
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        finishImmediately();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    if (typeof document !== 'undefined' && document.fonts?.ready) {
      Promise.race([
        document.fonts.ready,
        new Promise<void>((res) => setTimeout(res, 350)),
      ]).then(startAnimation);
    } else {
      startAnimation();
    }

    return () => {
      clearTimeout(flyTimer);
      clearTimeout(watchdogTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [prep, startFlyTransition, finishImmediately]);

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
        .pki-w  { display:inline-block; opacity:0; animation:pki-rise .6s cubic-bezier(.22,1,.36,1) forwards; }
        .pki-a  { animation-delay:.1s; }
        .pki-k  { animation-delay:.53s; }
        .pki-c  { display:inline-block; animation:pki-er .12s ease-in var(--d) forwards; }
        .pki-pp {
          display:inline-grid; align-items:baseline; justify-items:start;
          transform-origin: center center;
          will-change: transform, opacity, color;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          transform-style: preserve-3d;
          animation:
            pki-pflight .77s cubic-bezier(.4, 0, .2, 1) 1.9s forwards,
            pki-pcol  .27s ease 2.33s forwards,
            pki-pfade .47s ease 2.67s forwards;
        }
        .pki-pp * {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          will-change: transform, opacity;
        }
        .pki-gl { grid-area:1/1; animation:pki-out .17s ease 1.7s forwards; }
        .pki-gu { grid-area:1/1; opacity:0; animation:pki-gin .2s cubic-bezier(.22,1,.36,1) 1.7s forwards; }
        .pki-dot {
          display:inline-block; width:.2em; height:.2em; margin:0 .1em;
          background:#1C3A7F; border-radius:.05em;
          transform:rotate(45deg) scale(0);
          animation:
            pki-dotin .4s cubic-bezier(.22,1.4,.4,1) .4s  forwards,
            pki-out   .12s ease-in 1.37s forwards;
        }
        .pki-logo {
          position:absolute; inset:0; z-index:1; margin:auto;
          width:min(46vw,200px); height:min(46vw,200px);
          opacity:0; transform:scale(.2) rotate(-90deg);
          /* No lbeat / heartbeat — V3 stays static after construction */
          animation:pki-pop .53s cubic-bezier(.2,1.3,.3,1) 1.93s forwards;
        }
        .pki-stage svg { display:block; width:100%; height:100%; }
        .pki-ed { stroke-dasharray:1; stroke-dashoffset:1; animation:pki-draw .33s ease-out forwards; }
        .pki-e1 { animation-delay:2.6s;  } .pki-e2 { animation-delay:2.67s; }
        .pki-e3 { animation-delay:2.73s; } .pki-e4 { animation-delay:2.8s;  }
        .pki-np {
          transform-box:fill-box; transform-origin:center; transform:scale(0);
          animation:pki-npop .3s cubic-bezier(.2,1.6,.4,1) forwards;
        }
        .pki-n1 { animation-delay:2.57s; } .pki-n2 { animation-delay:2.63s; } .pki-n3 { animation-delay:2.7s; }
        .pki-pl { transform-box:fill-box; transform-origin:center; }
        /* No .pki-done .pki-pl heartbeat — intentional for V3 */
        .pki-sr { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); }
        .pki-flying { display:none; z-index:100000; pointer-events:none; }
        .pki-flying svg { display:block; width:100%; height:100%; }

        @keyframes pki-rise    { from{opacity:0;transform:translate3d(0,12px,0)} to{opacity:1;transform:translate3d(0,0,0)} }
        @keyframes pki-er      { from{opacity:1;transform:translate3d(0,0,0)} to{opacity:0;transform:translate3d(-6px,0,0)} }
        @keyframes pki-out     { from{opacity:1} to{opacity:0} }
        @keyframes pki-gin     { from{opacity:0;transform:scale(.9)} to{opacity:1;transform:scale(1)} }
        @keyframes pki-pflight {
          0%   { transform:translate3d(0,0,0) rotate(0deg) scale(1); }
          35%  { transform:translate3d(0,0,0) rotate(16deg) scale(1); }
          100% { transform:translate3d(var(--dx,0px),var(--dy,0px),0) rotate(16deg) scale(var(--s,2)); }
        }
        @keyframes pki-ptilt   { from{transform:translate3d(0,0,0) rotate(0deg) scale(1)} to{transform:translate3d(0,0,0) rotate(16deg) scale(1)} }
        @keyframes pki-pmove   { from{transform:translate3d(0,0,0) rotate(16deg) scale(1)} to{transform:translate3d(var(--dx,0px),var(--dy,0px),0) rotate(16deg) scale(var(--s,2))} }
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

      {/* Full-screen overlay (tap or click to skip directly to page) */}
      <div
        ref={overlayRef}
        className="pki-overlay cursor-pointer select-none"
        onClick={finishImmediately}
        aria-hidden="true"
        title="Tap or click to enter"
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            finishImmediately();
          }}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 px-3 py-1 rounded-full bg-slate-200/60 hover:bg-slate-300/80 active:scale-95 text-[#0B2A6F] text-[11px] font-semibold tracking-wide uppercase transition-all z-10 cursor-pointer"
        >
          Skip
        </button>
        <div ref={stageRef} className="pki-stage pki-hold">
          {/* Wordmark */}
          <div className="pki-wm" aria-hidden="true">
            <span className="pki-w pki-a">
              <span className="pki-pp">
                <span className="pki-gl">p</span>
                <span className="pki-gu">P</span>
              </span>
              <span className="pki-c" style={{ ['--d' as any]: '1.6s'  }}>r</span>
              <span className="pki-c" style={{ ['--d' as any]: '1.57s' }}>o</span>
              <span className="pki-c" style={{ ['--d' as any]: '1.53s' }}>j</span>
              <span className="pki-c" style={{ ['--d' as any]: '1.5s'  }}>e</span>
              <span className="pki-c" style={{ ['--d' as any]: '1.47s' }}>c</span>
              <span className="pki-c" style={{ ['--d' as any]: '1.43s' }}>t</span>
              <span className="pki-c" style={{ ['--d' as any]: '1.4s'  }}>s</span>
            </span>
            <span className="pki-dot" />
            <span className="pki-w pki-k">
              <span className="pki-c" style={{ ['--d' as any]: '1.33s' }}>k</span>
              <span className="pki-c" style={{ ['--d' as any]: '1.3s'  }}>i</span>
              <span className="pki-c" style={{ ['--d' as any]: '1.27s' }}>t</span>
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
