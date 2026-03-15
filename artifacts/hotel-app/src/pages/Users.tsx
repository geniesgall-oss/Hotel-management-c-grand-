import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { UserPlus, Trash2, Users as UsersIcon, ShieldCheck, User as UserIcon } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

interface UserRecord {
  id: number
  username: string
  role: "admin" | "staff"
  email: string | null
}

const userSchema = z.object({
  username: z.string().min(2, "Username must be at least 2 characters").max(30),
  password: z.string().min(4, "Password must be at least 4 characters"),
  role: z.enum(["admin", "staff"], { errorMap: () => ({ message: "Select a role" }) }),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
})

type UserForm = z.infer<typeof userSchema>

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "")

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, opts)
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Request failed" }))
    throw new Error(body.error || "Request failed")
  }
  return res.json()
}

const EASE = [0.22, 1, 0.36, 1] as const

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: EASE, delay },
})

export default function Users() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [toDelete, setToDelete] = useState<UserRecord | null>(null)
  const [deleting, setDeleting] = useState(false)

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: { role: "staff" },
  })
  const selectedRole = watch("role")

  const fetchUsers = async () => {
    try {
      const data = await apiFetch("/api/users")
      setUsers(data)
    } catch {
      toast.error("Failed to load users")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  const onSubmit = async (data: UserForm) => {
    try {
      await apiFetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, email: data.email || null }),
      })
      toast.success(`User "${data.username}" created successfully`)
      reset({ role: "staff" })
      fetchUsers()
    } catch (err: any) {
      toast.error(err.message || "Failed to create user")
    }
  }

  const handleDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await apiFetch(`/api/users/${toDelete.id}`, { method: "DELETE" })
      toast.success(`User "${toDelete.username}" deleted`)
      setToDelete(null)
      fetchUsers()
    } catch (err: any) {
      toast.error(err.message || "Failed to delete user")
    } finally {
      setDeleting(false)
    }
  }

  const inputCls = (hasError?: boolean) =>
    `flex h-11 w-full rounded-xl border bg-input/50 px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all ${hasError ? "border-destructive" : "border-border"}`

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <motion.div {...fadeUp(0)}>
        <h1 className="text-3xl font-display font-bold text-foreground">User Management</h1>
        <p className="text-muted-foreground mt-1">Add and manage staff and admin accounts.</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

        {/* Create User Form */}
        <motion.div {...fadeUp(0.1)}>
          <Card className="border border-border/70 shadow-2xl shadow-black/30">
            <CardHeader className="bg-secondary/40 pb-5 border-b border-border/60">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <UserPlus className="h-5 w-5 text-primary" />
                Create New Account
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <motion.div {...fadeUp(0.18)} className="space-y-1.5">
                  <Label htmlFor="username">Username</Label>
                  <input
                    id="username"
                    placeholder="e.g. Priya"
                    autoComplete="off"
                    {...register("username")}
                    className={inputCls(!!errors.username)}
                  />
                  {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
                </motion.div>

                <motion.div {...fadeUp(0.22)} className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <input
                    id="new-password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    {...register("password")}
                    className={inputCls(!!errors.password)}
                  />
                  {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                </motion.div>

                <motion.div {...fadeUp(0.26)} className="space-y-1.5">
                  <Label htmlFor="email">Email (optional)</Label>
                  <input
                    id="email"
                    type="email"
                    placeholder="email@hotel.com"
                    autoComplete="off"
                    {...register("email")}
                    className={inputCls(!!errors.email)}
                  />
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </motion.div>

                <motion.div {...fadeUp(0.3)} className="space-y-1.5">
                  <Label>Role</Label>
                  <div className="flex gap-3">
                    {(["staff", "admin"] as const).map(role => (
                      <motion.button
                        key={role}
                        type="button"
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setValue("role", role)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                          selectedRole === role
                            ? "bg-primary text-primary-foreground border-primary shadow-md"
                            : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                        }`}
                      >
                        {role === "admin"
                          ? <><ShieldCheck className="h-4 w-4" /> Admin</>
                          : <><UserIcon className="h-4 w-4" /> Staff</>
                        }
                      </motion.button>
                    ))}
                  </div>
                  {errors.role && <p className="text-xs text-destructive">{errors.role.message}</p>}
                </motion.div>

                <motion.div {...fadeUp(0.34)}>
                  <Button type="submit" className="w-full mt-2" isLoading={isSubmitting}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create Account
                  </Button>
                </motion.div>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Users List */}
        <motion.div {...fadeUp(0.16)}>
          <Card className="border border-border/70 shadow-2xl shadow-black/30">
            <CardHeader className="bg-secondary/40 pb-5 border-b border-border/60">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <UsersIcon className="h-5 w-5 text-primary" />
                All Accounts
                <AnimatePresence mode="wait">
                  <motion.div
                    key={users.length}
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.7, opacity: 0 }}
                    className="ml-auto"
                  >
                    <Badge className="bg-primary/10 text-primary border border-primary/20 text-xs">
                      {users.length}
                    </Badge>
                  </motion.div>
                </AnimatePresence>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-14 bg-secondary rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : users.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="p-10 text-center text-muted-foreground"
                >
                  <UsersIcon className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p>No users found</p>
                </motion.div>
              ) : (
                <div className="divide-y divide-border">
                  <AnimatePresence>
                    {users.map((u, i) => (
                      <motion.div
                        key={u.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20, height: 0 }}
                        transition={{ delay: i * 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        className="flex items-center gap-3 px-5 py-3.5"
                      >
                        <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                          u.role === "admin"
                            ? "bg-primary/15 text-primary"
                            : "bg-secondary text-muted-foreground"
                        }`}>
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground text-sm truncate">{u.username}</p>
                          {u.email && <p className="text-xs text-muted-foreground truncate">{u.email}</p>}
                        </div>
                        <Badge className={`text-xs shrink-0 border ${
                          u.role === "admin"
                            ? "bg-primary/10 text-primary border-primary/20"
                            : "bg-secondary text-muted-foreground border-border"
                        }`}>
                          {u.role === "admin" ? <><ShieldCheck className="h-3 w-3 mr-1 inline" />Admin</> : "Staff"}
                        </Badge>
                        {u.id !== currentUser?.id && (
                          <motion.div whileTap={{ scale: 0.9 }}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
                              onClick={() => setToDelete(u)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </motion.div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {toDelete && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setToDelete(null)}
            />
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="relative bg-card rounded-2xl border border-border shadow-2xl w-full max-w-sm p-6 space-y-4"
            >
              <motion.h2
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
                className="text-xl font-display font-bold text-foreground"
              >
                Delete Account
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }}
                className="text-sm text-muted-foreground"
              >
                Are you sure you want to delete{" "}
                <span className="font-semibold text-foreground">"{toDelete.username}"</span>?
                This cannot be undone.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
                className="flex gap-3 pt-1"
              >
                <Button variant="outline" className="flex-1" onClick={() => setToDelete(null)}>Cancel</Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleDelete}
                  isLoading={deleting}
                >
                  Delete
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
