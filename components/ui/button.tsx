"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-btn)] text-[15px] font-semibold transition-all active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
  {
    variants: {
      variant: {
        primary: "bg-[var(--color-text-primary)] text-[var(--color-bg)] hover:opacity-90",
        accent: "text-black hover:opacity-90",
        secondary: "bg-[var(--color-card-raised)] text-[var(--color-text-primary)] border border-[var(--color-border-strong)] hover:bg-white/5",
        ghost: "text-[var(--color-text-primary)] hover:bg-white/5",
        danger: "bg-[var(--color-danger)]/15 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/25",
        link: "text-[var(--color-text-secondary)] underline-offset-4 hover:underline min-h-0",
      },
      size: {
        default: "px-5 py-2.5",
        sm: "px-3.5 py-2 text-[13px] min-h-9",
        lg: "px-6 py-3.5 text-base",
        icon: "h-11 w-11 shrink-0",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** accent variant için CSS değişken adı, örn "--color-su" */
  accentVar?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, accentVar, style, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        style={
          variant === "accent"
            ? { backgroundColor: `var(${accentVar ?? "--color-hareket"})`, ...style }
            : style
        }
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
