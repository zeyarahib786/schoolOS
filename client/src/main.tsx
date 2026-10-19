import { createRoot } from 'react-dom/client';
import { App } from './app/App';

// Optional typography must not hold the login page while a third-party stylesheet loads.
const fonts = document.getElementById('schoolos-fonts') as HTMLLinkElement | null;
if (fonts) {
  if (fonts.sheet) fonts.media = 'all';
  else fonts.addEventListener('load', () => { fonts.media = 'all'; }, { once: true });
}

// The application scripts must be injected exactly once; AppShell guards remounts.
createRoot(document.getElementById('root') as HTMLElement).render(<App />);
