import { useEffect } from 'react';
import '../styles/zoom-lock.css';

export default function ZoomLock() {
  useEffect(() => {
    let meta = document.querySelector('meta[name="viewport"]');
    const created = !meta;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'viewport';
      document.head.appendChild(meta);
    }
    const original = meta.getAttribute('content');
    const extras = (original || '').split(',').map(part => part.trim()).filter(part => part && !/^(width|initial-scale|minimum-scale|maximum-scale|user-scalable)\s*=/i.test(part));
    meta.setAttribute('content', ['width=device-width', 'initial-scale=1', 'minimum-scale=1', 'maximum-scale=1', 'user-scalable=no', ...extras].join(', '));
    document.documentElement.classList.add('maf-zoom-locked');
    const prevent = event => { if (event.cancelable) event.preventDefault(); };
    const touch = event => { if (event.touches.length > 1) prevent(event); };
    const wheel = event => { if (event.ctrlKey || event.metaKey) prevent(event); };
    const key = event => {
      if ((event.ctrlKey || event.metaKey) && ['+', '-', '=', '0'].includes(event.key)) prevent(event);
    };
    const options = { passive: false, capture: true };
    const gestures = ['gesturestart', 'gesturechange', 'gestureend'];
    gestures.forEach(name => document.addEventListener(name, prevent, options));
    document.addEventListener('touchstart', touch, options);
    document.addEventListener('touchmove', touch, options);
    document.addEventListener('wheel', wheel, options);
    document.addEventListener('keydown', key, true);
    document.addEventListener('dblclick', prevent, options);
    return () => {
      gestures.forEach(name => document.removeEventListener(name, prevent, true));
      document.removeEventListener('touchstart', touch, true);
      document.removeEventListener('touchmove', touch, true);
      document.removeEventListener('wheel', wheel, true);
      document.removeEventListener('keydown', key, true);
      document.removeEventListener('dblclick', prevent, true);
      document.documentElement.classList.remove('maf-zoom-locked');
      if (created) meta.remove();
      else if (original === null) meta.removeAttribute('content');
      else meta.setAttribute('content', original);
    };
  }, []);
  return null;
}
