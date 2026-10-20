'use client';

import React, { useEffect, useState } from 'react';
import { KitScreenLoader } from './KitScreenLoader';

export interface RouteLoadingFallbackProps {
  showText?: boolean;
}

export function RouteLoadingFallback({ showText = false }: RouteLoadingFallbackProps) {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    // Over 100 ms: Show the centered screenloader with heartbeat animation.
    const timer = setTimeout(() => {
      setShouldShow(true);
      if (typeof document !== 'undefined') {
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        document.body.style.touchAction = 'none';
      }
    }, 100);

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
        mode="heartbeat"
        fullScreen={false}
        showText={showText}
        showProgressBar={true}
        transparent={true}
      />
    </div>
  );
}

export default RouteLoadingFallback;
