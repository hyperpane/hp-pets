// Pets: one overlay over the canvas, with the pet on the active window.

import { mount } from '@hyperpane/sdk/client';
import { Pet } from './Pet.tsx';

const style = document.createElement('style');
style.textContent = `
  .pet-heart, .pet-z {
    position: absolute;
    translate: -50% 0;
    pointer-events: none;
    filter: drop-shadow(0 1px 0 rgba(0, 0, 0, 0.35));
  }
  .pet-heart { animation: pet-heart 1.3s cubic-bezier(0.2, 0.7, 0.3, 1) forwards; }
  .pet-z { animation: pet-z 2.4s ease-out forwards; }
  @keyframes pet-heart {
    from { opacity: 0; transform: translate(0, 0) scale(0.4); }
    14% { opacity: 1; transform: translate(0, -0.6em) scale(1.15); }
    28% { transform: translate(0, -1em) scale(1); }
    70% { opacity: 1; }
    to { opacity: 0; transform: translate(var(--drift, 0), -3.4em) scale(0.9); }
  }
  @keyframes pet-z {
    from { opacity: 0; transform: translate(0, 0) scale(0.6); }
    20% { opacity: 0.9; }
    to { opacity: 0; transform: translate(var(--drift, 0), -2.6em) scale(1.15); }
  }
  @media (prefers-reduced-motion: reduce) {
    .pet-heart, .pet-z { animation-duration: 0.01s; }
  }
`;
document.head.append(style);

mount((host) => (host.view.type === 'overlay' ? <Pet host={host} /> : null));
