import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { routes } from "@/lib/routes";

export default function NotFound() {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-16 md:px-8">
      <div className="mx-auto max-w-md rounded-2xl bg-card/70 p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">404</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          The page you requested does not exist or may have been moved.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={routes.home}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Go home
          </Link>
          <Link
            href={routes.apps.store}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            App store
          </Link>
        </div>
      </div>
    </div>
  );
}
