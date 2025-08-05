import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        // Courier badge variants
        neophyte: "border-transparent bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg",
        novice: "border-transparent bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg",
        cypherpunk: "border-transparent bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/25",
        localDriver: "border-transparent bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg",
        cypherMax: "border-transparent bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/25",
        // Vehicle badges
        bike: "border-transparent bg-gradient-to-r from-green-400 to-teal-500 text-white",
        car: "border-transparent bg-gradient-to-r from-blue-400 to-indigo-500 text-white",
        van: "border-transparent bg-gradient-to-r from-purple-400 to-violet-500 text-white",
        truck: "border-transparent bg-gradient-to-r from-orange-400 to-red-500 text-white",
        // Trust level badges
        trusted: "border-transparent bg-gradient-to-r from-emerald-500 to-green-600 text-white",
        verified: "border-transparent bg-gradient-to-r from-blue-500 to-indigo-600 text-white",
        elite: "border-transparent bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/25",
      },
      size: {
        default: "h-6 px-2.5 py-0.5 text-xs",
        sm: "h-5 px-2 py-0.5 text-xs",
        lg: "h-8 px-3 py-1 text-sm",
        xl: "h-10 px-4 py-1.5 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
