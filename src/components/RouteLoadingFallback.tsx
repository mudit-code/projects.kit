'use client';

import React, { useEffect, useState } from 'react';
import { KitScreenLoader } from './KitScreenLoader';

export interface RouteLoadingFallbackProps {
  showText?: boolean;
}

export function RouteLoadingFallback({ showText = false }: RouteLoadingFallbackProps) {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    // 0–50 ms: Do not show a loader.
    // Over 50 ms: Show the centered screenloader.
    const timer = setTimeout(() => {
      setShouldShow(true);
      if (typeof document !== 'undefined') {
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        document.body.style.touchAction = 'none';
      }
    }, 50);

    return () => {
      clearTimeout(timer);
      if (typeof document !== 'undefined') {
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
        document.body.style.touchAction = '';
      }
    };
  }, []);

  if (!shouldShow) return null;

  return (
    <div
      aria-label="Loading content..."
      className="fixed inset-0 z-[99998] flex items-center justify-center bg-[#F6F5F2]/95 backdrop-blur-md pointer-events-auto"
    >
      <KitScreenLoader
        fullScreen={false}
        showText={showText}
        loop={true}
        duration={1.25}
        transparent={true}
      />
    </div>
  );
}

export default RouteLoadingFallback;
