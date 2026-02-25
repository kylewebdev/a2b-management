import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="text-center">
        <p className="text-6xl font-bold text-accent">404</p>
        <h1 className="mt-4 text-xl font-bold">Page not found</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Whatever you&apos;re looking for, it&apos;s not here.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-bg transition-colors hover:bg-accent/90"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
