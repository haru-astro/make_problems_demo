"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";

import { cn, colorIndex, initials } from "@/lib/utils";

const AVATAR_COLORS = [
  "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  "bg-teal-500/15 text-teal-700 dark:text-teal-300",
];

const Avatar = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex size-7 shrink-0 overflow-hidden rounded-full",
      className,
    )}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

/** 名前からイニシャルと色を決めるアバター */
function UserAvatar({
  name,
  className,
  title,
}: {
  name: string;
  className?: string;
  title?: string;
}) {
  const color = AVATAR_COLORS[colorIndex(name, AVATAR_COLORS.length)];
  return (
    <Avatar className={className} title={title ?? name}>
      <AvatarPrimitive.Fallback
        className={cn(
          "flex size-full items-center justify-center text-[11px] font-semibold",
          color,
        )}
      >
        {initials(name)}
      </AvatarPrimitive.Fallback>
    </Avatar>
  );
}

export { Avatar, UserAvatar };
