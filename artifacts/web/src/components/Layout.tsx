import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Show, useClerk, useUser } from "@clerk/react";
import { useListNotifications } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  LayoutDashboard,
  Users,
  MessageCircle,
  Sparkles,
  Megaphone,
  Bell,
  LogOut,
  UserCircle,
  CalendarClock,
} from "lucide-react";

const NAV = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/contacts", label: "Contacts", icon: Users },
  { to: "/app/followups", label: "Follow-ups", icon: CalendarClock },
  { to: "/app/chat", label: "Memory Chat", icon: MessageCircle },
  { to: "/app/agent", label: "Agent", icon: Sparkles },
  { to: "/app/hub", label: "Founders Hub", icon: Megaphone },
  { to: "/app/notifications", label: "Notifications", icon: Bell },
  { to: "/app/profile", label: "Profile & Friends", icon: UserCircle },
];

export function Layout({ children }: { children: ReactNode }) {
  const [loc] = useLocation();
  const { signOut } = useClerk();
  const { user } = useUser();
  const { data: notifs } = useListNotifications({ query: { refetchInterval: 30_000 } as any });
  const unread = (notifs ?? []).filter((n) => !n.readAt).length;

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside className="w-60 shrink-0 border-r bg-card flex flex-col">
        <div className="p-4 border-b flex items-center gap-2">
          <Brain className="w-6 h-6 text-primary" />
          <span className="font-semibold tracking-tight">Network Brain</span>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = loc === to || (to !== "/app" && loc.startsWith(to));
            return (
              <Link
                key={to}
                href={to}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="flex-1">{label}</span>
                {to === "/app/notifications" && unread > 0 && (
                  <Badge variant={active ? "secondary" : "default"}>{unread}</Badge>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t space-y-2">
          <div className="text-xs text-muted-foreground truncate">
            {user?.primaryEmailAddress?.emailAddress ?? user?.username}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => signOut({ redirectUrl: window.location.origin })}
          >
            <LogOut className="w-4 h-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Show when="signed-in">{children}</Show>
      </main>
    </div>
  );
}
