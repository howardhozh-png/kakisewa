export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Disable browser scroll restoration so refresh always starts at the top */}
      <script dangerouslySetInnerHTML={{ __html: "history.scrollRestoration='manual'" }} />
      {children}
    </>
  );
}
