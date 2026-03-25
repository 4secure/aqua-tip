import { Link } from 'react-router-dom';
import ParticleBackground from '../components/ui/ParticleBackground';

export default function EulaPage() {
  return (
    <div
      className="min-h-screen bg-primary flex items-center justify-center px-4 relative"
      style={{
        background:
          'radial-gradient(ellipse at 30% 20%, rgba(122, 68, 228, 0.12) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(90, 45, 184, 0.08) 0%, transparent 50%), #0A0B10',
      }}
    >
      <ParticleBackground />
      <div className="w-full max-w-lg relative z-10">
        <div className="bg-surface border border-border rounded-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-4">
              <img src="/logo.png" alt="Aqua Tip" className="w-6 h-6" />
              <span className="font-sans text-xl font-bold text-text-primary tracking-tight">
                AQUA TIP
              </span>
            </Link>
            <h1 className="font-sans text-2xl font-bold text-text-primary">
              End User License Agreement
            </h1>
          </div>

          {/* Placeholder content */}
          <div className="text-text-secondary font-mono text-sm leading-relaxed space-y-4">
            <p>
              This End User License Agreement will be available soon. Please check back later.
            </p>
            <p className="text-text-muted text-xs">
              By using AQUA TIP, you agree to comply with all applicable laws and regulations
              regarding the use of threat intelligence data.
            </p>
          </div>

          {/* Back link */}
          <div className="mt-8 text-center">
            <Link
              to="/register"
              className="text-sm text-violet-light hover:text-violet transition-colors font-mono"
            >
              Back to Register
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
