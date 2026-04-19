import { useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function AuthCallback() {
  const { setToken } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const token = params.get("token");
    // Clear the hash so the token isn't left in browser history
    history.replaceState(null, "", window.location.pathname);
    if (token) {
      setToken(token);
      setLocation("/app");
    } else {
      setLocation("/login?error=no_token");
    }
  }, [setToken, setLocation]);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}
