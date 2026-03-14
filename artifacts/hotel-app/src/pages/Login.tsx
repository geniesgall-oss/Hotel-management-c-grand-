import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BedDouble } from "lucide-react"

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
})

type LoginForm = z.infer<typeof loginSchema>

export default function Login() {
  const { login } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "admin",
      password: "admin123"
    }
  })

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)
    try {
      await login(data)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Visual left panel */}
      <div className="hidden lg:flex flex-1 relative bg-primary overflow-hidden items-center justify-center">
        <div className="absolute inset-0 z-0">
          <img 
            src={`${import.meta.env.BASE_URL}images/hotel-bg.png`} 
            alt="Hotel Background" 
            className="w-full h-full object-cover opacity-40 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/50 to-transparent" />
        </div>
        <div className="relative z-10 text-primary-foreground max-w-lg p-12">
          <div className="h-16 w-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mb-8 shadow-2xl">
            <BedDouble className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-5xl font-display font-bold mb-6 leading-tight">Elevate Your Hospitality Management.</h1>
          <p className="text-xl text-primary-foreground/80 leading-relaxed font-light">
            Streamlined check-ins, real-time room status, and comprehensive history tracking. Built for modern hoteliers.
          </p>
        </div>
      </div>

      {/* Login Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-6 lg:hidden shadow-lg">
              <BedDouble className="h-6 w-6 text-primary-foreground" />
            </div>
            <h2 className="text-3xl font-display font-bold text-foreground">Welcome Back</h2>
            <p className="mt-2 text-muted-foreground">Sign in to your account to continue</p>
          </div>

          <div className="bg-card p-8 rounded-2xl shadow-xl border border-border/50">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="admin"
                  {...register("username")}
                  className={errors.username ? "border-destructive" : ""}
                />
                {errors.username && <p className="text-sm text-destructive">{errors.username.message}</p>}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...register("password")}
                  className={errors.password ? "border-destructive" : ""}
                />
                {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
              </div>

              <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
                Sign In to Dashboard
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-border space-y-3">
              <p className="text-sm text-center font-semibold text-foreground mb-4">Demo Credentials</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-secondary p-3 rounded-xl text-center">
                  <span className="block text-xs text-muted-foreground uppercase tracking-wider mb-1">Admin Role</span>
                  <span className="text-sm font-mono font-medium text-foreground">admin / admin123</span>
                </div>
                <div className="bg-secondary p-3 rounded-xl text-center">
                  <span className="block text-xs text-muted-foreground uppercase tracking-wider mb-1">Staff Role</span>
                  <span className="text-sm font-mono font-medium text-foreground">staff / staff123</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
