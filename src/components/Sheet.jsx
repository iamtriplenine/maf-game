import { useEffect } from "react";

export default function Sheet({ open, title, onClose, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        className="sheet__backdrop"
        aria-label="Fermer"
        onClick={onClose}
      />
      <div className="sheet__body">
        <header className="sheet__head">
          <h2 className="sheet__title">{title}</h2>
          <button
            type="button"
            className="btn btn--round btn--glass btn--sm"
            aria-label="Fermer"
            onClick={onClose}
          >
            &times;
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}