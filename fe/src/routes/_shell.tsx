import { createFileRoute, Navigate, Outlet, useHydrated } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/hms/app-shell";
import { useCurrentUser } from "@/lib/hms/store";

export const Route = createFileRoute("/_shell")({
  component: ShellLayout,
});

function ShellLayout() {
  const hydrated = useHydrated();
  const user = useCurrentUser();
  if (!hydrated)
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground" role="status">
        <Loader2 className="mr-2 size-5 animate-spin" /> Loading…
      </div>
    );
  if (!user) return <Navigate to="/" />;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
