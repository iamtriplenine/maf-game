// Icones des vocaux (micro, lecture, pause).
function Svg({ size = 20, children }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

export const IconMic = (props) => (
  <Svg {...props}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" />
  </Svg>
);

export const IconPlay = (props) => (
  <Svg {...props}>
    <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
  </Svg>
);

export const IconPause = (props) => (
  <Svg {...props}>
    <path d="M8 5.5v13M16 5.5v13" strokeWidth="3.2" />
  </Svg>
);
