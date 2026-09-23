"use client";

import Image from "next/image";
import Link from "next/link";
import logo from "@/assets/logo.png";
import { CreditCard, LogOut, Trash2 } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { logOut } from "@/features/auth/actions";
import type { User } from "@/generated/prisma";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DeleteAccountDialog from "./DeleteAccountDialog";

interface NavbarProps {
  user: Pick<User, "firstName" | "lastName" | "email"> | null;
}

export default function Navbar({ user }: NavbarProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email
    : null;
  const initials = user
    ? (
        (user.firstName?.[0] ?? user.email[0]) + (user.lastName?.[0] ?? "")
      ).toUpperCase()
    : null;

  return (
    <header className="shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 p-3">
        <Link
          href={user ? "/resumes" : "/"}
          className="flex items-center gap-2"
        >
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
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="focus-visible:ring-ring rounded-full focus-visible:ring-2 focus-visible:outline-none">
                <div className="bg-primary text-primary-foreground flex size-[35px] items-center justify-center rounded-full text-sm font-medium">
                  {initials}
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col truncate">
                  <span className="truncate">{displayName}</span>
                  {displayName !== user.email && (
                    <span className="text-muted-foreground truncate text-xs font-normal">
                      {user.email}
                    </span>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/billing" className="flex items-center gap-2">
                    <CreditCard className="size-4" />
                    Billing
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={(e) => {
                    e.preventDefault();
                    setDeleteDialogOpen(true);
                  }}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="size-4" />
                  Delete account
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
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/sign-in" className="text-sm font-medium">
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-sm font-medium"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
      {user && (
        <DeleteAccountDialog
          open={deleteDialogOpen}
          onOpenChangeAction={setDeleteDialogOpen}
        />
      )}
    </header>
  );
}
