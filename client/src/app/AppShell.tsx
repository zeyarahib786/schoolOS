import { useEffect, useRef } from 'react';
import runtimeUrl from 'virtual:schoolos-runtime';
import appMarkup from './app-shell.html?raw';
import { ReactBridge } from './ReactBridge';

/**
 * Owns the application markup and loads the product modules in their required order.
 * API configuration is injected before the application scripts start.
 */
let injected = false; // module-level: survives any remount, scripts run exactly once per page

export function AppShell(): JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (injected || !hostRef.current) return;
    injected = true;

    // Production-grade configuration seam: env decides the API base, before the adapter runs.
    const base = import.meta.env.VITE_API_BASE_URL as string | undefined;
    if (base) {
      (window as unknown as { SCHOOLOS_API?: { base: string } }).SCHOOLOS_API = { base };
    }

    const script = document.createElement('script');
    script.src = runtimeUrl;
    script.onerror = () => {
      console.error('[SchoolOS client] application runtime failed to load');
    };
    document.body.appendChild(script);
  }, []);

  return (
    <>
      <div ref={hostRef} dangerouslySetInnerHTML={{ __html: appMarkup }} />
      <ReactBridge />
    </>
  );
}
