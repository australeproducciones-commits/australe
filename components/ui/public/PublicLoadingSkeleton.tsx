import { cn } from "@/lib/utils/cn";

export type PublicLoadingVariant =
  | "default"
  | "events"
  | "store"
  | "community"
  | "media";

type PublicLoadingSkeletonProps = {
  variant?: PublicLoadingVariant;
  className?: string;
};

function SkeletonBar({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn("public-skeleton-bar rounded-xl", className)}
      aria-hidden
    />
  );
}

function DefaultSkeleton() {
  return (
    <>
      <SkeletonBar className="h-4 w-28" />
      <SkeletonBar className="mt-3 h-9 max-w-md w-full" />
      <SkeletonBar className="mt-2 h-4 max-w-xs w-full" />
      <SkeletonBar className="mt-8 aspect-[12/5] w-full max-h-72 rounded-2xl" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SkeletonBar className="h-44 rounded-2xl" />
        <SkeletonBar className="h-44 rounded-2xl" />
        <SkeletonBar className="hidden h-44 rounded-2xl sm:block" />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <SkeletonBar className="h-24 rounded-2xl" />
        <SkeletonBar className="h-24 rounded-2xl" />
      </div>
    </>
  );
}

function EventsSkeleton() {
  return (
    <>
      <SkeletonBar className="h-4 w-24" />
      <SkeletonBar className="mt-3 h-9 w-56 max-w-full" />
      <SkeletonBar className="mt-2 h-4 w-72 max-w-full" />
      <div className="mt-8 flex flex-wrap gap-2">
        <SkeletonBar className="h-9 w-24 rounded-full" />
        <SkeletonBar className="h-9 w-28 rounded-full" />
        <SkeletonBar className="h-9 w-20 rounded-full" />
      </div>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <SkeletonBar className="h-52 rounded-2xl" />
        <SkeletonBar className="h-52 rounded-2xl" />
        <SkeletonBar className="h-52 rounded-2xl" />
      </div>
    </>
  );
}

function StoreSkeleton() {
  return (
    <>
      <SkeletonBar className="h-4 w-28" />
      <SkeletonBar className="mt-3 h-9 w-64 max-w-full" />
      <div className="mt-8 flex flex-wrap gap-2">
        <SkeletonBar className="h-9 w-20 rounded-full" />
        <SkeletonBar className="h-9 w-24 rounded-full" />
        <SkeletonBar className="h-9 w-28 rounded-full" />
        <SkeletonBar className="h-9 w-24 rounded-full" />
      </div>
      <div className="mt-8 grid gap-4 grid-cols-2 lg:grid-cols-4">
        <SkeletonBar className="aspect-[4/5] rounded-2xl" />
        <SkeletonBar className="aspect-[4/5] rounded-2xl" />
        <SkeletonBar className="aspect-[4/5] rounded-2xl" />
        <SkeletonBar className="aspect-[4/5] rounded-2xl" />
      </div>
    </>
  );
}

function CommunitySkeleton() {
  return (
    <>
      <SkeletonBar className="h-4 w-28" />
      <SkeletonBar className="mt-3 h-9 w-48 max-w-full" />
      <SkeletonBar className="mt-8 h-36 w-full rounded-2xl" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <SkeletonBar className="h-28 rounded-2xl" />
        <SkeletonBar className="h-28 rounded-2xl" />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <SkeletonBar className="h-24 rounded-2xl" />
        <SkeletonBar className="h-24 rounded-2xl" />
        <SkeletonBar className="h-24 rounded-2xl" />
      </div>
    </>
  );
}

function MediaSkeleton() {
  return (
    <>
      <SkeletonBar className="h-4 w-24" />
      <SkeletonBar className="mt-3 h-9 w-56 max-w-full" />
      <SkeletonBar className="mt-8 aspect-video w-full rounded-2xl" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SkeletonBar className="h-40 rounded-2xl" />
        <SkeletonBar className="h-40 rounded-2xl" />
        <SkeletonBar className="h-40 rounded-2xl" />
      </div>
    </>
  );
}

const variantContent: Record<PublicLoadingVariant, () => React.ReactNode> = {
  default: DefaultSkeleton,
  events: EventsSkeleton,
  store: StoreSkeleton,
  community: CommunitySkeleton,
  media: MediaSkeleton,
};

export function PublicLoadingSkeleton({
  variant = "default",
  className,
}: PublicLoadingSkeletonProps) {
  const Content = variantContent[variant];

  return (
    <div
      className={cn("public-loading-shell", className)}
      aria-busy="true"
      aria-live="polite"
      aria-label="Cargando contenido"
    >
      <div className="public-page-shell mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-16">
        <Content />
      </div>
    </div>
  );
}
