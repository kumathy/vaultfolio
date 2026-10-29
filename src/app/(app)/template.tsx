// Remounts on every navigation, unlike a layout.
export default function AppTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="animate-page-in motion-reduce:animate-none">{children}</div>
  );
}
