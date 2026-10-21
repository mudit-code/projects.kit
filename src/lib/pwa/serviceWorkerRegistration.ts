"use client";

export type UpdateCallback = () => void;

let registration: ServiceWorkerRegistration | null = null;
let updateCallbacks: UpdateCallback[] = [];

export function registerServiceWorker(onUpdateAvailable?: UpdateCallback): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  if (onUpdateAvailable) {
    updateCallbacks.push(onUpdateAvailable);
  }

  window.addEventListener("load", async () => {
    try {
      registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });

      // Check if there is already a waiting worker
      if (registration.waiting) {
        notifyUpdateAvailable();
      }

      // Check on update found
      registration.addEventListener("updatefound", () => {
        const installingWorker = registration?.installing;
        if (!installingWorker) return;

        installingWorker.addEventListener("statechange", () => {
          if (
            installingWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            notifyUpdateAvailable();
          }
        });
      });
    } catch (err) {
      console.warn("ServiceWorker registration failed:", err);
    }
  });

  // Reload page when new worker takes control
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

function notifyUpdateAvailable() {
  updateCallbacks.forEach((cb) => {
    try {
      cb();
    } catch {}
  });
}

export function applyServiceWorkerUpdate(): void {
  if (!registration || !registration.waiting) {
    window.location.reload();
    return;
  }
  registration.waiting.postMessage({ type: "SKIP_WAITING" });
}
