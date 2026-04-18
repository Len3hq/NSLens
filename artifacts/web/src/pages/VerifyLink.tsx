import { useEffect, useState } from "react";
import { useClerk } from "@clerk/react";
import { useLocation } from "wouter";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function VerifyLink() {
  const clerk = useClerk();
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"verifying" | "success" | "error">(
    "verifying",
  );
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (!clerk.loaded) return;
    let cancelled = false;
    (async () => {
      try {
        await clerk.handleEmailLinkVerification({
          redirectUrl: `${basePath || ""}/app`,
          redirectUrlComplete: `${basePath || ""}/app`,
        });
        if (cancelled) return;
        setStatus("success");
        setTimeout(() => setLocation("/app"), 600);
      } catch (err: any) {
        if (cancelled) return;
        setStatus("error");
        setErrorMsg(
          err?.errors?.[0]?.longMessage ??
            err?.errors?.[0]?.message ??
            err?.message ??
            "This link is invalid or has expired.",
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clerk, setLocation]);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-xl">
        <div className="mb-6 flex justify-center">
          <img src={`${basePath}/logo.svg`} alt="NS Lens" className="h-10" />
        </div>
        {status === "verifying" && (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
            <h1 className="mb-1 text-2xl font-semibold tracking-tight">
              Signing you in
            </h1>
            <p className="text-sm text-muted-foreground">Verifying your link…</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <h1 className="mb-1 text-2xl font-semibold tracking-tight">
              You're signed in
            </h1>
            <p className="text-sm text-muted-foreground">Redirecting…</p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <h1 className="mb-1 text-2xl font-semibold tracking-tight">
              Link expired
            </h1>
            <p className="mb-4 text-sm text-muted-foreground">{errorMsg}</p>
            <button
              type="button"
              onClick={() => setLocation("/sign-in")}
              className="text-sm font-medium text-primary hover:underline"
            >
              Request a new link
            </button>
          </>
        )}
      </div>
    </div>
  );
}
