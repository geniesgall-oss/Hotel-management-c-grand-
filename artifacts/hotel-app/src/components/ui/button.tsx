import * as React from "react"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  isLoading?: boolean
}

const variantStyles = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm hover:shadow-md",
  outline: "border-2 border-input bg-background hover:bg-secondary hover:text-secondary-foreground",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  ghost: "hover:bg-secondary hover:text-secondary-foreground",
  link: "text-primary underline-offset-4 hover:underline",
}

const sizeStyles = {
  default: "h-11 px-5 py-2",
  sm: "h-9 rounded-lg px-3 text-sm",
  lg: "h-14 rounded-xl px-8 text-lg",
  icon: "h-11 w-11",
}

export function buttonVariants(props?: { variant?: ButtonProps["variant"]; size?: ButtonProps["size"] }): string {
  const variant = props?.variant ?? "default"
  const size = props?.size ?? "default"
  return cn(
    "inline-flex items-center justify-center whitespace-nowrap rounded-xl font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
    variantStyles[variant],
    sizeStyles[size],
  )
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          buttonVariants({ variant, size }),
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button }
