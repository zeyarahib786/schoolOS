import { useEffect, useRef } from 'react';
import { APP_SCRIPTS } from '../features/registry';
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

    const loadSequentially = async (): Promise<void> => {
      for (const src of APP_SCRIPTS) {
        await new Promise<void>((resolve, reject) => {
          const el = document.createElement('script');
          el.src = '/' + src;
          el.onload = () => resolve();
          el.onerror = () => reject(new Error('Failed to load ' + src));
          document.body.appendChild(el);
        });
      }
    };

    loadSequentially().catch((e) => {
      // Surface loudly in dev; the render test fails on any pageerror.
      console.error('[SchoolOS client] application script chain failed:', e);
    });
  }, []);

  return (
    <>
      <div ref={hostRef} dangerouslySetInnerHTML={{ __html: appMarkup }} />
      <ReactBridge />
    </>
  );
}
