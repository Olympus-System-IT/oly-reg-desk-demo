import { cn } from "@/lib/utils";

interface CompanyLogoProps {
  className?: string;
  imageClassName?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  subtext?: string;
  textClassName?: string;
}

export function CompanyLogo({
  className,
  imageClassName,
  size = "md",
  showText = false,
  subtext = "Outpatient operations",
  textClassName,
}: CompanyLogoProps) {
  const sizeClasses = {
    sm: "size-7",
    md: "size-8",
    lg: "size-11",
    xl: "size-14",
  };

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "overflow-hidden rounded-md bg-white p-0.5 border border-border/50 shadow-2xs shrink-0 flex items-center justify-center",
          sizeClasses[size],
          imageClassName
        )}
      >
        <img
          src="/logo.png"
          alt="Olympus Lanka Hospital Logo"
          className="size-full object-contain"
          loading="eager"
        />
      </div>
      {showText && (
        <div className={cn("min-w-0 leading-tight", textClassName)}>
          <div className="font-semibold text-foreground text-sm tracking-tight truncate">
            Olympus Lanka Hospital
          </div>
          {subtext && <div className="text-xs text-muted-foreground">{subtext}</div>}
        </div>
      )}
    </div>
  );
}
