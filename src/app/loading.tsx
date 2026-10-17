// Loading states are handled by PageLoadingProvider (full-screen) and
// DashboardLayoutClient (in-tab). Returning null prevents a duplicate
// Suspense fallback from flashing on top.
export default function Loading() {
  return null;
}
