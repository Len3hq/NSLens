import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
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

  function setToken(t: string) {
    localStorage.setItem(TOKEN_KEY, t);
    setTokenState(t);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setTokenState(null);
  }

  useEffect(() => {
    setAuthTokenGetter(async () => {
      if (!token || isTokenExpired(token)) {
        logout();
        return null;
      }
      return token;
    });
  }, [token]);

  return (
    <AuthContext.Provider value={{ token, isLoggedIn: !!token, logout, setToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
