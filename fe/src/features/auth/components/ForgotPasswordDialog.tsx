import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Info, CheckCircle2 } from "lucide-react";
import { forgotPasswordSchema, type ForgotPasswordFormValues } from "../schemas/loginSchema";
import { requestPasswordReset } from "../services/authService";

interface ForgotPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ForgotPasswordDialog({ open, onOpenChange }: ForgotPasswordDialogProps) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { identity: "" },
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    setLoading(true);
    try {
      await requestPasswordReset(values.identity);
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      reset();
      setSubmitted(false);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Reset Password</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Password reset simulation for staff accounts.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="space-y-4 py-2">
            <Alert className="border-emerald-200 bg-success-soft text-emerald-900">
              <CheckCircle2 className="size-4 text-emerald-600" />
              <AlertTitle className="text-sm font-semibold">Instructions Dispatched</AlertTitle>
              <AlertDescription className="text-xs space-y-1">
                <p>
                  If an active account matches the details provided, recovery instructions have been sent.
                </p>
                <p className="font-semibold text-emerald-800">
                  [Simulated prototype notice: No actual email or SMS was sent.]
                </p>
              </AlertDescription>
            </Alert>

            <p className="text-xs text-muted-foreground leading-relaxed">
              In production, staff credential resets are handled securely through encrypted time-limited tokens or verified hospital administrator override.
            </p>

            <div className="flex justify-end pt-2">
              <Button type="button" onClick={() => handleClose(false)}>
                Back to Sign in
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
            <Alert className="border-amber-200 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100">
              <Info className="size-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-xs leading-relaxed">
                Password reset is not connected to a live email/SMS gateway in this prototype. In production, a secure link is sent to your registered contact.
              </AlertDescription>
            </Alert>

            <div className="space-y-1.5">
              <Label htmlFor="forgot-identity">Username, Email, or Mobile</Label>
              <Input
                id="forgot-identity"
                autoFocus
                placeholder="e.g. admin or 0712345678"
                {...register("identity")}
                aria-invalid={!!errors.identity}
                disabled={loading}
              />
              {errors.identity && (
                <p role="alert" className="text-xs text-destructive">
                  {errors.identity.message}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                Send Reset Link
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
