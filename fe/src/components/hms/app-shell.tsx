import type { ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Stethoscope, Tags, CalendarClock, FlaskConical, Users, Settings, BarChart3,
  UserPlus, CalendarPlus, ClipboardList, ListOrdered, CreditCard, Receipt, Wallet, LogOut, Building2, ChevronDown,
  ShieldCheck, MessageSquare, TrendingUp, Pill, Boxes, Truck, History,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { mutate, useCurrentUser, useDB } from "@/lib/hms/store";
import { can, MODULE_LABEL, modulesFor, ROLE_LABEL, type Perm } from "@/lib/hms/permissions";
import type { ModuleKey } from "@/lib/hms/types";

type NavItem = { title: string; to: string; icon: typeof LayoutDashboard; perm: Perm };
export const NAV: Record<ModuleKey, { group: string; items: NavItem[] }[]> = {
  sfa: [
    {
      group: "Overview",
      items: [
        { title: "Dashboard", to: "/dashboard", icon: LayoutDashboard, perm: "dashboard.view" },
        { title: "Financial Dashboard", to: "/financial-dashboard", icon: TrendingUp, perm: "dashboard.view" },
      ],
    },
    {
      group: "Setup",
      items: [
        { title: "Consultant Types", to: "/specialties", icon: Tags, perm: "setup.manage" },
        { title: "Doctors", to: "/doctors", icon: Stethoscope, perm: "setup.manage" },
        { title: "Doctor sessions", to: "/sessions", icon: CalendarClock, perm: "sessions.view" },
        { title: "Services & Modalities", to: "/services", icon: FlaskConical, perm: "setup.manage" },
      ],
    },
    {
      group: "Administration",
      items: [
        { title: "Users", to: "/users", icon: Users, perm: "users.manage" },
        { title: "Approvals", to: "/approvals", icon: ShieldCheck, perm: "refund.approve" },
        { title: "Reports & P&L", to: "/reports", icon: BarChart3, perm: "reports.view" },
        { title: "Settings", to: "/settings", icon: Settings, perm: "setup.manage" },
      ],
    },
  ],
  billing: [
    {
      group: "Overview",
      items: [
        { title: "Dashboard", to: "/dashboard", icon: LayoutDashboard, perm: "dashboard.view" },
        { title: "Financial Dashboard", to: "/financial-dashboard", icon: TrendingUp, perm: "dashboard.view" },
      ],
    },
    {
      group: "Reception",
      items: [
        { title: "New booking", to: "/book", icon: CalendarPlus, perm: "bookings.manage" },
        { title: "Patients", to: "/patients", icon: UserPlus, perm: "patients.view" },
        { title: "Appointments", to: "/appointments", icon: ClipboardList, perm: "patients.view" },
        { title: "Queue", to: "/queue", icon: ListOrdered, perm: "queue.update" },
        { title: "Doctor sessions", to: "/sessions", icon: CalendarClock, perm: "sessions.view" },
        { title: "SMS Centre", to: "/messages", icon: MessageSquare, perm: "patients.view" },
      ],
    },
    {
      group: "Cashier",
      items: [
        { title: "POS", to: "/pos", icon: CreditCard, perm: "billing.collect" },
        { title: "Invoices", to: "/invoices", icon: Receipt, perm: "billing.view" },
        { title: "Expenses", to: "/expenses", icon: Wallet, perm: "expenses.manage" },
        { title: "Reports", to: "/reports", icon: BarChart3, perm: "reports.view" },
      ],
    },
  ],
  pharmacy: [
    {
      group: "Overview",
      items: [
        { title: "Pharmacy Dashboard", to: "/pharmacy", icon: LayoutDashboard, perm: "pharmacy.access" },
      ],
    },
    {
      group: "Dispensing & Counter",
      items: [
        { title: "Dispense / Counter POS", to: "/pharmacy/dispense", icon: CreditCard, perm: "pharmacy.dispense" },
        { title: "Prescriptions", to: "/pharmacy/prescriptions", icon: ClipboardList, perm: "pharmacy.access" },
        { title: "Dispensed History", to: "/pharmacy/history", icon: Receipt, perm: "pharmacy.access" },
      ],
    },
    {
      group: "Stock & Inventory",
      items: [
        { title: "Medications Master", to: "/pharmacy/inventory", icon: Pill, perm: "pharmacy.inventory" },
        { title: "Batch & Expiry Tracker", to: "/pharmacy/batches", icon: Boxes, perm: "pharmacy.inventory" },
        { title: "Suppliers & POs", to: "/pharmacy/suppliers", icon: Truck, perm: "pharmacy.manage" },
      ],
    },
    {
      group: "Reports",
      items: [
        { title: "Pharmacy Reports", to: "/pharmacy/reports", icon: BarChart3, perm: "reports.view" },
      ],
    },
  ],
};

const TITLES: Record<string, string> = {
  dashboard: "Dashboard", "financial-dashboard": "Financial Dashboard", specialties: "Consultant Types", doctors: "Doctors", sessions: "Doctor sessions", services: "Services & Modalities",
  users: "Users", approvals: "Approvals", reports: "Reports", settings: "Settings", book: "New booking", patients: "Patients", appointments: "Appointments",
  queue: "Queue", pos: "POS", invoices: "Invoices", expenses: "Expenses", messages: "SMS Centre",
  pharmacy: "Dashboard", dispense: "Dispense / Counter POS", prescriptions: "Prescriptions", history: "Dispensed History", inventory: "Medications Master", batches: "Batch & Expiry Tracker", suppliers: "Suppliers & POs",
};

function AppSidebar({ module }: { module: ModuleKey }) {
  const user = useCurrentUser();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { state } = useSidebar();
  return (
    <Sidebar collapsible="icon" className="no-print">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2.5 px-1 py-1.5">
          <div className="overflow-hidden rounded-md bg-white p-0.5 border border-border/60 shadow-2xs size-8 shrink-0 flex items-center justify-center">
            <img
              src="/logo.png"
              alt="Olympus Lanka Hospital Logo"
              className="size-full object-contain"
            />
          </div>
          {state === "expanded" && (
            <div className="min-w-0 leading-tight">
              <div className="truncate text-sm font-semibold">Olympus Lanka Hospital</div>
              <div className="text-xs text-muted-foreground">
                <span className="font-medium text-brand-red">{MODULE_LABEL[module].name}</span> module
              </div>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        {NAV[module].map((g) => {
          const items = g.items.filter((i) => can(user, i.perm));
          if (!items.length) return null;
          return (
            <SidebarGroup key={g.group}>
              <SidebarGroupLabel>{g.group}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((i) => (
                    <SidebarMenuItem key={i.to}>
                      <SidebarMenuButton
                        asChild
                        isActive={
                          i.to === "/pharmacy"
                            ? path === "/pharmacy" || path === "/pharmacy/"
                            : path === i.to || path.startsWith(i.to + "/")
                        }
                        tooltip={i.title}
                      >
                        <Link to={i.to}>
                          <i.icon />
                          <span>{i.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
      <SidebarFooter className="border-t">
        {state === "expanded" && (
          <p className="px-2 text-[11px] leading-snug text-muted-foreground">Demo prototype · fictional data · simulated SMS & payments</p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const db = useDB();
  const user = useCurrentUser();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const mods = modulesFor(user);
  const module: ModuleKey = db.auth.module && mods.includes(db.auth.module) ? db.auth.module : mods[0] ?? "billing";
  const segs = path.split("/").filter(Boolean);
  const displaySegs = segs[0] === "pharmacy" && segs.length > 1 ? segs.slice(1) : segs;

  const switchModule = (m: ModuleKey) => {
    mutate((d) => (d.auth.module = m));
    navigate({ to: m === "pharmacy" ? "/pharmacy" : m === "sfa" ? "/dashboard" : can(user, "dashboard.view") ? "/dashboard" : "/queue" });
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar module={module} />
        <SidebarInset className="bg-background">
          <header className="no-print sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-card px-3 sm:px-4">
            <SidebarTrigger aria-label="Toggle sidebar" />
            <div className="flex items-center gap-2 md:hidden">
              <div className="size-7 overflow-hidden rounded bg-white p-0.5 border border-border/60 shadow-2xs flex items-center justify-center shrink-0">
                <img
                  src="/logo.png"
                  alt="Olympus Lanka Hospital Logo"
                  className="size-full object-contain"
                />
              </div>
              <span className="text-xs font-semibold text-foreground truncate max-w-[140px]">Olympus Lanka</span>
            </div>
            <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1.5 text-sm text-muted-foreground md:flex">
              <span className="font-medium text-foreground">{MODULE_LABEL[module].name}</span>
              {displaySegs.map((s, i) => (
                <span key={i} className="flex items-center gap-1.5 truncate">
                  <span aria-hidden>/</span>
                  {i < displaySegs.length - 1 ? (
                    <Link to={"/" + segs.slice(0, (segs[0] === "pharmacy" && segs.length > 1 ? 1 : 0) + i + 1).join("/")} className="hover:text-primary">
                      {TITLES[s] ?? s}
                    </Link>
                  ) : (
                    <span className="truncate text-foreground">{TITLES[s] ?? s}</span>
                  )}
                </span>
              ))}
            </nav>
            <div className="ml-auto flex items-center gap-2">
              {mods.length > 1 && (
                <div role="group" aria-label="Module switcher" className="flex rounded-md border p-0.5">
                  {mods.map((m) => (
                    <button
                      key={m}
                      onClick={() => switchModule(m)}
                      aria-pressed={m === module}
                      className={
                        m === module
                          ? "rounded px-3 py-1 text-xs font-semibold bg-primary text-primary-foreground"
                          : "rounded px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                      }
                    >
                      {MODULE_LABEL[m].name}
                    </button>
                  ))}
                </div>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-9 gap-2 px-2">
                    <span className="flex size-7 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                      {user?.name.split(" ").map((x) => x[0]).join("").slice(0, 2)}
                    </span>
                    <span className="hidden text-left leading-tight sm:block">
                      <span className="block text-sm font-medium">{user?.name}</span>
                      <span className="block text-[11px] text-muted-foreground">{user && ROLE_LABEL[user.role]}</span>
                    </span>
                    <ChevronDown className="size-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    {user?.name}
                    <div className="text-xs font-normal text-muted-foreground">{user && ROLE_LABEL[user.role]} · demo session</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => navigate({ to: "/modules" })}>Switch module</DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onSelect={() => {
                      mutate((d) => (d.auth = { userId: null, module: null }));
                      navigate({ to: "/" });
                    }}
                  >
                    <LogOut className="size-4" /> Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="mx-auto w-full max-w-[1400px] flex-1 p-3 sm:p-5 lg:p-6">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
