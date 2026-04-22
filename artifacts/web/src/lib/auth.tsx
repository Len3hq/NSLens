import { createContext, useContext, useState, useRef, useCallback, useEffect, type ReactNode } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";

interface AuthState {
  token: string | null;
  isLoggedIn: boolean;
  logout: () => void;
  setToken: (token: string) => void;
}

const AuthContext = createContext<AuthState>({
  token: null,
  isLoggedIn: false,
  logout: () => {},
  setToken: () => {},
});

const TOKEN_KEY = "ns_auth_token";

function isTokenExpired(token: string): boolean {
  try {
    const part = token.split(".")[1]!;
    // JWT uses base64url; atob requires standard base64 with padding
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), "=");
    const payload = JSON.parse(atob(padded));
    return typeof payload.exp === "number" && payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored && isTokenExpired(stored)) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return stored;
  });

  // Ref always holds the latest token so the async getter never reads a stale closure
  const tokenRef = useRef(token);

  // Stable references — useCallback with [] ensures these never change identity
  // across renders. This is critical: AuthCallback's useEffect depends on setToken,
  // and an unstable reference would re-fire the effect after the hash is cleared,
  // sending the user to /login?error=no_token on every login attempt.
  const setToken = useCallback((t: string) => {
    tokenRef.current = t;
    localStorage.setItem(TOKEN_KEY, t);
    setTokenState(t);
  }, []);

  const logout = useCallback(() => {
    tokenRef.current = null;
    localStorage.removeItem(TOKEN_KEY);
    setTokenState(null);
  }, []);

  // Registered once. Reads tokenRef.current so it always sees the latest token
  // regardless of when the async fetch fires relative to React's effect flush.
  useEffect(() => {
    setAuthTokenGetter(async () => {
      const t = tokenRef.current;
      if (!t || isTokenExpired(t)) {
        if (t) {
          tokenRef.current = null;
          localStorage.removeItem(TOKEN_KEY);
          setTokenState(null);
        }
        return null;
      }
      return t;
    });
    return () => setAuthTokenGetter(null);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthContext.Provider value={{ token, isLoggedIn: !!token, logout, setToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
