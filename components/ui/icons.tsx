import { type SVGProps } from "react";

/**
 * Small monoline icon set used by Sidebar navigation (see
 * components/layout/navigation.tsx) and the mobile menu trigger in
 * AppShell. No icon library (e.g. lucide-react) is installed in this
 * project yet — these are intentionally minimal (single viewBox,
 * currentColor stroke) so they read as one consistent family instead
 * of ad-hoc SVG pasted per page. If an icon library is added later,
 * swap the implementations here and every call site is unaffected.
 */
type IconProps = SVGProps<SVGSVGElement>;

const base = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconDashboard(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.2" />
      <rect x="13.5" y="3.5" width="7" height="4.5" rx="1.2" />
      <rect x="13.5" y="10.5" width="7" height="10" rx="1.2" />
      <rect x="3.5" y="13" width="7" height="7.5" rx="1.2" />
    </svg>
  );
}

export function IconReconciliation(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 7h13l-3-3" />
      <path d="M20 17H7l3 3" />
    </svg>
  );
}

export function IconScale(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3v18" />
      <path d="M6 7h12" />
      <path d="M6 7 3 13a3 3 0 0 0 6 0Z" />
      <path d="M18 7l-3 6a3 3 0 0 0 6 0Z" />
    </svg>
  );
}

export function IconUpload(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

export function IconDatabase(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <ellipse cx="12" cy="5.5" rx="7.5" ry="2.8" />
      <path d="M4.5 5.5V12c0 1.55 3.36 2.8 7.5 2.8s7.5-1.25 7.5-2.8V5.5" />
      <path d="M4.5 12v6.5c0 1.55 3.36 2.8 7.5 2.8s7.5-1.25 7.5-2.8V12" />
    </svg>
  );
}

export function IconMasterData(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3 3 8l9 5 9-5-9-5Z" />
      <path d="M3 12l9 5 9-5" />
      <path d="M3 16l9 5 9-5" />
    </svg>
  );
}

export function IconMenu(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </svg>
  );
}
