import { useEffect, useRef, useState } from "react";
import { useClerk } from "@clerk/react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MailCheck, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

type Phase = "enter" | "sending" | "waiting";

export default function SignInWithLink() {
  const clerk = useClerk();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<Phase>("enter");
  const cancelFlow = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      cancelFlow.current?.();
    };
  }, []);

  if (!clerk.loaded) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const verifyUrl = `${window.location.origin}${basePath}/verify`;

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

    // 1. Try to sign in (existing user)
    try {
      const created = await signIn.create({ identifier: emailAddress });
      const factor = created.supportedFirstFactors?.find(
        (f: any) => f.strategy === "email_link",
      ) as { emailAddressId: string } | undefined;
      if (!factor) {
        toast.error("Email link sign-in isn't enabled on this account.");
        setPhase("enter");
        return;
      }
      const { startEmailLinkFlow, cancelEmailLinkFlow } =
        signIn.createEmailLinkFlow();
      cancelFlow.current = cancelEmailLinkFlow;
      setPhase("waiting");
      const result = await startEmailLinkFlow({
        emailAddressId: factor.emailAddressId,
        redirectUrl: verifyUrl,
      });
      cancelFlow.current = null;
      if (result.status === "complete" && result.createdSessionId) {
        await clerk.setActive({ session: result.createdSessionId });
        setLocation("/app");
        return;
      }
      // If verified in another tab, the session may already be active
      if (result.status === "complete" || (result as any).status === "expired") {
        if ((result as any).status === "expired") {
          toast.error("That link expired. Please request a new one.");
          setPhase("enter");
          return;
        }
      }
      // Verified elsewhere
      setLocation("/app");
      return;
    } catch (err: any) {
      const code = err?.errors?.[0]?.code;
      if (code !== "form_identifier_not_found") {
        toast.error(errMsg(err, "Couldn't send link. Try again."));
        setPhase("enter");
        return;
      }
      // fall through to sign-up
    }

    // 2. New user — sign-up flow
    try {
      await signUp.create({ emailAddress });
      const { startEmailLinkFlow, cancelEmailLinkFlow } =
        signUp.createEmailLinkFlow();
      cancelFlow.current = cancelEmailLinkFlow;
      setPhase("waiting");
      const result = await startEmailLinkFlow({ redirectUrl: verifyUrl });
      cancelFlow.current = null;
      const v = (result as any).verifications?.emailAddress;
      if (v?.status === "expired") {
        toast.error("That link expired. Please request a new one.");
        setPhase("enter");
        return;
      }
      if (result.status === "complete" && result.createdSessionId) {
        await clerk.setActive({ session: result.createdSessionId });
        setLocation("/app");
        return;
      }
      // Verified in another tab
      setLocation("/app");
    } catch (err: any) {
      toast.error(errMsg(err, "Couldn't create your account."));
      setPhase("enter");
    }
  }

  function reset() {
    cancelFlow.current?.();
    cancelFlow.current = null;
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
              Enter your email and we'll send you a link to sign in. No password needed.
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
                data-testid="send-link-button"
              >
                {phase === "sending" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending link…
                  </>
                ) : (
                  "Send sign-in link"
                )}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                We'll create an account automatically if you're new here.
              </p>
            </form>
          </>
        ) : (
          <div className="text-center" data-testid="waiting-panel">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <MailCheck className="h-6 w-6 text-primary" />
            </div>
            <h1 className="mb-1 text-2xl font-semibold tracking-tight">
              Check your email
            </h1>
            <p className="mb-6 text-sm text-muted-foreground">
              We sent a sign-in link to{" "}
              <span className="font-medium text-foreground">{email}</span>. Click it to
              finish signing in. You can open it on this device or any other — we'll log
              you in automatically.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Waiting for confirmation…
            </div>
            <button
              type="button"
              onClick={reset}
              className="mt-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="mr-1 h-3 w-3" />
              Use a different email
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
