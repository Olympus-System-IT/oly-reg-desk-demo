import { z } from "zod";

export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "Enter your username or email")
    .max(100, "Username is too long"),
  password: z
    .string()
    .min(1, "Enter your password")
    .max(100, "Password is too long"),
  rememberMe: z.boolean(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  identity: z
    .string()
    .trim()
    .min(1, "Enter your registered username, email, or mobile")
    .max(100, "Input is too long"),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
