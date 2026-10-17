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
    '/forms',
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
  dismissNavLoader: () => void;
  startLoading: () => void;
  stopLoading: () => void;
}

export const LoadingContext = createContext<LoadingContextType>({
  isDashboardTabLoading: false,
  isNavComplete: false,
  startNavigation: () => {},
  endNavigation: () => {},
  dismissNavLoader: () => {},
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

    // If the document is already fully loaded, signal immediately
    if (typeof document !== 'undefined' && document.readyState === 'complete') {
      onReady();
      return;
    }

    // Otherwise wait for the load event
    if (typeof window !== 'undefined') {
      const handleLoad = () => {
        onReady();
      };
      window.addEventListener('load', handleLoad);
      // Failsafe: if load event never fires (shouldn't happen), resolve after 5s
      const fallbackTimer = setTimeout(onReady, 5000);
      return () => {
        window.removeEventListener('load', handleLoad);
        clearTimeout(fallbackTimer);
      };
    }

    // SSR fallback
    onReady();
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

  // Dismiss the loader overlay (called by KitScreenLoader's onComplete after bar animation finishes)
  const dismissNavLoader = useCallback(() => {
    setIsFullViewLoading(false);
    setIsDashboardTabLoading(false);
    setIsNavComplete(false);
  }, []);

  // Signal navigation complete: fills the bar to 100%, loader stays visible until onComplete fires
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

    // If no loader is showing (fast nav completed before debounce), just clean up
    setIsNavComplete((prev) => {
      // This runs synchronously — if neither loader is showing, we don't need to animate
      return true;
    });

    // Failsafe: if onComplete somehow doesn't fire, dismiss after 500ms
    setTimeout(() => {
      dismissNavLoader();
    }, 500);
  }, [dismissNavLoader]);

  // Start subsequent navigation — dashboard tab loads show immediately, others debounce 50ms
  const startNavigation = useCallback((targetPath: string, options?: StartNavigationOptions) => {
    if (navTimerRef.current) {
      clearTimeout(navTimerRef.current);
      navTimerRef.current = null;
    }
    if (failsafeTimerRef.current) {
      clearTimeout(failsafeTimerRef.current);
      failsafeTimerRef.current = null;
    }

    // Reset completion state for new navigation
    setIsNavComplete(false);

    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    // If staying on the same path, don't trigger loader
    if (!targetPath || targetPath === currentPath) {
      return;
    }

    isNavigatingRef.current = true;
    const isCurrentDash = isDashboardPath(currentPath);
    const isTargetDash = isDashboardPath(targetPath);
    const isInsideDashboard = isCurrentDash && isTargetDash;

    // Dashboard-to-dashboard: show tab loader IMMEDIATELY (no debounce)
    // so the progress bar is always visible when switching tabs
    if (isInsideDashboard || isTargetDash || options?.immediate) {
      if (isInsideDashboard || isTargetDash) {
        setIsDashboardTabLoading(true);
        setIsFullViewLoading(false);
      } else {
        setIsFullViewLoading(true);
        setIsDashboardTabLoading(false);
      }
    } else {
      // Non-dashboard navigation: 50ms debounce
      navTimerRef.current = setTimeout(() => {
        if (!isNavigatingRef.current) return;
        setIsFullViewLoading(true);
        setIsDashboardTabLoading(false);
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

        setTimeout(() => {
          startNavigation(url.pathname);
        }, 0);
      } catch {
        // Ignore invalid URL
      }
    };

    const handlePopState = () => {
      if (window.location.pathname !== pathname) {
        setTimeout(() => {
          startNavigation(window.location.pathname);
        }, 0);
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
            setTimeout(() => {
              startNavigation(parsed.pathname);
            }, 0);
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
        dismissNavLoader,
        startLoading,
        stopLoading,
      }}
    >
      {/* 1. INITIAL LOAD & REFRESH LOADER: Screen loader with download line that completes when page loads */}
      {isInitialLoading && (
        <div
          className={`fixed inset-0 z-[99999] flex items-center justify-center bg-[#F6F5F2] transition-opacity duration-200 ${
            isInitialFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <KitScreenLoader
            fullScreen={false}
            size="md"
            showText={true}
            showProgressBar={true}
            loop={true}
            duration={1.25}
            transparent={false}
            isComplete={isInitialComplete}
            onComplete={handleInitialComplete}
          />
        </div>
      )}

      {/* 2. FULL-VIEW LOADER: For navigations outside dashboard */}
      {isFullViewLoading && !isInitialLoading && (
        <div className="fixed inset-0 z-[99998] flex items-center justify-center bg-[#F6F5F2]/95 backdrop-blur-md">
          <KitScreenLoader
            fullScreen={false}
            size="md"
            showText={false}
            showProgressBar={true}
            loop={true}
            duration={1.25}
            transparent={true}
            isComplete={isNavComplete}
            onComplete={dismissNavLoader}
          />
        </div>
      )}

      {children}
    </LoadingContext.Provider>
  );
}

export default PageLoadingProvider;
