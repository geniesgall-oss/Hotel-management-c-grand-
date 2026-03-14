import { ReactNode } from "react"
import { Link, useLocation } from "wouter"
import { useAuth } from "@/hooks/use-auth"
import { LayoutDashboard, LogIn, LogOut, History, BedDouble, UserCheck, Users } from "lucide-react"
import { cn } from "@/lib/utils"

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation()
  const { user, logout } = useAuth()
  const isAdmin = user?.role === "admin"

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard, adminOnly: false },
    { href: "/checkin", label: "Check-In", icon: LogIn, adminOnly: false },
    { href: "/checkout", label: "Check-Out", icon: LogOut, adminOnly: false },
    { href: "/history", label: "History", icon: History, adminOnly: false },
    { href: "/users", label: "User Management", icon: Users, adminOnly: true },
  ]

  const visibleItems = navItems.filter(item => !item.adminOnly || isAdmin)

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-card border-r border-border/50 flex flex-col shrink-0 sticky top-0 md:h-screen z-20">
        <div className="p-6 md:p-7 flex items-center gap-3 border-b border-border/40">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
            <BedDouble className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display font-bold text-base leading-tight text-foreground truncate">Grand Hotel</h1>
            <p className="text-xs text-muted-foreground">Management System</p>
          </div>
        </div>

        <nav className="flex-1 px-3 md:px-4 py-3 flex gap-1 md:flex-col overflow-x-auto md:overflow-visible">
          {visibleItems.map((item) => {
            const Icon = item.icon
            const isActive = location === item.href
            return (
              <Link key={item.href} href={item.href} className="shrink-0">
                <div className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all duration-200 cursor-pointer",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  item.adminOnly && "border border-dashed border-border/40 hover:border-primary/30"
                )}>
                  <Icon className="h-4.5 w-4.5 shrink-0" size={18} />
                  <span className="hidden md:inline text-sm">{item.label}</span>
                  {item.adminOnly && (
                    <span className="hidden md:inline ml-auto text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold uppercase tracking-wide">
                      Admin
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </nav>

        {user && (
          <div className="p-4 md:p-5 mt-auto border-t border-border/50">
            <div className="flex items-center gap-3 mb-3 px-1">
              <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold border border-primary/20 shrink-0 text-sm">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-semibold truncate text-foreground">{user.username}</p>
                <p className="text-xs text-muted-foreground capitalize flex items-center gap-1">
                  <UserCheck className="h-3 w-3" />
                  {user.role}
                </p>
              </div>
            </div>
            <button
              onClick={() => logout()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-5 md:p-9 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
