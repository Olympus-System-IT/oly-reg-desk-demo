import { createFileRoute, Navigate, useHydrated, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, ShieldCheck, Receipt, LogOut, CheckCircle, Pill } from "lucide-react";
import { mutate, useCurrentUser } from "@/lib/hms/store";
import { modulesFor, ROLE_LABEL } from "@/lib/hms/permissions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { signOut } from "@/features/auth/services/authService";
import { CompanyLogo } from "@/components/hms/CompanyLogo";

export const Route = createFileRoute("/modules")({
  head: () => ({
    meta: [
      { title: "Choose module — Hospital Management System" },
      {
        name: "description",
        content: "Select your active workspace between SFA Administration and Billing Reception.",
      },
      { property: "og:title", content: "Choose module — Hospital Management System" },
      { property: "og:description", content: "SFA Administration and Billing modules." },
    ],
  }),
  component: ModulesPage,
});

function ModulesPage() {
  const hydrated = useHydrated();
  const user = useCurrentUser();
  const navigate = useNavigate();

  const mods = user ? modulesFor(user) : [];

  // Single permitted module: auto-redirect straight into it
  useEffect(() => {
    if (user && mods.length === 1) {
      const singleModule = mods[0];
      mutate((d) => (d.auth.module = singleModule));
      navigate({ to: singleModule === "pharmacy" ? "/pharmacy" : user.role === "nurse" ? "/queue" : "/dashboard" });
    }
  }, [user, mods, navigate]);

  if (!hydrated) return null;
  if (!user) return <Navigate to="/" />;

  const handleSelectModule = (moduleKey: "sfa" | "billing" | "pharmacy") => {
    mutate((d) => (d.auth.module = moduleKey));
    navigate({ to: moduleKey === "pharmacy" ? "/pharmacy" : user.role === "nurse" ? "/queue" : "/dashboard" });
  };

  const handleSignOut = () => {
    signOut();
    navigate({ to: "/" });
  };

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-background p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-3xl space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none">
        {/* Brand Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-6">
          <div className="flex items-center gap-3">
            <CompanyLogo size="lg" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                  Welcome, {user.name}
                </h1>
                <Badge variant="outline" className="border-primary/30 text-primary font-medium text-xs">
                  {ROLE_LABEL[user.role]}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Select your operational workspace to continue.
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            className="cursor-pointer text-xs self-start sm:self-auto"
          >
            <LogOut className="mr-1.5 size-3.5" /> Sign out
          </Button>
        </header>

        {/* Module Selection Grid */}
        <section aria-label="Available modules" className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
            <span>Permitted Modules ({mods.length})</span>
            <span>Accredited Workspace</span>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {/* SFA Card */}
            {mods.includes("sfa") && (
              <button
                type="button"
                onClick={() => handleSelectModule("sfa")}
                className="group relative flex flex-col justify-between rounded-xl border bg-card p-6 text-left shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-primary hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer motion-reduce:hover:translate-y-0"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <ShieldCheck className="size-6" />
                    </div>
                    <Badge variant="secondary" className="text-[11px] font-medium">
                      Admin only
                    </Badge>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                      SFA
                    </h2>
                    <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                  </div>

                  <div className="text-xs font-semibold text-muted-foreground mt-0.5">
                    Administration
                  </div>

                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    Doctors, consultant types, diagnostic services, consultation schedules, user roles, approvals, and system settings.
                  </p>
                </div>

                <div className="mt-6 flex items-center gap-1.5 text-[11px] font-medium text-primary">
                  <CheckCircle className="size-3.5" />
                  <span>Full Administrative Authority</span>
                </div>
              </button>
            )}

            

            {/* Pharmacy Card */}
            {mods.includes("pharmacy") && (
              <button
                type="button"
                onClick={() => handleSelectModule("pharmacy")}
                className="group relative flex flex-col justify-between rounded-xl border bg-card p-6 text-left shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-primary hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer motion-reduce:hover:translate-y-0"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Pill className="size-6" />
                    </div>
                    <Badge variant="outline" className="text-[11px] font-medium border-primary/30 text-primary">
                      Dispensary & Stock
                    </Badge>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                      Pharmacy
                    </h2>
                    <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                  </div>

                  <div className="text-xs font-semibold text-muted-foreground mt-0.5">
                    Prescriptions & Inventory
                  </div>

                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    Doctor prescription dispensing, counter OTC sales, drug catalog & batch FEFO expiry tracker, and purchase orders.
                  </p>
                </div>

                <div className="mt-6 flex items-center gap-1.5 text-[11px] font-medium text-primary">
                  <CheckCircle className="size-3.5" />
                  <span>Dispensary & Inventory Authority</span>
                </div>
              </button>
            )}

            {/* Billing Card */}
            {mods.includes("billing") && (
              <button
                type="button"
                onClick={() => handleSelectModule("billing")}
                className="group relative flex flex-col justify-between rounded-xl border bg-card p-6 text-left shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-primary hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer motion-reduce:hover:translate-y-0"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Receipt className="size-6" />
                    </div>
                    <Badge variant="outline" className="text-[11px] font-medium">
                      Operations
                    </Badge>
                  </div>

                  

                  <div className="mt-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                      Billing
                    </h2>
                    <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                  </div>

                  <div className="text-xs font-semibold text-muted-foreground mt-0.5">
                    Reception, POS and patient operations
                  </div>

                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    Patient registrations, appointment booking, OPD waiting queue tokens, POS cashiering, receipts, and expenses.
                  </p>
                </div>

                <div className="mt-6 flex items-center gap-1.5 text-[11px] font-medium text-primary">
                  <CheckCircle className="size-3.5" />
                  <span>Clinical & Cashier Operations</span>
                </div>
              </button>
            )}
          </div>
        </section>

        {/* Discreet Footer */}
        <footer className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t pt-4 text-xs text-muted-foreground">
          <span>Olympus Lanka Hospital · Hospital Management System</span>
          <span className="font-mono text-[11px]">Demo prototype · Fictional credentials</span>
        </footer>
      </div>
    </main>
  );
}
