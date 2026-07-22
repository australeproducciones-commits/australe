"use client";

export default function PublicTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="public-page-enter flex min-h-0 flex-1 flex-col">{children}</div>;
}
