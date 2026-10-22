// Icones SVG du jeu (une seule couleur : celle du texte, via currentColor).
// Utilisation : <IconCube /> ou <IconCube size={28} />
function Svg({ size = 22, children }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const IconCube = (props) => (
  <Svg {...props}>
    <path d="M12 2.5 20.5 7v10L12 21.5 3.5 17V7z" />
    <path d="M3.5 7 12 11.5 20.5 7M12 11.5v10" />
  </Svg>
);

export const IconLogout = (props) => (
  <Svg {...props}>
    <path d="M9 4.5H6.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2H9" />
    <path d="m16 8 4 4-4 4M20 12H9.5" />
  </Svg>
);

export const IconLogin = (props) => (
  <Svg {...props}>
    <path d="M15 4.5h2.5a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H15" />
    <path d="m10 8 4 4-4 4M14 12H4" />
  </Svg>
);

export const IconUserPlus = (props) => (
  <Svg {...props}>
    <circle cx="9.5" cy="8" r="3.5" />
    <path d="M3 19.5c.6-3.3 3.1-5 6.5-5s5.9 1.7 6.5 5" />
    <path d="M19 8v6M16 11h6" />
  </Svg>
);

export const IconPlus = (props) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v8M8 12h8" />
  </Svg>
);

export const IconPalette = (props) => (
  <Svg {...props}>
    <path d="M12 3a9 9 0 1 0 0 18c1.2 0 2-.8 2-1.8 0-.5-.2-.9-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z" />
    <circle cx="7.5" cy="11" r="1" fill="currentColor" />
    <circle cx="10" cy="7" r="1" fill="currentColor" />
    <circle cx="14.5" cy="7" r="1" fill="currentColor" />
  </Svg>
);

export const IconFranc = (props) => (
  <Svg {...props}><path d="M7 21V3h12M7 10h9M4 16h10" strokeWidth="2.8" /></Svg>
);
export const IconV = (props) => (
  <Svg {...props}><path d="m3 4 9 17L21 4M8 4l4 8 4-8" strokeWidth="2.5" /></Svg>
);
export const IconVoucher = (props) => (
  <Svg {...props}><path d="M3 5h18v5a2 2 0 0 0 0 4v5H3v-5a2 2 0 0 0 0-4zM15 5v3m0 3v2m0 3v3" /></Svg>
);

export const IconUser = (props) => (
  <Svg {...props}>
    <circle cx="12" cy="8" r="3.8" />
    <path d="M4.5 20.5c.7-4 3.7-6 7.5-6s6.8 2 7.5 6z" />
  </Svg>
);

export const IconGamepad = (props) => (
  <Svg {...props}>
    <path d="M7 7.5h10a4.5 4.5 0 0 1 4.4 3.7l.8 4.4a2.6 2.6 0 0 1-4.4 2.2L16 15.5H8l-2.8 2.3a2.6 2.6 0 0 1-4.4-2.2l.8-4.4A4.5 4.5 0 0 1 7 7.5z" />
    <path d="M7.5 10v3M6 11.5h3" />
    <circle cx="15.5" cy="10.5" r=".8" fill="currentColor" />
    <circle cx="17.5" cy="12.5" r=".8" fill="currentColor" />
  </Svg>
);

export const IconChat = (props) => (
  <Svg {...props}>
    <path d="M5 4.5h14a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2h-7l-4.5 3.5V17H5a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2z" />
    <path d="M8 9.5h8M8 12.5h5" />
  </Svg>
);

export const IconSend = (props) => (
  <Svg {...props}>
    <path d="M12 19V5.5M6 11.5l6-6 6 6" strokeWidth="2.2" />
  </Svg>
);

export const IconWithdraw = (props) => (
  <Svg {...props}><path d="M4 4h16v6H4zM7 16h10M12 10v11m-4-4 4 4 4-4" /></Svg>
);

export const IconHistory = (props) => (
  <Svg {...props}><path d="M3 11a9 9 0 1 1 2.6 7M3 4v7h7M12 7v5l3 2" /></Svg>
);
