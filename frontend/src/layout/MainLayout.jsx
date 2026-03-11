export default function MainLayout({ children }) {
  return (
    <div style={{
      width: "100%",
      minHeight: "100vh",
      padding: "20px",
      boxSizing: "border-box"
    }}>
      {children}
    </div>
  );
}