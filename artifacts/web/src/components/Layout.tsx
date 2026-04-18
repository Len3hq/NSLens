import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Show, useClerk, useUser } from "@clerk/react";
import { useListNotifications } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LensMark } from "@/components/Brand";
import {
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
  { to: "/app", label: "Home", icon: LayoutDashboard },
  { to: "/app/contacts", label: "People", icon: Users },
  { to: "/app/followups", label: "Follow-ups", icon: CalendarClock },
  { to: "/app/chat", label: "Memory", icon: MessageCircle },
  { to: "/app/agent", label: "Agent", icon: Sparkles },
  { to: "/app/hub", label: "Hub", icon: Megaphone },
  { to: "/app/notifications", label: "Inbox", icon: Bell },
  { to: "/app/profile", label: "Profile", icon: UserCircle },
];

export function Layout({ children }: { children: ReactNode }) {
  const [loc] = useLocation();
  const { signOut } = useClerk();
  const { user } = useUser();
  const { data: notifs } = useListNotifications({ query: { refetchInterval: 30_000 } as any });
  const unread = (notifs ?? []).filter((n) => !n.readAt).length;
  const initial = (user?.firstName?.[0] || user?.username?.[0] || user?.primaryEmailAddress?.emailAddress?.[0] || "?").toUpperCase();

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside className="w-64 shrink-0 border-r border-sidebar-border bg-sidebar/70 glass flex flex-col sticky top-0 h-screen">
        <div className="px-5 pt-5 pb-4 flex items-center gap-2.5">
          <LensMark className="w-7 h-7" />
          <div className="flex flex-col leading-tight">
            <span className="font-semibold tracking-tight text-[15px]">NS Lens</span>
            <span className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">your network, in focus</span>
          </div>
        </div>
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = loc === to || (to !== "/app" && loc.startsWith(to));
            return (
              <Link
                key={to}
                href={to}
                className={`group relative flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] transition-all ${
                  active
                    ? "bg-primary/15 text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-primary" aria-hidden />
                )}
                <Icon className={`w-[18px] h-[18px] ${active ? "text-primary" : ""}`} />
                <span className="flex-1">{label}</span>
                {to === "/app/notifications" && unread > 0 && (
                  <Badge className="h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground border-0">
                    {unread}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/60 transition-colors">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-cyan-400 text-primary-foreground grid place-items-center text-sm font-semibold shrink-0">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium truncate">
                {user?.firstName || user?.username || "You"}
              </div>
              <div className="text-[11px] text-muted-foreground truncate">
                {user?.primaryEmailAddress?.emailAddress}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8"
              title="Sign out"
              onClick={() => signOut({ redirectUrl: window.location.origin })}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>
      <main className="flex-1 min-w-0 overflow-auto">
        <Show when="signed-in">{children}</Show>
      </main>
    </div>
  );
}
