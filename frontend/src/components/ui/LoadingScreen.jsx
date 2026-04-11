export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 bg-primary flex items-center justify-center">
      <div className="relative flex items-center justify-center">
        <div className="loading-pulse-ring" />
        <img src="/logo.png" alt="Aqua TIP" className="w-16 h-16 relative z-10" />
      </div>
    </div>
  );
}
