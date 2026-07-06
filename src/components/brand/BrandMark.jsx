import { cn } from "../../utils/cn";

export default function BrandMark({ className, decorative = true }) {
  return (
    <svg
      className={cn("text-primary-700", className)}
      viewBox="0 0 48 48"
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : "Kisan Gaurav"}
    >
      <rect width="48" height="48" rx="14" fill="currentColor" />
      <circle cx="24" cy="15" r="4" fill="var(--kg-secondary-300)" />
      <path
        d="M10 30c6-5 12-7 18-6 4 .6 7 2.2 10 4.5M10 36c7-4 14-5.5 21-4 3 .6 5.3 1.5 7 2.5"
        fill="none"
        stroke="var(--kg-white)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M23.5 25.5c-1-4.6.5-8 4.5-10.5"
        fill="none"
        stroke="var(--kg-white)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M28 15c4.4-.2 7 1.6 7.8 5.4-4.4.5-7-.9-7.8-4.3"
        fill="var(--kg-secondary-300)"
      />
    </svg>
  );
}
