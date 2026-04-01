"use client";

import Link from "next/link";
import {FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { login, signup } from "@/services/api";
import { useAuthStore } from "@/store/useAuthStore";

type AuthFormProps =
  | {
      mode: "login";
    }
  | {
      mode: "signup";
    };

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const copy = useMemo(
    () =>
      mode === "login"
        ? {
            title: "Welcome back",
            subtitle: "Sign in to continue building and reviewing assignments.",
            submit: "Login",
            switchText: "Need an account?",
            switchHref: "/signup",
            switchLabel: "Create one",
          }
        : {
            title: "Create your account",
            subtitle: "Set up your workspace and start creating assessments.",
            submit: "Sign Up",
            switchText: "Already have an account?",
            switchHref: "/login",
            switchLabel: "Login",
          },
    [mode]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response =
        mode === "login"
          ? await login({ email: email.trim(), password })
          : await signup({ name: name.trim(), email: email.trim(), password });

      if (typeof window !== "undefined") {
        window.localStorage.setItem("veda-auth-token", response.token);
      }

      setAuth(response);
      router.replace("/");
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? String((err as { response?: { data?: { error?: string } } }).response?.data?.error || "")
          : "";

      setError(message || "Unable to complete authentication. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <section className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff8f1_0%,_#f2efe9_45%,_#ddd8cf_100%)] px-5 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1120px] items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[28px] bg-white shadow-[0_24px_80px_rgba(30,41,59,0.14)] lg:grid-cols-[1.05fr_0.95fr]">
          <div className="hidden bg-[linear-gradient(135deg,_#1f1f1f_0%,_#2f2f2f_44%,_#ff8f52_100%)] px-10 py-12 text-white lg:block">
            <p className="text-xs uppercase tracking-[0.3em] text-white/70">VedaAI</p>
            <h1 className="mt-6 max-w-[320px] text-5xl font-semibold tracking-[-0.06em]">
              Connected assessment workflows for real classrooms.
            </h1>
            <p className="mt-5 max-w-[360px] text-sm leading-7 text-white/78">
              Move from login to dashboard, create a new assignment, review the output, and jump back to a refreshed workspace without losing context.
            </p>
          </div>

          <div className="px-6 py-8 sm:px-10 sm:py-10">
            <p className="text-xs uppercase tracking-[0.3em] text-[#8a8a8a] lg:hidden">VedaAI</p>
            <h2 className="mt-3 text-[34px] font-semibold tracking-[-0.05em] text-[#232323]">
              {copy.title}
            </h2>
            <p className="mt-3 max-w-[420px] text-sm leading-7 text-[#6b6b6b]">{copy.subtitle}</p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              {mode === "signup" ? (
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#2d2d2d]">Full Name</label>
                  <Input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="John Doe"
                    className="h-12 rounded-[16px] bg-[#faf8f4] px-4 text-sm"
                  />
                </div>
              ) : null}

              <div>
                <label className="mb-2 block text-sm font-medium text-[#2d2d2d]">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="teacher@school.edu"
                  className="h-12 rounded-[16px] bg-[#faf8f4] px-4 text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#2d2d2d]">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  className="h-12 rounded-[16px] bg-[#faf8f4] px-4 text-sm"
                />
              </div>

              {error ? <p className="text-sm text-[#b42318]">{error}</p> : null}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-12 w-full rounded-[16px] bg-[#1f1f1f] text-sm font-medium text-white transition hover:bg-[#2b2b2b]"
              >
                {isSubmitting ? "Please wait..." : copy.submit}
              </Button>
            </form>

            <p className="mt-6 text-sm text-[#6b6b6b]">
              {copy.switchText}{" "}
              <Link href={copy.switchHref} className="font-semibold text-[#1f1f1f]">
                {copy.switchLabel}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
