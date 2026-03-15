import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Zap,
  Shield,
  Globe as GlobeIcon,
  Search,
  BarChart3,
} from "lucide-react";
import { Globe } from "../ui/Globe";
import { GradientButton } from "../ui/GradientButton";

const section2Cards = [
  {
    icon: Search,
    title: "Real-Time IP Lookup",
    description:
      "Query any IP address against global threat intelligence feeds for instant reputation scoring.",
  },
  {
    icon: Shield,
    title: "Threat Classification",
    description:
      "Categorize threats by type — malware, botnet, scanner, brute-force — with confidence levels.",
  },
  {
    icon: BarChart3,
    title: "Risk Scoring",
    description:
      "Get a unified risk score aggregated from multiple intelligence sources and enrichment data.",
  },
];


function FeatureCard({ icon: Icon, title, description }) {
  return (
    <div className="flex gap-4 p-5 rounded-xl bg-surface/60 border border-border backdrop-blur-sm">
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-violet/15 flex items-center justify-center">
        <Icon className="w-5 h-5 text-violet-light" />
      </div>
      <div>
        <h3 className="font-display text-[15px] font-semibold text-text-primary mb-1">
          {title}
        </h3>
        <p className="font-mono text-xs text-text-secondary leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}

export function LandingScroll() {
  const containerRef = useRef(null);

  const { scrollYProgress: rawProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const scrollYProgress = useSpring(rawProgress, {
    stiffness: 80,
    damping: 20,
    restDelta: 0.001,
  });

  // Globe transforms (2 sections only)
  const globeX = useTransform(
    scrollYProgress,
    [0, 0.5, 1.0],
    ["0%", "0%", "50%"]
  );
  const globeY = useTransform(
    scrollYProgress,
    [0, 0.5, 1.0],
    ["5vh", "5vh", "5vh"]
  );
  const globeScale = useTransform(
    scrollYProgress,
    [0, 0.5, 1.0],
    [1.1, 1.1, 0.8]
  );
  const globeOpacity = useTransform(
    scrollYProgress,
    [0, 0.25, 0.5],
    [0.3, 0.5, 1]
  );

  // Section 2 cards: fade in as globe moves right (0.5 → 0.75)
  const sec2Opacity = useTransform(scrollYProgress, [0.5, 0.75], [0, 1]);
  const sec2Y = useTransform(scrollYProgress, [0.5, 0.75], [60, 0]);

  return (
    <>
      {/* Desktop: scroll-driven layout */}
      <div
        ref={containerRef}
        className="relative hidden lg:block"
        style={{ height: "200vh" }}
      >
        <div className="sticky top-0 h-screen z-10 pointer-events-none">
          <motion.div
            className="absolute top-1/2 left-1/2 z-10 pointer-events-auto"
            style={{
              x: globeX,
              y: globeY,
              scale: globeScale,
              opacity: globeOpacity,
              translateX: "-50%",
              translateY: "-50%",
              willChange: "transform, opacity",
            }}
          >
            <div className="relative w-[700px] h-[700px]">
              <Globe className="w-full h-full" width={700} height={700} />
              <div
                className="absolute inset-0 -z-10 blur-3xl rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, rgba(122,68,228,0.25) 0%, rgba(155,107,247,0.08) 50%, transparent 70%)",
                  transform: "scale(1.3)",
                }}
              />
            </div>
          </motion.div>
        </div>

        <div style={{ marginTop: "-100vh" }}>
          {/* Section 1: Hero */}
          <section className="h-screen flex flex-col items-center justify-center relative z-20">
            <div className="flex flex-col items-center gap-6 px-6 -mt-16">
              <div className="px-4 py-1.5 rounded-full bg-violet/10 border border-violet/30 flex items-center gap-1.5 backdrop-blur-sm">
                <Zap className="w-3 h-3 text-violet-light" />
                <span className="text-[11px] font-mono font-medium text-violet-light">
                  Real-Time Threat Intelligence
                </span>
              </div>
              <h1 className="font-display text-[56px] font-extrabold text-text-primary text-center leading-[1.08] tracking-tight max-w-[750px]">
                Know Your Threats Before They Strike
              </h1>
              <p className="text-[15px] font-mono text-text-secondary text-center max-w-[600px] leading-relaxed">
                Real-time IP reputation intelligence powered by global threat
                feeds. Identify malicious actors before they compromise your
                infrastructure.
              </p>
              <div className="flex items-center gap-4 mt-2">
                <Link to="/ip-search">
                  <GradientButton size="lg">
                    Threat Lookup <ArrowRight className="w-4 h-4" />
                  </GradientButton>
                </Link>
                <Link to="/ip-search">
                  <GradientButton variant="variant" size="lg">
                    View Pricing
                  </GradientButton>
                </Link>
              </div>
            </div>
          </section>

          {/* Section 2: Cards left, globe right */}
          <section className="h-screen flex items-center relative z-20">
            <motion.div
              className="w-1/2 px-16 space-y-5"
              style={{ opacity: sec2Opacity, y: sec2Y }}
            >
              <div className="flex items-center gap-2 mb-6">
                <GlobeIcon className="w-5 h-5 text-violet-light" />
                <span className="font-display text-sm font-semibold text-violet-light uppercase tracking-wider">
                  Intelligence
                </span>
              </div>
              <h2 className="font-display text-3xl font-bold text-text-primary mb-8">
                Global Threat Coverage
              </h2>
              {section2Cards.map((card) => (
                <FeatureCard key={card.title} {...card} />
              ))}
            </motion.div>
          </section>

        </div>
      </div>

      {/* Mobile: stacked layout */}
      <div className="lg:hidden">
        <section className="min-h-[80vh] flex flex-col items-center justify-center px-6 py-16">
          <div className="flex flex-col items-center gap-6 animate-fade-in-up">
            <div className="px-4 py-1.5 rounded-full bg-violet/10 border border-violet/30 flex items-center gap-1.5 backdrop-blur-sm">
              <Zap className="w-3 h-3 text-violet-light" />
              <span className="text-[11px] font-mono font-medium text-violet-light">
                Real-Time Threat Intelligence
              </span>
            </div>
            <h1 className="font-display text-4xl font-extrabold text-text-primary text-center leading-[1.1] tracking-tight">
              Know Your Threats Before They Strike
            </h1>
            <p className="text-sm font-mono text-text-secondary text-center max-w-md leading-relaxed">
              Real-time IP reputation intelligence powered by global threat
              feeds.
            </p>
            <div className="flex items-center gap-3 mt-2">
              <Link to="/ip-search">
                <GradientButton size="lg">
                  Get Started <ArrowRight className="w-4 h-4" />
                </GradientButton>
              </Link>
              <Link to="/ip-search">
                <GradientButton variant="variant" size="lg">
                  View Pricing
                </GradientButton>
              </Link>
            </div>
          </div>
          <div className="w-64 h-64 mt-10">
            <Globe className="w-full h-full" width={256} height={256} />
          </div>
        </section>

        <section className="px-6 py-16">
          <div className="flex items-center gap-2 mb-4">
            <GlobeIcon className="w-5 h-5 text-violet-light" />
            <span className="font-display text-sm font-semibold text-violet-light uppercase tracking-wider">
              Intelligence
            </span>
          </div>
          <h2 className="font-display text-2xl font-bold text-text-primary mb-6">
            Global Threat Coverage
          </h2>
          <div className="space-y-4">
            {section2Cards.map((card) => (
              <FeatureCard key={card.title} {...card} />
            ))}
          </div>
        </section>

      </div>
    </>
  );
}
