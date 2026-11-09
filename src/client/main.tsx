// Pets: one overlay over the canvas, with the cat on the active window.

import { mount } from '@hyperpane/sdk/client';
import { Pet } from './Pet.tsx';

const style = document.createElement('style');
style.textContent = `
  .pet-heart {
    position: absolute;
    transform: translate(-50%, 0);
    color: #f0607a;
    pointer-events: none;
    text-shadow: 0 1px 0 rgba(0, 0, 0, 0.35);
    animation: pet-heart 1.2s ease-out forwards;
  }
  @keyframes pet-heart {
    from { opacity: 0; translate: 0 0; scale: 0.6; }
    15% { opacity: 1; scale: 1; }
    to { opacity: 0; translate: 0 -2.5em; }
  }
`;
document.head.append(style);

mount((host) => (host.view.type === 'overlay' ? <Pet host={host} /> : null));
