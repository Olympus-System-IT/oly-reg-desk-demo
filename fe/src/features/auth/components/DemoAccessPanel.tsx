import { useState } from "react";
import { ChevronDown, ChevronUp, Sparkles, User, ShieldCheck, Stethoscope, Receipt, Pill } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEMO_PASSWORD } from "../services/authService";
import { cn } from "@/lib/utils";

interface DemoAccessPanelProps {
  onSelectRole: (username: string, password: string) => void;
  className?: string;
}

const DEMO_ROLES = [
  {
    key: "admin",
    username: "admin",
    label: "Admin",
    subtext: "Full SFA, Billing & Pharmacy",
    icon: ShieldCheck,
    tone: "border-primary/30 hover:border-primary text-primary",
  },
  {
    key: "pharmacist",
    username: "pharmacist",
    label: "Pharmacist",
    subtext: "Dispensing, drug inventory & batches",
    icon: Pill,
    tone: "border-blue-300 hover:border-blue-500 text-blue-700",
  },
  {
    key: "manager",
    username: "manager",
    label: "Manager",
    subtext: "Billing, sessions & reports",
    icon: User,
    tone: "border-blue-300 hover:border-blue-500 text-blue-700",
  },
  {
    key: "reception",
    username: "reception",
    label: "Receptionist / Cashier",
    subtext: "Patient bookings, queues & POS",
    icon: Receipt,
    tone: "border-amber-300 hover:border-amber-500 text-amber-700",
  },
  {
    key: "nurse",
    username: "nurse",
    label: "Nurse",
    subtext: "Queue advancement (no pricing)",
    icon: Stethoscope,
    tone: "border-emerald-300 hover:border-emerald-500 text-emerald-700",
  },
] as const;

export function DemoAccessPanel({ onSelectRole, className }: DemoAccessPanelProps) {
  const [open, setOpen] = useState(true);

  // Controlled by environment / config flag (defaults to true for prototype)
  const isDemoMode = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_DEMO_MODE !== "false" : true;
  if (!isDemoMode) return null;

  return (
    <div
      aria-label="Demo role selector"
      className={cn("rounded-lg border border-dashed border-border bg-muted/30 p-4 transition-all", className)}
    >
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground cursor-pointer"
          aria-expanded={open}
        >
          <Sparkles className="size-3.5 text-amber-500" />
          <span>Demo access (prototype only)</span>
          {open ? <ChevronUp className="size-3.5 ml-1" /> : <ChevronDown className="size-3.5 ml-1" />}
        </button>
        <span className="text-[11px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
          demo1234
        </span>
      </div>

      {open && (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-muted-foreground leading-normal">
            Select a demo role to pre-fill credentials for testing:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {DEMO_ROLES.map((role) => {
              const Icon = role.icon;
              return (
                <Button
                  key={role.key}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onSelectRole(role.username, DEMO_PASSWORD)}
                  className="h-auto py-2 px-2.5 flex items-start justify-start text-left bg-card hover:bg-accent/40 cursor-pointer"
                  title={`Pre-fill ${role.label} credentials (${role.username})`}
                >
                  <Icon className="size-4 shrink-0 mt-0.5 mr-2 text-primary" />
                  <div className="min-w-0">
                    <div className="font-semibold text-xs text-foreground truncate">{role.label}</div>
                    <div className="text-[11px] text-muted-foreground line-clamp-1">{role.subtext}</div>
                  </div>
                </Button>
              );
            })}
          </div>

          <p className="text-[11px] text-muted-foreground italic border-t pt-2 mt-2">
            * Role selection is for prototype review only. In production, roles are assigned by an administrator and cannot be chosen at login.
          </p>
        </div>
      )}
    </div>
  );
}
