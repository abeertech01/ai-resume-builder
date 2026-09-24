import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import GetStartedBtn from "./components/GetStartedBtn";
import HeroMotif from "./components/HeroMotif";
import ThemeToggle from "@/components/ThemeToggle";
import { getCurrentSession } from "@/features/auth/session";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getCurrentSession();

  if (session) {
    redirect("/resumes");
  }

  return (
    <main className="dark:bg-background dark:text-foreground flex min-h-screen flex-col items-center bg-gray-100 px-5 text-gray-900">
      {/* The header and the hero share this container, so the brand lines up
          with the headline's left edge and the auth buttons with the motif's
          right edge. */}
      <div className="flex max-w-full grow flex-col">
        <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-4">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <Image
              src={logo}
              alt=""
              width={35}
              height={35}
              className="rounded-full"
            />
            <span className="font-heading text-xl font-bold tracking-tight">
              AI Resume Builder
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            <Button asChild variant="outline">
              <Link href="/sign-in">Log in</Link>
            </Button>
            <Button asChild variant="premium">
              <Link href="/sign-up">Sign up</Link>
            </Button>
          </div>
        </header>
        <div className="flex grow flex-col items-center justify-center gap-6 pb-10 text-center md:flex-row md:text-start lg:gap-12">
          <div className="max-w-prose space-y-3">
            <p className="mx-auto flex w-fit items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-sm font-medium text-blue-600 md:mx-0 dark:text-blue-400">
              ✨ AI-powered resume builder
            </p>
            <h1 className="font-heading scroll-m-20 text-4xl leading-[1.05] font-extrabold tracking-tight lg:text-5xl">
              Turn your experience into a resume that{" "}
              <span className="inline-block bg-gradient-to-r from-sky-600 to-sky-400 bg-clip-text text-transparent">
                gets interviews
              </span>
            </h1>
            <p className="mx-auto max-w-xl text-lg text-gray-500 md:mx-0 dark:text-gray-400">
              Tell us about your experience in plain words. Our AI turns it into
              polished, ATS-friendly bullet points and a professional resume you
              can download as a PDF.
            </p>
            <GetStartedBtn />
            <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-sm text-gray-500 md:justify-start dark:text-gray-400">
              {["Free to start", "No credit card", "Export to PDF"].map(
                (point) => (
                  <li key={point} className="flex items-center gap-1.5">
                    <Check
                      className="size-4 text-blue-600 dark:text-blue-400"
                      strokeWidth={2.5}
                    />
                    {point}
                  </li>
                ),
              )}
            </ul>
          </div>
          <HeroMotif />
        </div>
      </div>
    </main>
  );
}
