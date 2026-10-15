'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { KitScreenLoader } from './KitScreenLoader';

// Helper to determine if a route is inside the main dashboard suite
export function isDashboardPath(path: string | null): boolean {
  if (!path) return false;
  const dashboardPrefixes = [
    '/',
    '/dashboard',
    '/roles',
    '/students',
    '/projects',
  ];
  return dashboardPrefixes.some((prefix) => path === prefix || (prefix !== '/' && path.startsWith(prefix + '/')));
}

export interface StartNavigationOptions {
  immediate?: boolean;
}

export interface LoadingContextType {
  isDashboardTabLoading: boolean;
  isNavComplete: boolean;
  startNavigation: (targetPath: string, options?: StartNavigationOptions) => void;
  endNavigation: () => void;
  startLoading: () => void;
  stopLoading: () => void;
}

export const LoadingContext = createContext<LoadingContextType>({
  isDashboardTabLoading: false,
  isNavComplete: false,
  startNavigation: () => {},
  endNavigation: () => {},
  startLoading: () => {},
  stopLoading: () => {},
});

export const useLoading = () => useContext(LoadingContext);

// Utility to cleanly toggle scroll locking on both html and body
const setScrollLocked = (locked: boolean) => {
  if (typeof document === 'undefined') return;
  if (locked) {
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
  } else {
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
  }
};

export function PageLoadingProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // 1. Initial Website Load & Browser Refresh State:
  // Starts TRUE so that on first visit AND on every browser refresh (F5/reload/hard refresh),
  // the screen loader appears immediately with NO flash of unfinished page!
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isInitialFadingOut, setIsInitialFadingOut] = useState(false);
  const [isInitialComplete, setIsInitialComplete] = useState(false);
  const initialMountRef = useRef(true);

  // 2. Full-View Loader State (navigation outside dashboard or to login, over 50ms only)
  const [isFullViewLoading, setIsFullViewLoading] = useState(false);

  // 3. In-Tab Dashboard Loader State (navigation inside dashboard tabs, over 50ms only)
  const [isDashboardTabLoading, setIsDashboardTabLoading] = useState(false);
  const [isNavComplete, setIsNavComplete] = useState(false);

  const navTimerRef = useRef<NodeJS.Timeout | null>(null);
  const failsafeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isNavigatingRef = useRef(false);

  // Promptly reveal site once initial intro animation sequence completes
  const handleInitialComplete = useCallback(() => {
    setIsInitialFadingOut(true);
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 200); // Crisp fade transition into site
    return () => clearTimeout(timer);
  }, []);

  // When initial page has finished loading (DOM ready / window load), complete the loader line
  useEffect(() => {
    if (!isInitialLoading) return;

    const onReady = () => {
      setIsInitialComplete(true);
    };

    let timer: NodeJS.Timeout;
    if (typeof document !== 'undefined' && document.readyState === 'complete') {
      timer = setTimeout(onReady, 500);
    } else if (typeof window !== 'undefined') {
      const handleLoad = () => {
        timer = setTimeout(onReady, 350);
      };
      window.addEventListener('load', handleLoad);
      const fallbackTimer = setTimeout(onReady, 900);
      return () => {
        window.removeEventListener('load', handleLoad);
        clearTimeout(timer);
        clearTimeout(fallbackTimer);
      };
    } else {
      timer = setTimeout(onReady, 650);
    }

    return () => clearTimeout(timer);
  }, [isInitialLoading]);

  // Lock body scroll while full-screen loaders (initial or outside dashboard full-view) are active
  useEffect(() => {
    if (isInitialLoading || isFullViewLoading) {
      setScrollLocked(true);
    } else {
      setScrollLocked(false);
    }
    return () => {
      setScrollLocked(false);
    };
  }, [isInitialLoading, isFullViewLoading]);

  // End subsequent navigation immediately after smoothly completing the download line
  const endNavigation = useCallback(() => {
    if (navTimerRef.current) {
      clearTimeout(navTimerRef.current);
      navTimerRef.current = null;
    }
    if (failsafeTimerRef.current) {
      clearTimeout(failsafeTimerRef.current);
      failsafeTimerRef.current = null;
    }
    isNavigatingRef.current = false;

    // Glide download line to 100%
    setIsNavComplete(true);

    // Promptly close loader after 100% animation completes
    setTimeout(() => {
      setIsFullViewLoading(false);
      setIsDashboardTabLoading(false);
      setIsNavComplete(false);
    }, 260);
  }, []);

  // Start subsequent navigation with 50ms debounce (or immediate if requested)
  const startNavigation = useCallback((targetPath: string, options?: StartNavigationOptions) => {
    if (navTimerRef.current) {
      clearTimeout(navTimerRef.current);
      navTimerRef.current = null;
    }
    if (failsafeTimerRef.current) {
      clearTimeout(failsafeTimerRef.current);
      failsafeTimerRef.current = null;
    }

    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    // If staying on the same path, don't trigger loader
    if (!targetPath || targetPath === currentPath) {
      return;
    }

    isNavigatingRef.current = true;
    const isCurrentDash = isDashboardPath(currentPath);
    const isTargetDash = isDashboardPath(targetPath);
    const isInsideDashboard = isCurrentDash && isTargetDash;

    if (options?.immediate) {
      if (isInsideDashboard || isTargetDash) {
        setIsDashboardTabLoading(true);
        setIsFullViewLoading(false);
      } else {
        setIsFullViewLoading(true);
        setIsDashboardTabLoading(false);
      }
    } else {
      // 0–50 ms: Do not show a loader.
      // Over 50 ms: Show the appropriate loader.
      navTimerRef.current = setTimeout(() => {
        if (!isNavigatingRef.current) return;

        if (isInsideDashboard || isTargetDash) {
          setIsDashboardTabLoading(true);
          setIsFullViewLoading(false);
        } else {
          setIsFullViewLoading(true);
          setIsDashboardTabLoading(false);
        }
      }, 50);
    }

    // Failsafe: Ensure loading state always resolves promptly even on error/network drop
    failsafeTimerRef.current = setTimeout(() => {
      endNavigation();
    }, 8000);
  }, [endNavigation]);

  const startLoading = useCallback(() => {
    isNavigatingRef.current = true;
    setIsDashboardTabLoading(true);
    if (failsafeTimerRef.current) clearTimeout(failsafeTimerRef.current);
    failsafeTimerRef.current = setTimeout(() => {
      endNavigation();
    }, 8000);
  }, [endNavigation]);

  const stopLoading = useCallback(() => {
    endNavigation();
  }, [endNavigation]);

  // Handle Route Changes when pathname updates
  useEffect(() => {
    if (initialMountRef.current) {
      initialMountRef.current = false;
      return;
    }

    // Pathname changed! The target route content has loaded and is now rendering.
    endNavigation();
  }, [pathname, endNavigation]);

  // Intercept internal link clicks and history navigation for subsequent loading
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;

      const target = (e.target as HTMLElement).closest('a');
      if (!target) return;

      const href = target.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      if (target.target && target.target !== '_self') return;
      if (target.hasAttribute('download')) return;

      try {
        const url = new URL(target.href, window.location.href);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === window.location.pathname) return;

        startNavigation(url.pathname);
      } catch {
        // Ignore invalid URL
      }
    };

    const handlePopState = () => {
      if (window.location.pathname !== pathname) {
        startNavigation(window.location.pathname);
      }
    };

    // Listen to pushState for programmatic router.push to DIFFERENT routes
    const originalPushState = window.history.pushState;

    window.history.pushState = function (...args) {
      const url = args[2];
      if (url && typeof url === 'string') {
        try {
          const parsed = new URL(url, window.location.href);
          if (parsed.pathname !== window.location.pathname) {
            startNavigation(parsed.pathname);
          }
        } catch {
          // Ignore
        }
      }
      return originalPushState.apply(this, args);
    };

    // Error & Cancellation resolution: Ensure loading state always resolves
    const handleError = () => endNavigation();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') endNavigation();
    };

    document.addEventListener('click', handleLinkClick, true);
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleError);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('click', handleLinkClick, true);
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleError);
      window.removeEventListener('keydown', handleKeyDown);
      window.history.pushState = originalPushState;
    };
  }, [startNavigation, endNavigation, pathname]);

  return (
    <LoadingContext.Provider
      value={{
        isDashboardTabLoading,
        isNavComplete,
        startNavigation,
        endNavigation,
        startLoading,
        stopLoading,
      }}
    >
      {/* 1. INITIAL LOAD & REFRESH LOADER: Screen loader with download line that completes when page loads */}
      {isInitialLoading && (
        <div
          aria-hidden="true"
          className={`fixed inset-0 z-[99999] flex items-center justify-center transition-opacity duration-200 ease-out ${
            isInitialFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
          }`}
          style={{ backgroundColor: '#F6F5F2' }}
        >
          <KitScreenLoader
            showText={true}
            isComplete={isInitialComplete}
            onComplete={handleInitialComplete}
            fullScreen={false}
            transparent={true}
          />
        </div>
      )}

      {/* 2. SUBSEQUENT FULL-VIEW LOADING (Outside dashboard only, over 50ms) */}
      {!isInitialLoading && isFullViewLoading && (
        <div 
          aria-hidden="true" 
          className="fixed inset-0 z-[99998] flex items-center justify-center bg-[#F6F5F2]/95 backdrop-blur-md pointer-events-auto transition-opacity duration-150"
        >
          <KitScreenLoader
            showText={false}
            isComplete={isNavComplete}
            fullScreen={false}
            transparent={true}
          />
        </div>
      )}

      {children}
    </LoadingContext.Provider>
  );
}

export default PageLoadingProvider;
