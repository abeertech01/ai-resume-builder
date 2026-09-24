import Image from "next/image";
import logo from "@/assets/logo.png";
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
    <main className="dark:bg-background dark:text-foreground relative flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-100 px-5 py-12 text-center text-gray-900 md:flex-row md:text-start lg:gap-12">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="max-w-prose space-y-3">
        <Image
          src={logo}
          alt="logo"
          width={150}
          height={150}
          className="mx-auto md:ms-0"
        />
        <h1 className="font-heading scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
          Create a{" "}
          <span className="inline-block bg-gradient-to-r from-sky-600 to-sky-400 bg-clip-text text-transparent">
            Perfect Resume
          </span>{" "}
          in Minutes
        </h1>
        <p className="text-lg text-gray-500 dark:text-gray-400">
          Our{" "}
          <span className="text-lg text-gray-500 dark:text-gray-400">
            AI resume builder
          </span>{" "}
          helps you design a professional resume, even if you&apos;re not very
          smart.
        </p>
        <GetStartedBtn />
      </div>
      <HeroMotif />
    </main>
  );
}
