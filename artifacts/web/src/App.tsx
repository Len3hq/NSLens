import { useEffect, useRef } from "react";
import { ClerkProvider, Show, useClerk, useAuth } from "@clerk/react";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "@/lib/queryClient";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import Contacts from "@/pages/Contacts";
import ContactDetail from "@/pages/ContactDetail";
import Chat from "@/pages/Chat";
import AgentPage from "@/pages/Agent";
import Hub from "@/pages/Hub";
import Notifications from "@/pages/Notifications";
import SignInWithLink from "@/pages/SignInWithLink";
import VerifyLink from "@/pages/VerifyLink";
import PublicPost from "@/pages/PublicPost";
import Profile from "@/pages/Profile";
import FollowUps from "@/pages/FollowUps";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

const clerkAppearance = {
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(252, 84%, 67%)",
    colorBackground: "hsl(0, 0%, 100%)",
    colorInputBackground: "hsl(0, 0%, 100%)",
    colorText: "hsl(222, 47%, 11%)",
    colorTextSecondary: "hsl(215, 16%, 47%)",
    colorInputText: "hsl(222, 47%, 11%)",
    colorNeutral: "hsl(222, 47%, 11%)",
    borderRadius: "0.75rem",
    fontFamily: "Inter, system-ui, sans-serif",
    fontFamilyButtons: "Inter, system-ui, sans-serif",
    fontSize: "0.95rem",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "border border-border shadow-xl rounded-2xl w-full overflow-hidden bg-card",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "",
    headerSubtitle: "",
    socialButtonsBlockButtonText: "",
    formFieldLabel: "",
    footerActionLink: "",
    footerActionText: "",
    dividerText: "",
    identityPreviewEditButton: "",
    formFieldSuccessText: "",
    alertText: "",
    logoBox: "justify-center",
    logoImage: "h-10",
    socialButtonsBlockButton: "border border-input hover:bg-accent",
    formButtonPrimary: "bg-primary hover:bg-primary/90 text-primary-foreground",
    formFieldInput: "border border-input bg-background",
    footerAction: "",
    dividerLine: "bg-border",
    alert: "border border-border",
    otpCodeFieldInput: "border border-input bg-background",
    formFieldRow: "",
    main: "",
  },
};

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in"><Redirect to="/app" /></Show>
      <Show when="signed-out"><Home /></Show>
    </>
  );
}

function AppArea({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Show when="signed-in"><Layout>{children}</Layout></Show>
      <Show when="signed-out"><Redirect to="/" /></Show>
    </>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prev = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    return addListener(({ user }) => {
      const id = user?.id ?? null;
      if (prev.current !== undefined && prev.current !== id) qc.clear();
      prev.current = id;
    });
  }, [addListener, qc]);
  return null;
}

// Bridges Clerk's session token into the generated API client so every
// request gets `Authorization: Bearer <token>` and the server can identify
// the user. Without this, every protected API call returns 401.
function ClerkAuthBridge() {
  const { getToken, isSignedIn } = useAuth();
  useEffect(() => {
    setAuthTokenGetter(async () => {
      if (!isSignedIn) return null;
      try {
        return (await getToken()) ?? null;
      } catch {
        return null;
      }
    });
  }, [getToken, isSignedIn]);
  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      localization={{
        signIn: { start: { title: "Welcome back", subtitle: "Sign in to your network brain" } },
        signUp: { start: { title: "Build your network brain", subtitle: "It takes a few seconds" } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ClerkAuthBridge />
          <ClerkQueryClientCacheInvalidator />
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in" component={SignInWithLink} />
            <Route path="/sign-up"><Redirect to="/sign-in" /></Route>
            <Route path="/verify" component={VerifyLink} />
            <Route path="/verify/*?" component={VerifyLink} />
            <Route path="/hub/p/:id" component={PublicPost} />
            <Route path="/app"><AppArea><Dashboard /></AppArea></Route>
            <Route path="/app/contacts"><AppArea><Contacts /></AppArea></Route>
            <Route path="/app/contacts/:id"><AppArea><ContactDetail /></AppArea></Route>
            <Route path="/app/chat"><AppArea><Chat /></AppArea></Route>
            <Route path="/app/agent"><AppArea><AgentPage /></AppArea></Route>
            <Route path="/app/hub"><AppArea><Hub /></AppArea></Route>
            <Route path="/app/notifications"><AppArea><Notifications /></AppArea></Route>
            <Route path="/app/profile"><AppArea><Profile /></AppArea></Route>
            <Route path="/app/followups"><AppArea><FollowUps /></AppArea></Route>
            <Route><Redirect to="/" /></Route>
          </Switch>
          <Toaster richColors position="top-right" />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}
