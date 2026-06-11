"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { signUpSchema, type SignUpFormValues } from "@/lib/validations";

export default function SignUpPage() {
  const { register: registerUser } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
  });

  const onSubmit = async (data: SignUpFormValues) => {
    setServerError(null);
    try {
      await registerUser({
        full_name: data.full_name,
        email: data.email,
        password: data.password,
      });
      router.push("/settings");
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Registration failed. Please try again."
      );
    }
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-2xl text-white">Create account</CardTitle>
        <CardDescription className="text-zinc-400">
          Start generating professional YouTube metadata
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="full_name" className="text-zinc-300 text-sm">
              Full Name
            </Label>
            <Input
              id="full_name"
              type="text"
              placeholder="Alex Johnson"
              autoComplete="name"
              disabled={isSubmitting}
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-red-500 focus-visible:border-red-500"
              {...register("full_name")}
            />
            {errors.full_name && (
              <p role="alert" className="text-red-400 text-xs mt-1">
                {errors.full_name.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-zinc-300 text-sm">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              disabled={isSubmitting}
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-red-500 focus-visible:border-red-500"
              {...register("email")}
            />
            {errors.email && (
              <p role="alert" className="text-red-400 text-xs mt-1">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-zinc-300 text-sm">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Min. 8 characters"
              autoComplete="new-password"
              disabled={isSubmitting}
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-red-500 focus-visible:border-red-500"
              {...register("password")}
            />
            {errors.password && (
              <p role="alert" className="text-red-400 text-xs mt-1">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm_password" className="text-zinc-300 text-sm">
              Confirm Password
            </Label>
            <Input
              id="confirm_password"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              disabled={isSubmitting}
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-red-500 focus-visible:border-red-500"
              {...register("confirm_password")}
            />
            {errors.confirm_password && (
              <p role="alert" className="text-red-400 text-xs mt-1">
                {errors.confirm_password.message}
              </p>
            )}
          </div>

          {serverError && (
            <div
              role="alert"
              className="rounded-md bg-red-950/50 border border-red-900 px-3 py-2 text-sm text-red-400"
            >
              {serverError}
            </div>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-medium"
            aria-busy={isSubmitting}
          >
            {isSubmitting ? "Creating account…" : "Create account"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-zinc-500">
          Already have an account?{" "}
          <Link
            href="/sign-in"
            className="text-zinc-300 hover:text-white underline underline-offset-4 transition-colors"
          >
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
