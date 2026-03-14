import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import { AppLayout } from "./components/layout/AppLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CheckIn from "./pages/CheckIn";
import CheckOut from "./pages/CheckOut";
import History from "./pages/History";
import Users from "./pages/Users";
import NotFound from "./pages/not-found";

// Global fetch interceptor — properly handles Headers objects
const originalFetch = window.fetch;
window.fetch = async (input, init) => {
  const token = localStorage.getItem("hotel_token");
  if (token) {
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${token}`);
    return originalFetch(input, { ...init, headers });
  }
  return originalFetch(input, init);
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

function ProtectedRoute({
  component: Component,
  adminOnly = false,
}: {
  component: React.ComponentType;
  adminOnly?: boolean;
}) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [_, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-4 border-primary border-r-transparent animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    setLocation("/login");
    return null;
  }

  if (adminOnly && user?.role !== "admin") {
    setLocation("/");
    return null;
  }

  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/checkin" component={() => <ProtectedRoute component={CheckIn} />} />
      <Route path="/checkout" component={() => <ProtectedRoute component={CheckOut} />} />
      <Route path="/history" component={() => <ProtectedRoute component={History} />} />
      <Route path="/users" component={() => <ProtectedRoute component={Users} adminOnly />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <AuthProvider>
          <Router />
        </AuthProvider>
      </WouterRouter>
      <Toaster
        position="top-right"
        toastOptions={{ className: "font-sans rounded-xl border border-border shadow-2xl" }}
      />
    </QueryClientProvider>
  );
}

export default App;
