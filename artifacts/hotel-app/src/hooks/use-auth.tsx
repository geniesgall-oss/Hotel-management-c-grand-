import React, { createContext, useContext, useState, useEffect } from "react"
import { useGetMe, useLogin, useLogout, getGetMeQueryKey } from "@workspace/api-client-react"
import type { LoginRequest, User } from "@workspace/api-client-react"
import { useLocation } from "wouter"
import { toast } from "sonner"

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (data: LoginRequest) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [_, setLocation] = useLocation()
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("hotel_token"))
  
  const { data: user, isLoading: isUserLoading, refetch, isError } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      enabled: !!token,
      retry: false,
    }
  })

  useEffect(() => {
    if (isError) {
      localStorage.removeItem("hotel_token")
      setToken(null)
      setLocation("/login")
    }
  }, [isError, setLocation])

  const loginMutation = useLogin()
  const logoutMutation = useLogout()

  const login = async (data: LoginRequest) => {
    try {
      const response = await loginMutation.mutateAsync({ data })
      localStorage.setItem("hotel_token", response.token)
      setToken(response.token)
      await refetch()
      toast.success("Welcome back!")
      setLocation("/")
    } catch (error: any) {
      toast.error(error.message || "Failed to login")
      throw error
    }
  }

  const logout = async () => {
    try {
      if (token) {
        await logoutMutation.mutateAsync()
      }
    } catch (e) {
      // ignore
    } finally {
      localStorage.removeItem("hotel_token")
      setToken(null)
      setLocation("/login")
      toast.success("Logged out successfully")
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading: isUserLoading && !!token,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
