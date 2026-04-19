import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useListNotifications, useGetMe } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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
  Menu,
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

const MOBILE_TABS = [
  { to: "/app", label: "Home", icon: LayoutDashboard },
  { to: "/app/contacts", label: "People", icon: Users },
  { to: "/app/followups", label: "Follow", icon: CalendarClock },
  { to: "/app/hub", label: "Hub", icon: Megaphone },
  { to: "/app/notifications", label: "Inbox", icon: Bell },
];

export function Layout({ children }: { children: ReactNode }) {
  const [loc] = useLocation();
  const { logout } = useAuth();
  const { data: me } = useGetMe();
  const { data: notifs } = useListNotifications({ query: { refetchInterval: 30_000 } as any });
  const unread = (notifs ?? []).filter((n) => !n.readAt).length;
  const initial = ((me?.name ?? me?.username ?? me?.email ?? "?")[0] ?? "?").toUpperCase();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => { setDrawerOpen(false); }, [loc]);

  const navList = (onNavigate?: () => void) => (
    <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
      {NAV.map(({ to, label, icon: Icon }) => {
        const active = loc === to || (to !== "/app" && loc.startsWith(to));
        return (
          <Link
            key={to}
            href={to}
            onClick={onNavigate}
            className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] transition-all ${
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
  );

  const userBlock = (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/60 transition-colors">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-cyan-400 text-primary-foreground grid place-items-center text-sm font-semibold shrink-0">
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium truncate">
          {me?.name ?? me?.username ?? "You"}
        </div>
        <div className="text-[11px] text-muted-foreground truncate">
          {me?.email ?? me?.discordUsername ?? ""}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="w-8 h-8 shrink-0"
        title="Sign out"
        onClick={logout}
      >
        <LogOut className="w-4 h-4" />
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Desktop sidebar (hidden on mobile/tablet) */}
      <aside className="hidden lg:flex w-64 shrink-0 border-r border-sidebar-border bg-sidebar/70 glass flex-col sticky top-0 h-screen">
        <Link
          href="/app"
          aria-label="NS Lens — go to home"
          className="px-5 pt-5 pb-4 flex items-center gap-2.5 rounded-md hover:bg-secondary/40 transition-colors mx-2 mt-1"
        >
          <LensMark className="w-7 h-7" />
          <div className="flex flex-col leading-tight">
            <span className="font-semibold tracking-tight text-[15px]">NS Lens</span>
            <span className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">your network, in focus</span>
          </div>
        </Link>
        {navList()}
        <div className="p-3 border-t border-sidebar-border">{userBlock}</div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Mobile / tablet top bar */}
        <header className="lg:hidden sticky top-0 z-40 glass border-b border-border/60 h-14 px-3 flex items-center gap-2">
          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="w-10 h-10" aria-label="Open menu">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 bg-sidebar border-sidebar-border flex flex-col">
              <SheetHeader className="px-5 pt-5 pb-2 text-left">
                <SheetTitle asChild>
                  <Link
                    href="/app"
                    onClick={() => setDrawerOpen(false)}
                    aria-label="NS Lens — go to home"
                    className="flex items-center gap-2.5"
                  >
                    <LensMark className="w-7 h-7" />
                    <span className="font-semibold tracking-tight">NS Lens</span>
                  </Link>
                </SheetTitle>
              </SheetHeader>
              {navList(() => setDrawerOpen(false))}
              <div className="p-3 border-t border-sidebar-border">{userBlock}</div>
            </SheetContent>
          </Sheet>

          <Link href="/app" className="flex items-center gap-2 min-w-0">
            <LensMark className="w-6 h-6 shrink-0" />
            <span className="font-semibold tracking-tight truncate">NS Lens</span>
          </Link>

          <div className="ml-auto flex items-center gap-1">
            <Link href="/app/notifications">
              <Button variant="ghost" size="icon" className="w-10 h-10 relative" aria-label="Inbox">
                <Bell className="w-5 h-5" />
                {unread > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
                )}
              </Button>
            </Link>
          </div>
        </header>

        <main className="flex-1 min-w-0 overflow-x-hidden pb-[env(safe-area-inset-bottom)] lg:pb-0">
          <div className="lg:pb-0 pb-20">
            {children}
          </div>
        </main>

        {/* Mobile bottom tab bar */}
        <nav
          className="lg:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-border/60 h-16 grid grid-cols-5"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {MOBILE_TABS.map(({ to, label, icon: Icon }) => {
            const active = loc === to || (to !== "/app" && loc.startsWith(to));
            return (
              <Link
                key={to}
                href={to}
                className={`relative flex flex-col items-center justify-center gap-0.5 text-[10.5px] transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="leading-none">{label}</span>
                {to === "/app/notifications" && unread > 0 && (
                  <span className="absolute top-2 right-[calc(50%-14px)] w-2 h-2 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
