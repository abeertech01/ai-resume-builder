"use client";

import Image from "next/image";
import Link from "next/link";
import logo from "@/assets/logo.png";
import { CreditCard, LogOut } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { logOut } from "@/features/auth/actions";
import type { User } from "@/generated/prisma";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavbarProps {
  user: Pick<User, "firstName" | "lastName" | "email">;
}

export default function Navbar({ user }: NavbarProps) {
  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
  const initials = (
    (user.firstName?.[0] ?? user.email[0]) + (user.lastName?.[0] ?? "")
  ).toUpperCase();

  return (
    <header className="shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 p-3">
        <Link href={"/resumes"} className="flex items-center gap-2">
          <Image
            src={logo}
            alt="logo"
            width={35}
            height={35}
            className="rounded-full"
          />
          <span className="text-xl font-bold tracking-tight">
            AI Resume Builder
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger className="focus-visible:ring-ring rounded-full focus-visible:ring-2 focus-visible:outline-none">
              <div className="bg-primary text-primary-foreground flex size-[35px] items-center justify-center rounded-full text-sm font-medium">
                {initials}
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="truncate">
                {displayName}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/billing" className="flex items-center gap-2">
                  <CreditCard className="size-4" />
                  Billing
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => logOut()}
                className="flex items-center gap-2"
              >
                <LogOut className="size-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
