import { useEffect, useRef, useState } from "react";
import { useClerk } from "@clerk/react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MailCheck, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

type Phase = "enter" | "sending" | "code";
type Mode = "signIn" | "signUp";

export default function SignInWithLink() {
  const clerk = useClerk();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [phase, setPhase] = useState<Phase>("enter");
  const [mode, setMode] = useState<Mode>("signIn");
  const [verifying, setVerifying] = useState(false);
  const verifyingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (phase === "code") inputRef.current?.focus();
  }, [phase]);

  if (!clerk.loaded) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  function errMsg(err: any, fallback: string) {
    return (
      err?.errors?.[0]?.longMessage ??
      err?.errors?.[0]?.message ??
      err?.message ??
      fallback
    );
  }

  async function startFlow(emailAddress: string) {
    setPhase("sending");
    const client = clerk.client;
    if (!client) {
      toast.error("Auth not ready, please reload.");
      setPhase("enter");
      return;
    }
    const signIn = client.signIn;
    const signUp = client.signUp;

    // 1. Try sign-in
    try {
      const created = await signIn.create({ identifier: emailAddress });
      const factor = created.supportedFirstFactors?.find(
        (f: any) => f.strategy === "email_code",
      ) as { emailAddressId: string } | undefined;
      if (!factor) {
        toast.error("Email code sign-in isn't enabled for this account.");
        setPhase("enter");
        return;
      }
      await signIn.prepareFirstFactor({
        strategy: "email_code",
        emailAddressId: factor.emailAddressId,
      });
      setMode("signIn");
      setPhase("code");
      return;
    } catch (err: any) {
      const code = err?.errors?.[0]?.code;
      if (code !== "form_identifier_not_found") {
        toast.error(errMsg(err, "Couldn't send code. Try again."));
        setPhase("enter");
        return;
      }
      // fall through → sign-up
    }

    // 2. New user — sign-up
    try {
      const localPart = emailAddress.split("@")[0] ?? "";
      const friendly =
        localPart
          .split(/[._-]+/)
          .filter(Boolean)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ") || "Member";
      await signUp.create({
        emailAddress,
        firstName: friendly,
        lastName: " ",
      });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setMode("signUp");
      setPhase("code");
    } catch (err: any) {
      toast.error(errMsg(err, "Couldn't create your account."));
      setPhase("enter");
    }
  }

  async function verifyCode(otp: string) {
    if (verifyingRef.current) return;
    verifyingRef.current = true;
    setVerifying(true);
    const client = clerk.client;
    if (!client) {
      toast.error("Auth not ready, please reload.");
      verifyingRef.current = false;
      setVerifying(false);
      return;
    }
    try {
      if (mode === "signIn") {
        let signIn = client.signIn;
        if (signIn.firstFactorVerification?.status !== "verified") {
          const result = await signIn.attemptFirstFactor({
            strategy: "email_code",
            code: otp,
          });
          signIn = result;
        }
        if (signIn.status === "complete" && signIn.createdSessionId) {
          await clerk.setActive({ session: signIn.createdSessionId });
          setLocation("/app");
          return;
        }
        toast.error(`Couldn't sign you in (status: ${signIn.status}).`);
      } else {
        let signUp = client.signUp;
        if (signUp.verifications?.emailAddress?.status !== "verified") {
          const result = await signUp.attemptEmailAddressVerification({
            code: otp,
          });
          signUp = result;
        }
        // If sign-up needs more fields, fill safe defaults and retry.
        if (
          signUp.status === "missing_requirements" &&
          signUp.missingFields?.length
        ) {
          const updates: Record<string, string> = {};
          for (const f of signUp.missingFields) {
            if (f === "first_name") updates.firstName = "Member";
            else if (f === "last_name") updates.lastName = " ";
            else if (f === "username")
              updates.username = `user_${Math.random().toString(36).slice(2, 9)}`;
          }
          if (Object.keys(updates).length) {
            signUp = await signUp.update(updates);
          }
        }
        if (signUp.status === "complete" && signUp.createdSessionId) {
          await clerk.setActive({ session: signUp.createdSessionId });
          setLocation("/app");
          return;
        }
        toast.error(
          `Couldn't finish sign-up (status: ${signUp.status}${
            signUp.missingFields?.length
              ? `, missing: ${signUp.missingFields.join(", ")}`
              : ""
          }).`,
        );
      }
    } catch (err: any) {
      toast.error(errMsg(err, "Invalid or expired code."));
    } finally {
      verifyingRef.current = false;
      setVerifying(false);
    }
  }

  async function resend() {
    const client = clerk.client;
    if (!client) return;
    try {
      if (mode === "signIn") {
        const factor = client.signIn.supportedFirstFactors?.find(
          (f: any) => f.strategy === "email_code",
        ) as { emailAddressId: string } | undefined;
        if (!factor) throw new Error("No email factor found.");
        await client.signIn.prepareFirstFactor({
          strategy: "email_code",
          emailAddressId: factor.emailAddressId,
        });
      } else {
        await client.signUp.prepareEmailAddressVerification({
          strategy: "email_code",
        });
      }
      toast.success("New code sent.");
    } catch (err: any) {
      toast.error(errMsg(err, "Couldn't resend code."));
    }
  }

  function reset() {
    setCode("");
    setPhase("enter");
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl">
        <div className="mb-6 flex justify-center">
          <img src={`${basePath}/logo.svg`} alt="Network Brain" className="h-10" />
        </div>

        {phase === "enter" || phase === "sending" ? (
          <>
            <h1 className="mb-1 text-center text-2xl font-semibold tracking-tight">
              Sign in to Network Brain
            </h1>
            <p className="mb-6 text-center text-sm text-muted-foreground">
              Enter your email and we'll send you a one-time code. No password needed.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!email.trim()) return;
                startFlow(email.trim().toLowerCase());
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={phase === "sending"}
                  data-testid="email-input"
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={phase === "sending" || !email.trim()}
                data-testid="send-code-button"
              >
                {phase === "sending" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending code…
                  </>
                ) : (
                  "Send sign-in code"
                )}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                We'll create an account automatically if you're new here.
              </p>
              <div id="clerk-captcha" className="flex justify-center" />
            </form>
          </>
        ) : (
          <div data-testid="code-panel">
            <div className="mb-4 flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <MailCheck className="h-6 w-6 text-primary" />
              </div>
            </div>
            <h1 className="mb-1 text-center text-2xl font-semibold tracking-tight">
              Check your email
            </h1>
            <p className="mb-6 text-center text-sm text-muted-foreground">
              We sent a 6-digit code to{" "}
              <span className="font-medium text-foreground">{email}</span>.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (code.length >= 6) verifyCode(code.trim());
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="code">Verification code</Label>
                <Input
                  id="code"
                  ref={inputRef}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="123456"
                  value={code}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setCode(v);
                    if (v.length === 6 && !verifying) verifyCode(v);
                  }}
                  className="text-center text-lg tracking-[0.5em]"
                  disabled={verifying}
                  data-testid="code-input"
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={verifying || code.length < 6}
                data-testid="verify-code-button"
              >
                {verifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  "Verify and sign in"
                )}
              </Button>
            </form>
            <div className="mt-6 flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="mr-1 h-3 w-3" />
                Use a different email
              </button>
              <button
                type="button"
                onClick={resend}
                className="text-primary hover:underline"
              >
                Resend code
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
