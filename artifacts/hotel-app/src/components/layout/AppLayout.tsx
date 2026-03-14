import { ReactNode } from "react"
import { Link, useLocation } from "wouter"
import { useAuth } from "@/hooks/use-auth"
import { LayoutDashboard, LogIn, LogOut, History, BedDouble, UserCheck } from "lucide-react"
import { cn } from "@/lib/utils"

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation()
  const { user, logout } = useAuth()

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/checkin", label: "Check-In", icon: LogIn },
    { href: "/checkout", label: "Check-Out", icon: LogOut },
    { href: "/history", label: "History", icon: History },
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-card border-r border-border/50 flex flex-col shrink-0 sticky top-0 md:h-screen">
        <div className="p-6 md:p-8 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <BedDouble className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg leading-tight text-foreground">Grand Hotel</h1>
            <p className="text-xs text-muted-foreground">Management System</p>
          </div>
        </div>

        <nav className="flex-1 px-4 md:px-6 flex gap-2 md:flex-col overflow-x-auto md:overflow-visible pb-4 md:pb-0">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location === item.href
            return (
              <Link key={item.href} href={item.href} className="shrink-0">
                <div className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 cursor-pointer",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/10" 
                    : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                )}>
                  <Icon className="h-5 w-5" />
                  <span className="hidden md:inline">{item.label}</span>
                </div>
              </Link>
            )
          })}
        </nav>

        {user && (
          <div className="p-4 md:p-6 mt-auto border-t border-border/50">
            <div className="flex items-center gap-3 mb-4 px-2">
              <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-primary font-bold border border-border">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-semibold truncate">{user.username}</p>
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
              Sign Out
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 md:p-10 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
