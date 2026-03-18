import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { GradientButton } from "../components/ui/GradientButton";
import { BackgroundPaths } from "../components/ui/BackgroundPaths";
import { LandingScroll } from "../components/landing/LandingScroll";
import { useAuth } from "../contexts/AuthContext";

export default function LandingPage() {
  const { isAuthenticated, userInitials } = useAuth();

  return (
    <div className="relative min-h-screen flex flex-col">
      <BackgroundPaths />

      {/* Navbar */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-12 h-16 bg-primary border-b border-border backdrop-blur-sm">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Aqua Tip" className="w-[22px] h-[22px]" />
            <span className="font-display text-lg font-bold text-text-primary tracking-tight">
              AQUA TIP
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <Link to="/threat-search">
              <GradientButton size="sm">
                Threat Lookup <ArrowRight className="w-3.5 h-3.5" />
              </GradientButton>
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="font-display text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                Log In
              </Link>
              <Link to="/register">
                <GradientButton size="sm">
                  Sign Up <ArrowRight className="w-3.5 h-3.5" />
                </GradientButton>
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Scroll-Driven Hero + Feature Sections */}
      <LandingScroll />

      {/* Bottom CTA */}
      <section className="relative py-20 px-6 overflow-hidden bg-surface border-t border-b border-border">
        <div className="absolute inset-0 section-glow" />
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(122,68,228,0.4), transparent)",
          }}
        />
        <div className="relative z-10 text-center max-w-2xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-text-primary mb-4">
            Ready to Secure Your Infrastructure?
          </h2>
          <p className="font-mono text-[15px] text-text-secondary mb-8">
            Start with 1 free search per day. No credit card required.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link to="/threat-search">
              <GradientButton size="lg">
                Threat Lookup <ArrowRight className="w-4 h-4" />
              </GradientButton>
            </Link>
            <Link to="/threat-search">
              <GradientButton variant="variant" size="lg">
                View Pricing
              </GradientButton>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="relative z-30 py-12 px-12 border-t border-border"
        style={{ backgroundColor: "#0A0B10" }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start justify-between mb-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <img src="/logo.png" alt="Aqua Tip" className="w-5 h-5" />
                <span className="font-display text-lg font-bold text-text-primary tracking-tight">
                  AQUA TIP
                </span>
              </div>
              <p className="font-mono text-xs text-text-secondary max-w-xs leading-relaxed">
                Real-time IP reputation intelligence powered by global threat
                feeds. Identify and respond to threats before they strike.
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 pt-1">
              <Link
                to="/contact"
                className="font-display text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                Contact Us
              </Link>
              <Link
                to="/threat-search"
                className="font-display text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                Pricing Plan
              </Link>
            </div>
          </div>
          <div className="flex items-center justify-between pt-6 border-t border-border">
            <span className="font-mono text-xs text-text-muted">
              &copy; 2026 AQUA TIP. All rights reserved.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
