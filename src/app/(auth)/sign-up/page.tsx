import SignUpForm from "./SignUpForm";

interface PageProps {
  searchParams: Promise<{ from?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  const { from } = await searchParams;

  return (
    <main className="flex h-screen items-center justify-center p-3">
      <SignUpForm fromEditor={from === "editor"} />
    </main>
  );
}
