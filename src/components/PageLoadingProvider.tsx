'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { KitScreenLoader } from './KitScreenLoader';

// Isolated subcomponent to observe pathname changes inside Suspense boundary
function PathnameListener({
  onPathChange,
}: {
  onPathChange: (path: string) => void;
}) {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname) {
      onPathChange(pathname);
    }
  }, [pathname, onPathChange]);

  return null;
}

// Helper to determine if a route is inside the main dashboard suite
export function isDashboardPath(path: string | null): boolean {
  if (!path) return false;
  const cleanPath = path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
  
  // Public/Auth routes are not dashboard sub-tabs
  if (cleanPath === '' || cleanPath === '/' || cleanPath === '/login' || cleanPath === '/register' || cleanPath === '/admin') {
    return false;
  }

  const dashboardPrefixes = [
    '/hod',
    '/coordinator',
    '/dashboard',
    '/roles',
    '/students',
    '/projects',
    '/forms',
  ];
  return dashboardPrefixes.some((prefix) => cleanPath === prefix || cleanPath.startsWith(prefix + '/'));
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

// Utility to cleanly toggle scroll locking on body
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
  const pathnameRef = useRef<string>('');

  // 1. Full-View Heartbeat Loader State (for navigation or global fetches > 100ms outside dashboard)
  const [isFullViewLoading, setIsFullViewLoading] = useState(false);

  // 2. In-Tab Dashboard Heartbeat Loader State (for intra-dashboard tab loads > 100ms)
  const [isDashboardTabLoading, setIsDashboardTabLoading] = useState(false);

  // Completion signal to fill line loader to 100% and dismiss
  const [isNavComplete, setIsNavComplete] = useState(false);

  const navTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fetchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const failsafeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isNavigatingRef = useRef(false);
  const activeFetchesRef = useRef<number>(0);
  const initialMountRef = useRef(true);

  // Dismiss loaders
  const dismissNavLoader = useCallback(() => {
    setIsFullViewLoading(false);
    setIsDashboardTabLoading(false);
    setIsNavComplete(false);
  }, []);

  // Complete navigation / fetch loading (fills line to 100%, then dismisses)
  const endNavigation = useCallback(() => {
    if (navTimerRef.current) {
      clearTimeout(navTimerRef.current);
      navTimerRef.current = null;
    }
    if (fetchTimerRef.current) {
      clearTimeout(fetchTimerRef.current);
      fetchTimerRef.current = null;
    }
    if (failsafeTimerRef.current) {
      clearTimeout(failsafeTimerRef.current);
      failsafeTimerRef.current = null;
    }
    isNavigatingRef.current = false;

    // Fill line loader to 100%
    setIsNavComplete(true);

    // Failsafe dismissal
    setTimeout(() => {
      dismissNavLoader();
    }, 450);
  }, [dismissNavLoader]);

  // Lock body scroll while full-screen loaders are active
  useEffect(() => {
    if (isFullViewLoading) {
      setScrollLocked(true);
    } else {
      setScrollLocked(false);
    }
    return () => {
      setScrollLocked(false);
    };
  }, [isFullViewLoading]);

  // Start Navigation with 100ms Debounce:
  // If navigation takes MORE THAN 100ms, instantly show the heartbeat screen loader!
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
    if (!targetPath || targetPath === currentPath) {
      return;
    }

    isNavigatingRef.current = true;
    const isCurrentDash = isDashboardPath(currentPath);
    const isTargetDash = isDashboardPath(targetPath);
    const isInsideDashboard = isCurrentDash && isTargetDash;

    // EXACT 100ms threshold:
    // Only schedule React state update if the navigation takes > 100ms!
    // This avoids synchronous updates during Next.js router useInsertionEffect.
    navTimerRef.current = setTimeout(() => {
      if (!isNavigatingRef.current) return;
      setIsNavComplete(false);
      if (isInsideDashboard) {
        setIsDashboardTabLoading(true);
        setIsFullViewLoading(false);
      } else {
        setIsFullViewLoading(true);
        setIsDashboardTabLoading(false);
      }
    }, 100);

    failsafeTimerRef.current = setTimeout(() => {
      endNavigation();
    }, 8000);
  }, [endNavigation]);

  const startLoading = useCallback(() => {
    isNavigatingRef.current = true;
    if (navTimerRef.current) clearTimeout(navTimerRef.current);
    navTimerRef.current = setTimeout(() => {
      setIsNavComplete(false);
      setIsFullViewLoading(true);
    }, 100);

    if (failsafeTimerRef.current) clearTimeout(failsafeTimerRef.current);
    failsafeTimerRef.current = setTimeout(() => {
      endNavigation();
    }, 8000);
  }, [endNavigation]);

  const stopLoading = useCallback(() => {
    endNavigation();
  }, [endNavigation]);

  // Handle route change when Next.js pathname updates
  const handlePathChange = useCallback((newPath: string) => {
    if (initialMountRef.current) {
      initialMountRef.current = false;
      pathnameRef.current = newPath;
      return;
    }

    if (pathnameRef.current !== newPath) {
      pathnameRef.current = newPath;
      endNavigation();
    }
  }, [endNavigation]);


  // Intercept internal link clicks and browser history navigation
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
      if (window.location.pathname !== pathnameRef.current) {
        const nextPath = window.location.pathname;
        setTimeout(() => {
          startNavigation(nextPath);
        }, 0);
      }
    };

    const originalPushState = window.history.pushState;
    window.history.pushState = function (...args) {
      const res = originalPushState.apply(this, args);
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
      return res;
    };

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
  }, [startNavigation, endNavigation]);

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
      <Suspense fallback={null}>
        <PathnameListener onPathChange={handlePathChange} />
      </Suspense>

      {/* 
        Version 1: Full-view heartbeat screen loader with line loader underneath
        (for navigation or global fetches taking > 100ms outside dashboards)
      */}
      {isFullViewLoading && (
        <div className="fixed inset-0 z-[99998] flex flex-col items-center justify-center bg-[#F6F5F2]/95 backdrop-blur-md transition-opacity duration-200">
          <KitScreenLoader
            mode="heartbeat"
            fullScreen={false}
            size="md"
            showText={false}
            showProgressBar={true}
            isComplete={isNavComplete}
            onComplete={dismissNavLoader}
            transparent={true}
          />
        </div>
      )}

      {children}
    </LoadingContext.Provider>
  );
}

export default PageLoadingProvider;
