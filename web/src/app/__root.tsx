import { createRootRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { Zap, Radio } from "lucide-react";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const location = useLocation();
  const pathname = location.pathname;

  const isDaily = pathname === "/" || pathname.startsWith("/daily");
  const isWeekly = pathname.startsWith("/weekly");
  const isPodcast = pathname.startsWith("/podcast");

  return (
    <div className="min-h-screen bg-[#ffffff]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-[#e5e5e5]">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-[#111111] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-lg tracking-tight text-[#111111]">
              AI Pulse
            </span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-1">
            <NavLink to="/" active={isDaily}>
              日报
            </NavLink>
            <NavLink to="/weekly" active={isWeekly}>
              周报
            </NavLink>
            <NavLink to="/podcast" active={isPodcast}>
              <Radio className="h-4 w-4 mr-1.5" />
              播客
            </NavLink>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e5e5e5] mt-auto">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between text-sm text-[#666666]">
          <span>AI Pulse · 每日精选 AI 资讯</span>
          <span className="text-[#a3a3a3]">© 2026</span>
        </div>
      </footer>
    </div>
  );
}

function NavLink({
  to,
  active,
  children,
}: {
  to: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className={`relative px-4 py-2 text-sm font-medium transition-colors rounded-md flex items-center
        ${active 
          ? "text-[#111111] bg-[#f5f5f5]" 
          : "text-[#666666] hover:text-[#111111] hover:bg-[#fafafa]"
        }`}
    >
      {children}
      {active && (
        <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#111111] rounded-full" />
      )}
    </Link>
  );
}
