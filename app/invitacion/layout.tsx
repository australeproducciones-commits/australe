export default function InvitationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="public-theme flex min-h-screen flex-col items-center justify-center px-4 py-10 sm:px-6 sm:py-16"
      style={{ backgroundColor: "var(--public-bg)" }}
    >
      {children}
    </div>
  );
}
