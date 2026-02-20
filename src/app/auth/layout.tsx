export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-layout">
      <div className="auth-container">
        <div className="auth-logo">
          <span className="logo-icon">📚</span>
          <h1>English Learning AI</h1>
        </div>
        {children}
      </div>
    </div>
  );
}
