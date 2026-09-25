import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Page() {
  return (
    <main className="mx-auto max-w-7xl space-y-6 px-3 py-6 text-center">
      <h1 className="font-heading text-3xl font-bold">Billing Success</h1>
      <p>
        The checkout was successful and your Pro account has been activated.
        Enjoy!
      </p>
      <Button asChild variant="premium">
        <Link href="/resumes">Go to resumes</Link>
      </Button>
    </main>
  );
}
