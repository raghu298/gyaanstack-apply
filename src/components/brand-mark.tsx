import { cn } from "@/lib/cn";

/** GyaanStack Apply's "GS" mark, as in src/app/icon.svg, in the primary colours, so it turns light in the dark scheme. Decorative: put the name next to it. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={cn("size-8 shrink-0", className)}>
      <rect width="64" height="64" rx="14" className="fill-primary" />
      <text
        x="32"
        y="42.5"
        textAnchor="middle"
        fontFamily="Inter, Arial, Helvetica, sans-serif"
        fontSize="28"
        fontWeight="800"
        letterSpacing="-1"
        className="fill-on-primary"
      >
        GS
      </text>
    </svg>
  );
}
