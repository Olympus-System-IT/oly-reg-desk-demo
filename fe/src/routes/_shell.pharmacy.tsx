import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Guard } from "@/components/hms/common";

export const Route = createFileRoute("/_shell/pharmacy")({
  component: () => (
    <Guard perm="pharmacy.access" what="pharmacy module">
      <Outlet />
    </Guard>
  ),
});
