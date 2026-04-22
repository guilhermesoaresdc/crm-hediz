import { cn } from "@/lib/utils";

export function HedizMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-5 w-5", className)}
      aria-label="Hédiz"
    >
      <path
        d="M16 14 L16 36 L22 36 L22 20 Q22 16 26 16 L42 16"
        stroke="currentColor"
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x={30} y={28} width={18} height={6} rx={2} fill="currentColor" />
      <rect x={14} y={44} width={36} height={6} rx={3} fill="currentColor" />
    </svg>
  );
}

export function HedizWordmark({ className }: { className?: string }) {
  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-primary text-primary-foreground">
        <HedizMark className="h-4 w-4" />
      </span>
      <span className="font-bold text-lg tracking-tight">
        hédiz
      </span>
    </div>
  );
}
