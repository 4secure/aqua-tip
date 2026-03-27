import { useState } from 'react';
import { Link } from 'react-router-dom';
import ParticleBackground from '../components/ui/ParticleBackground';
import { GradientButton } from '../components/ui/GradientButton';

export default function ContactUsPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

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
              Contact Us
            </h1>
          </div>

          {submitted ? (
            <div className="text-center space-y-4">
              <p className="font-mono text-sm text-green leading-relaxed">
                Thank you for reaching out! We'll get back to you soon.
              </p>
              <Link
                to="/"
                className="text-sm text-violet-light hover:text-violet transition-colors font-mono"
              >
                Back to Home
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block font-mono text-xs text-text-secondary mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  value={form.name}
                  onChange={handleChange}
                  className="input-field w-full"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block font-mono text-xs text-text-secondary mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  className="input-field w-full"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block font-mono text-xs text-text-secondary mb-1.5">
                  Message
                </label>
                <textarea
                  name="message"
                  required
                  rows={5}
                  value={form.message}
                  onChange={handleChange}
                  className="input-field w-full resize-none"
                  placeholder="How can we help?"
                />
              </div>
              <GradientButton type="submit" className="w-full">
                Send Message
              </GradientButton>
            </form>
          )}

          {/* Back link */}
          {!submitted && (
            <div className="mt-6 text-center">
              <Link
                to="/"
                className="text-sm text-violet-light hover:text-violet transition-colors font-mono"
              >
                Back to Home
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
