"use client";

import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export function Switch({
  className,
  accentVar = "--color-hareket",
  style,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & { accentVar?: string }) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors outline-none data-[state=unchecked]:bg-white/10 data-[state=checked]:bg-[var(--switch-accent)]",
        className,
      )}
      style={{ ["--switch-accent" as string]: `var(${accentVar})`, ...style }}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block h-6 w-6 translate-x-0.5 rounded-full bg-white shadow-lg transition-transform data-[state=checked]:translate-x-[22px]" />
    </SwitchPrimitive.Root>
  );
}
