'use client';

import React, { useEffect, useState } from 'react';

export interface KitScreenLoaderProps {
  /** Fullscreen overlay mode */
  fullScreen?: boolean;
  /** Size of the loader */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Whether to show the text below the logo */
  showText?: boolean;
  /** Custom status / loading message displayed underneath */
  message?: string;
  /** Whether to show the progress bar line */
  showProgressBar?: boolean;
  /** Additional custom class */
  className?: string;
  /** Background transparency */
  transparent?: boolean;
  /** Whether the animation loops continuously */
  loop?: boolean;
  /** Speed of the animation loop in seconds */
  duration?: number;
  /** Controlled progress (0 to 100) */
  progress?: number;
  /** Signal that the page has finished loading to smoothly fill the line to 100% and finish */
  isComplete?: boolean;
  /** Callback fired when progress reaches 100% and finishes */
  onComplete?: () => void;
}

export function KitScreenLoader({
  fullScreen = false,
  size = 'md',
  showText = true,
  message,
  showProgressBar = true,
  className = '',
  transparent = false,
  loop = true,
  duration = 1.25,
  progress,
  isComplete = false,
  onComplete,
}: KitScreenLoaderProps) {
  const [internalProgress, setInternalProgress] = useState(12);

  // Download-style progressive line (crawls forward and ends only when page loads)
  useEffect(() => {
    if (typeof progress === 'number') {
      setInternalProgress(progress);
      return;
    }

    if (isComplete) {
      setInternalProgress(100);
      const timer = setTimeout(() => {
        onComplete?.();
      }, 260);
      return () => clearTimeout(timer);
    }

    // Incrementally advance like a download bar while waiting for page load
    const interval = setInterval(() => {
      setInternalProgress((prev) => {
        if (prev >= 92) return 92; // Wait near 92% until page finishes loading
        const diff = 92 - prev;
        const step = Math.max(1, Math.ceil(diff * 0.16));
        return Math.min(92, prev + step);
      });
    }, 90);

    return () => clearInterval(interval);
  }, [progress, isComplete, onComplete]);

  const currentProgress = typeof progress === 'number' ? progress : internalProgress;

  // Dimensions & typography scaling
  const sizeMap = {
    sm: {
      logoWidth: 'w-36 sm:w-44',
      barWidth: 'w-36 sm:w-44',
      textEng: 'text-xs sm:text-sm',
      textSub: 'text-[10px]',
      gap: 'gap-0.5',
    },
    md: {
      logoWidth: 'w-52 sm:w-64',
      barWidth: 'w-48 sm:w-60',
      textEng: 'text-sm sm:text-base',
      textSub: 'text-[11px] sm:text-xs',
      gap: 'gap-1',
    },
    lg: {
      logoWidth: 'w-64 sm:w-80',
      barWidth: 'w-60 sm:w-72',
      textEng: 'text-base sm:text-lg',
      textSub: 'text-xs sm:text-sm',
      gap: 'gap-1.5',
    },
    xl: {
      logoWidth: 'w-80 sm:w-96',
      barWidth: 'w-72 sm:w-84',
      textEng: 'text-lg sm:text-xl',
      textSub: 'text-sm',
      gap: 'gap-2',
    },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  const content = (
    <div className={`relative flex flex-col items-center justify-center select-none ${className}`}>
      {/* Keyframe Animations - Pure blinking (opacity only, zero heartbeat scale) */}
      <style>{`
        @keyframes kit-pure-blink {
          0%, 100% {
            opacity: 0.2;
          }
          50% {
            opacity: 1;
          }
        }
        @keyframes kit-dot-fade {
          0%, 100% {
            opacity: 0.25;
          }
          50% {
            opacity: 1;
          }
        }
        .animate-kit-blink {
          animation: kit-pure-blink ${duration}s ease-in-out infinite;
        }
        .animate-kit-dot-1 {
          animation: kit-dot-fade 1.2s ease-in-out 0s infinite;
        }
        .animate-kit-dot-2 {
          animation: kit-dot-fade 1.2s ease-in-out 0.2s infinite;
        }
        .animate-kit-dot-3 {
          animation: kit-dot-fade 1.2s ease-in-out 0.4s infinite;
        }
      `}</style>

      {/* Main Logo Container - Stationary size, pure opacity blinking */}
      <div className="relative flex items-center justify-center animate-kit-blink py-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/kit.png"
          alt="KIT Logo"
          className={`${currentSize.logoWidth} h-auto object-contain select-none pointer-events-none transition-all duration-300`}
        />
      </div>

      {/* Typography Section - Solid colors, no gradients */}
      {showText && (
        <div className={`flex flex-col items-center justify-center text-center mt-3 ${currentSize.gap}`}>
          {/* Institutional Title */}
          <span className={`${currentSize.textEng} font-extrabold leading-none tracking-tight text-[#0D3481] select-none lowercase`}>
            projects.kit
          </span>
          {/* Subtitle */}
          <span className={`${currentSize.textSub} font-semibold text-slate-400 tracking-wider uppercase leading-none mt-1 select-none`}>
            Kanpur Institute of Technology
          </span>
        </div>
      )}

      {/* Download-Style Progress Bar Line (Fills across as page loads, ends at 100% when loaded, NO percentage text) */}
      {(showProgressBar || message) && (
        <div className="flex flex-col items-center mt-4">
          {showProgressBar && (
            <div className={`${currentSize.barWidth} h-1.5 bg-slate-200/90 rounded-full overflow-hidden relative shadow-inner`}>
              <div 
                className="h-full bg-[#0D3481] rounded-full transition-all duration-300 ease-out"
                style={{ width: `${currentProgress}%` }}
              />
            </div>
          )}

          {/* Status Message or Animated Kit Blue Dots */}
          <div className="flex items-center justify-center gap-1.5 mt-2.5">
            {message ? (
              <span className="text-xs sm:text-sm font-medium text-slate-500">
                {message}
              </span>
            ) : (
              <div className="flex items-center gap-1.5 py-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0D3481] animate-kit-dot-1" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#0D3481] animate-kit-dot-2" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#0D3481] animate-kit-dot-3" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div 
        className={`fixed inset-0 z-[99999] flex items-center justify-center ${
          transparent ? 'bg-[#F6F5F2]/90 backdrop-blur-md' : 'bg-[#F6F5F2]'
        } transition-all duration-300`}
      >
        {content}
      </div>
    );
  }

  return content;
}

// Aliases for parity with Udyam Sandhi
export const KitPipelineLoader = KitScreenLoader;
export const LogoLoader = KitScreenLoader;
export default KitScreenLoader;
