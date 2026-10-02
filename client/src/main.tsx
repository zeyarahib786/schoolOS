import { createRoot } from 'react-dom/client';
import { App } from './app/App';

// The application scripts must be injected exactly once; AppShell guards remounts.
createRoot(document.getElementById('root') as HTMLElement).render(<App />);
