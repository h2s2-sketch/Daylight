const S = ({ size = 24, sw = 1.7, children, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={sw} strokeLinecap="round"
    strokeLinejoin="round" style={style} aria-hidden="true">
    {children}
  </svg>
);

export const Speaker = (p) => (
  <S {...p}>
    <path d="M11 5 6 9H3v6h3l5 4z" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
    <path d="M18.5 6a9 9 0 0 1 0 12" />
  </S>
);

export const Play = (p) => (
  <S {...p}><path d="M7 5.5v13l11-6.5z" fill="currentColor" stroke="none" /></S>
);

export const ArrowRight = (p) => (
  <S {...p}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></S>
);

export const Close = (p) => (
  <S {...p}><path d="M6 6l12 12M18 6 6 18" /></S>
);

export const Check = (p) => (
  <S {...p}><path d="m5 12.5 4.5 4.5L19 6.5" /></S>
);

export const Sun = (p) => (
  <S {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </S>
);

export const Moon = (p) => (
  <S {...p}><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" /></S>
);

export const Chevron = (p) => (
  <S {...p}><path d="m9 6 6 6-6 6" /></S>
);

export const ChevronLeft = (p) => (
  <S {...p}><path d="m15 6-6 6 6 6" /></S>
);

export const Plus = (p) => (
  <S {...p}><path d="M12 5v14M5 12h14" /></S>
);

export const BookOpen = (p) => (
  <S {...p}>
    <path d="M2 3h9a1 1 0 0 1 1 1v16a1 1 0 0 0-1-1H2z" />
    <path d="M22 3h-9a1 1 0 0 0-1 1v16a1 1 0 0 1 1-1h9z" />
  </S>
);

export const Today = (p) => (
  <S {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6 19 19M19 5l-1.4 1.4M6.4 17.6 5 19" />
  </S>
);

export const Tasks = (p) => (
  <S {...p}>
    <path d="M9 6h11M9 12h11M9 18h11" />
    <path d="m4 6 1.2 1.2L7.5 4.8M4 12.2l1.2 1.2L7.5 11M4 18.2l1.2 1.2L7.5 17" />
  </S>
);

export const Projects = (p) => (
  <S {...p}><path d="M3 7a2 2 0 0 1 2-2h3.5l2 2.3H19a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></S>
);

export const Flame = (p) => (
  <S {...p}><path d="M12 3c1 3-1.5 4-1.5 6.5A2.5 2.5 0 0 0 13 12c1-1 1-2.5 1-2.5 1.5 1.2 3 3.2 3 5.5a5 5 0 0 1-10 0c0-2.8 2-4.2 3-6 .6-1.1 1.5-3 2-6z" /></S>
);

export const Settings = (p) => (
  <S {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </S>
);

export const Trash = (p) => (
  <S {...p}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4h6v2" />
  </S>
);

export const Edit2 = (p) => (
  <S {...p}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </S>
);
