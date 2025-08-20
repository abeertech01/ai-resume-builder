import Image from "next/image";
import logo from "@/assets/logo.png";
import resumePreview from "@/assets/resume-preview.jpg";
import GetStartedBtn from "./components/GetStartedBtn";

export default async function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-100 px-5 py-12 text-center text-gray-900 md:flex-row md:text-start lg:gap-12">
      <div className="max-w-prose space-y-3">
        <Image
          src={logo}
          alt="logo"
          width={150}
          height={150}
          className="mx-auto md:ms-0"
        />
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
          Create a{" "}
          <span className="inline-block bg-gradient-to-r from-sky-600 to-sky-400 bg-clip-text text-transparent">
            Perfect Resume
          </span>{" "}
          in Minutes
        </h1>
        <p className="text-lg text-gray-500">
          Our <span className="text-lg text-gray-500">AI resume builder</span>{" "}
          helps you design a professional resume, even if you&apos;re not very
          smart.
        </p>
        <GetStartedBtn />
      </div>
      <div>
        <Image
          src={resumePreview}
          alt="Resume Preview"
          width={600}
          className="shadow-md lg:rotate-[2deg]"
        />
      </div>
    </main>
  );
}
