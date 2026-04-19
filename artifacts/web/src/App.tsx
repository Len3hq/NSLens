import { Switch, Route, Redirect, Router as WouterRouter } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Layout } from "@/components/Layout";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import Contacts from "@/pages/Contacts";
import ContactDetail from "@/pages/ContactDetail";
import Chat from "@/pages/Chat";
import AgentPage from "@/pages/Agent";
import Hub from "@/pages/Hub";
import Notifications from "@/pages/Notifications";
import Login from "@/pages/Login";
import AuthCallback from "@/pages/AuthCallback";
import PublicPost from "@/pages/PublicPost";
import Profile from "@/pages/Profile";
import FollowUps from "@/pages/FollowUps";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function HomeRedirect() {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? <Redirect to="/app" /> : <Home />;
}

function AppArea({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? <Layout>{children}</Layout> : <Redirect to="/login" />;
}

function Routes() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/login" component={Login} />
      <Route path="/auth/callback" component={AuthCallback} />
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
  );
}

export default function App() {
  return (
    <WouterRouter base={basePath}>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Routes />
            <Toaster richColors position="top-right" />
          </TooltipProvider>
        </QueryClientProvider>
      </AuthProvider>
    </WouterRouter>
  );
}
