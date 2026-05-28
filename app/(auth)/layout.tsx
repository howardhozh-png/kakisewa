export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100dvh", background: "#030303", colorScheme: "dark" }}>
      {children}
    </div>
  );
}
