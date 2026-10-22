import '../styles/hourglass.css';

// Animation adaptee de Uiverse.io par SouravBandyopadhyay.
// Les couleurs proviennent directement des themes de l'application.
export default function HourglassLoader() {
  return (
    <div className="maf-hourglass" role="status" aria-live="polite">
      <span className="maf-hourglass__sr">Chargement en cours.</span>
      <div className="hourglassBackground" aria-hidden="true">
        <div className="hourglassContainer">
          <div className="hourglassCurves" />
          <div className="hourglassCapTop" />
          <div className="hourglassGlassTop" />
          <div className="hourglassSand" />
          <div className="hourglassSandStream" />
          <div className="hourglassCapBottom" />
          <div className="hourglassGlass" />
        </div>
      </div>
    </div>
  );
}
