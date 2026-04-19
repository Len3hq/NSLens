import { useEffect } from "react";
import { useLocation } from "wouter";
import { FaDiscord } from "react-icons/fa";
import { useAuth } from "@/lib/auth";

const API_URL = (import.meta.env.VITE_API_URL as string | undefined ?? "").replace(/\/$/, "");
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const ERROR_MESSAGES: Record<string, string> = {
  not_member: "Your Discord account is not an NS member. Join ns.com to get access.",
  discord_error: "Discord authentication failed. Please try again.",
  ns_error: "Could not verify NS membership. Please try again.",
  invalid_state: "Login session expired. Please try again.",
  server_error: "Something went wrong on our end. Please try again.",
  no_token: "Login failed — no token received. Please try again.",
};

export default function Login() {
  const { isLoggedIn } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoggedIn) setLocation("/app");
  }, [isLoggedIn, setLocation]);

  const searchParams = new URLSearchParams(window.location.search);
  const error = searchParams.get("error");

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl">
        <div className="mb-6 flex justify-center">
          <img src={`${basePath}/logo.svg`} alt="NS Lens" className="h-10" />
        </div>
        <h1 className="mb-1 text-center text-2xl font-semibold tracking-tight">
          Sign in to NS Lens
        </h1>
        <p className="mb-8 text-center text-sm text-muted-foreground">
          Network School members only — sign in with your Discord account.
        </p>

        {error && (
          <div className="mb-6 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {ERROR_MESSAGES[error] ?? "Login failed. Please try again."}
          </div>
        )}

        <a
          href={`${API_URL}/api/auth/discord`}
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#5865F2] px-4 py-3 text-sm font-semibold text-white hover:bg-[#4752c4] transition-colors"
        >
          <FaDiscord className="h-5 w-5" />
          Continue with Discord
        </a>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Only verified NS members can access NS Lens.
        </p>
      </div>
    </div>
  );
}
