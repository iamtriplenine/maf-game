// Icônes SVG locales : aucune police ou bibliothèque d'icônes externe.
const shapes = {
  roll:<><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><circle cx="8" cy="8" r="1" fill="currentColor" stroke="none"/><circle cx="16" cy="8" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="8" cy="16" r="1" fill="currentColor" stroke="none"/><circle cx="16" cy="16" r="1" fill="currentColor" stroke="none"/></>,
  buy:<><path d="M3 5h10l8 8-8 8-10-10V5z"/><circle cx="7.5" cy="8.5" r="1.5"/></>,
  end:<><path d="m5 4 8 8-8 8M14 4l7 8-7 8"/></>,
  build:<><path d="m2.5 11 9.5-8 9.5 8M5 10v11h14V10M10 21v-7h4v7"/><path d="M5 8V4h3v2"/></>,
  sell:<><path d="M3 6h8l10 8-7 7-11-9V6z"/><circle cx="7.5" cy="9.5" r="1.5"/><path d="M15 5v5M12.5 7.5h5"/></>,
  target:<><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/></>,
  map:<><path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5zM9 3v16M15 5v16"/></>,
  more:<><circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"/></>,
};
export default function MonopolyActionIcon({name}) {
  return <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true" focusable="false">{shapes[name]||shapes.more}</svg>;
}
