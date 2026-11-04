import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect, useRef } from "react";
import {
  Eye,
  EyeOff,
  AlertCircle,
  AlertTriangle,
  Clock,
  Loader2,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useCurrentUser } from "@/lib/hms/store";
import { modulesFor } from "@/lib/hms/permissions";
import { loginSchema, type LoginFormValues } from "@/features/auth/schemas/loginSchema";
import {
  signIn,
  sanitizeRedirectUrl,
  getRememberedUsername,
  setRememberedUsername,
  clearRememberedUsername,
  getRemainingLockoutSeconds,
} from "@/features/auth/services/authService";
import { BrandPanel } from "@/features/auth/components/BrandPanel";
import { ForgotPasswordDialog } from "@/features/auth/components/ForgotPasswordDialog";
import { CompanyLogo } from "@/components/hms/CompanyLogo";

const searchSchema = z.object({
  next: z.string().optional(),
  returnTo: z.string().optional(),
  reason: z.string().optional(),
});

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Sign in — Hospital Management System" },
      {
        name: "description",
        content:
          "Sign in to the outpatient hospital management system for administration, reception, billing, and patient queues.",
      },
      { property: "og:title", content: "Sign in — Hospital Management System" },
      {
        property: "og:description",
        content: "Outpatient administration, bookings, queues, billing, and reports.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/" });
  const currentUser = useCurrentUser();

  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [lockoutSecs, setLockoutSecs] = useState(() => getRemainingLockoutSeconds());
  const [forgotOpen, setForgotOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signInSuccess, setSignInSuccess] = useState(false);

  const usernameInputRef = useRef<HTMLInputElement | null>(null);

  // If already authenticated, redirect immediately
  useEffect(() => {
    if (currentUser) {
      const safeTarget = sanitizeRedirectUrl(search.next || search.returnTo);
      if (safeTarget) {
        navigate({ to: safeTarget as any });
        return;
      }
      const mods = modulesFor(currentUser);
      if (mods.length === 1) {
        navigate({ to: mods[0] === "pharmacy" ? "/pharmacy" : currentUser.role === "nurse" ? "/queue" : "/dashboard" });
      } else {
        navigate({ to: "/modules" });
      }
    }
  }, [currentUser, navigate, search.next, search.returnTo]);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutSecs <= 0) return;
    const timer = setInterval(() => {
      setLockoutSecs((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setErrorMessage("");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSecs]);

  // Initialize form with remembered username if present
  const rememberedUser = getRememberedUsername();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setFocus,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: rememberedUser,
      password: "",
      rememberMe: Boolean(rememberedUser),
    },
  });

  const rememberMeVal = watch("rememberMe");

  const handlePasswordKeyEvent = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState) {
      setCapsLockOn(e.getModifierState("CapsLock"));
    }
  };

  const onSubmit = async (data: LoginFormValues) => {
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const res = await signIn(data.username, data.password);

      if (!res.success) {
        if (res.error === "locked" && res.remainingSeconds) {
          setLockoutSecs(res.remainingSeconds);
        }
        setErrorMessage(res.message);
        setFocus("password");
        return;
      }

      // Handle Remember Me
      if (data.rememberMe) {
        setRememberedUsername(data.username);
      } else {
        clearRememberedUsername();
      }

      setSignInSuccess(true);

      // Safe open-redirect handling
      const safeTarget = sanitizeRedirectUrl(search.next || search.returnTo);
      setTimeout(() => {
        if (safeTarget) {
          navigate({ to: safeTarget as any });
        } else if (res.permittedModules.length === 1) {
          navigate({ to: res.permittedModules[0] === "pharmacy" ? "/pharmacy" : res.user.role === "nurse" ? "/queue" : "/dashboard" });
        } else {
          navigate({ to: "/modules" });
        }
      }, 350);
    } catch {
      setErrorMessage("A network or service error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLocked = lockoutSecs > 0;

  return (
    <main className="min-h-[100dvh] w-full grid grid-cols-1 lg:grid-cols-12 bg-background overflow-x-hidden">
      {/* LEFT BRAND PANEL (Desktop >= 1024px: ~45% width) */}
      <div className="hidden lg:flex lg:col-span-5 h-full">
        <BrandPanel />
      </div>

      {/* RIGHT FORM PANEL (55% width on desktop, full on mobile/tablet) */}
      <div className="lg:col-span-7 flex flex-col justify-between p-4 sm:p-8 md:p-12 min-h-[100dvh]">
        {/* Compact Tablet / Mobile Header (< 1024px) */}
        <header className="lg:hidden w-full max-w-[420px] mx-auto pt-2 pb-4 flex items-center justify-between border-b mb-4">
          <CompanyLogo size="md" showText subtext="Hospital Management" />
          <span className="text-[11px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
            Prototype
          </span>
        </header>

        {/* Centered Form Card */}
        <div className="w-full max-w-[420px] mx-auto my-auto space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none">
          {/* Header Title */}
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Sign in
            </h1>
            <p className="text-sm text-muted-foreground">
              Use your staff account to continue.
            </p>
          </div>

          {/* Session Expired Banner */}
          {search.reason === "expired" && (
            <Alert className="border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100">
              <Clock className="size-4 text-amber-600 dark:text-amber-400" />
              <AlertTitle className="text-xs font-semibold">Session Expired</AlertTitle>
              <AlertDescription className="text-xs">
                Your session has expired. Please sign in again to continue your work.
              </AlertDescription>
            </Alert>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <Alert
              variant="destructive"
              className="border-destructive/40 bg-danger-soft text-destructive animate-in shake motion-reduce:animate-none"
            >
              <AlertCircle className="size-4" />
              <AlertTitle className="text-xs font-semibold">
                {isLocked ? "Access Locked" : "Authentication Failed"}
              </AlertTitle>
              <AlertDescription className="text-xs">
                {errorMessage}
                {isLocked && (
                  <span className="block mt-1 font-mono font-medium">
                    Try again in {lockoutSecs}s
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Success Banner */}
          {signInSuccess && (
            <Alert className="border-emerald-300 bg-success-soft text-emerald-900">
              <CheckCircle2 className="size-4 text-emerald-600" />
              <AlertTitle className="text-xs font-semibold">Signed In</AlertTitle>
              <AlertDescription className="text-xs">
                Credentials verified. Redirecting to your workspace…
              </AlertDescription>
            </Alert>
          )}

          {/* Form Card */}
          <div className="rounded-lg border border-t-4 border-t-brand-red bg-card p-6 shadow-xs space-y-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              {/* Username Field */}
              <div className="space-y-1.5">
                <Label htmlFor="login-username">Username or email</Label>
                <Input
                  id="login-username"
                  autoComplete="username"
                  autoFocus
                  placeholder="e.g. admin, manager, or email"
                  {...register("username")}
                  disabled={isSubmitting || isLocked || signInSuccess}
                  aria-invalid={!!errors.username}
                  className="h-10"
                />
                {errors.username && (
                  <p role="alert" className="text-xs text-destructive">
                    {errors.username.message}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="login-password">Password</Label>
                  <button
                    type="button"
                    onClick={() => setForgotOpen(true)}
                    className="text-xs text-primary hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter password"
                    {...register("password")}
                    onKeyDown={handlePasswordKeyEvent}
                    onKeyUp={handlePasswordKeyEvent}
                    onBlur={() => setCapsLockOn(false)}
                    disabled={isSubmitting || isLocked || signInSuccess}
                    aria-invalid={!!errors.password}
                    className="h-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded-r"
                    tabIndex={0}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>

                {/* Caps Lock Warning */}
                {capsLockOn && (
                  <p
                    role="status"
                    className="flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 mt-1"
                  >
                    <AlertTriangle className="size-3 shrink-0" />
                    Caps Lock is ON
                  </p>
                )}

                {errors.password && (
                  <p role="alert" className="text-xs text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Remember Me */}
              <div className="flex items-center gap-2 pt-0.5">
                <Checkbox
                  id="login-remember"
                  checked={rememberMeVal}
                  onCheckedChange={(c) => setValue("rememberMe", Boolean(c))}
                  disabled={isSubmitting || isLocked || signInSuccess}
                />
                <Label
                  htmlFor="login-remember"
                  className="text-xs text-muted-foreground cursor-pointer font-normal"
                >
                  Remember my username on this device
                </Label>
              </div>

              {/* Sign In Button */}
              <Button
                type="submit"
                className="w-full h-11 bg-primary text-primary-foreground font-semibold hover:bg-primary/95 transition-all shadow-xs cursor-pointer"
                disabled={isSubmitting || isLocked || signInSuccess}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Signing in…
                  </>
                ) : isLocked ? (
                  `Locked (${lockoutSecs}s)`
                ) : (
                  "Sign in"
                )}
              </Button>

              {/* Security & Honesty Note */}
              <p className="text-center text-[11px] text-muted-foreground">
                <ShieldAlert className="inline size-3 mr-1 text-muted-foreground/80" />
                Demo authentication: not production security.
              </p>
            </form>
          </div>
        </div>

        {/* Discreet Mobile Footer */}
        <footer className="w-full max-w-[420px] mx-auto pt-4 pb-2 text-center text-xs text-muted-foreground border-t lg:border-none">
          Olympus Lanka Hospital · Outpatient Management System
        </footer>
      </div>

      {/* Forgot Password Dialog */}
      <ForgotPasswordDialog open={forgotOpen} onOpenChange={setForgotOpen} />
    </main>
  );
}
