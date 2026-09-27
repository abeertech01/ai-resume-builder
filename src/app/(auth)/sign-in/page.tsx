import SignInForm from "./SignInForm";

interface PageProps {
  searchParams: Promise<{ redirect?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  // Set by middleware.ts when it sends a logged-out visitor here from a
  // protected page, so they land back where they meant to go after logging
  // in instead of always on /resumes.
  const { redirect } = await searchParams;

  return (
    <main className="flex h-screen items-center justify-center p-3">
      <SignInForm redirectTo={redirect} />
    </main>
  );
}
