import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, X, CheckCircle } from 'lucide-react';
import { GradientButton } from '../ui/GradientButton';

export default function PlanContactModal({ isOpen, onClose, planName }) {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  useEffect(() => {
    if (!isOpen) {
      setForm({ name: '', email: '', message: '' });
      setSent(false);
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    // TODO: wire to backend endpoint when ready
    await new Promise((r) => setTimeout(r, 1000));
    setSending(false);
    setSent(true);
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            className="bg-surface border border-border rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-sans text-xl font-bold text-white">
                {sent ? 'Message Sent' : `Get ${planName}`}
              </h2>
              <button
                onClick={onClose}
                className="p-1 text-text-muted hover:text-white transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {sent ? (
              <div className="text-center py-6">
                <CheckCircle className="w-12 h-12 text-green mx-auto mb-3" />
                <p className="text-white font-sans font-semibold mb-1">
                  Thank you!
                </p>
                <p className="text-text-muted font-mono text-sm">
                  We'll get back to you shortly.
                </p>
                <GradientButton onClick={onClose} size="sm" className="mt-4">
                  Close
                </GradientButton>
              </div>
            ) : (
              <>
                <p className="text-text-muted font-mono text-sm mb-4">
                  Interested in the <span className="text-violet font-semibold">{planName}</span> plan? Leave your details and we'll reach out.
                </p>

                <form onSubmit={handleSubmit} className="space-y-3">
                  <div>
                    <label className="block text-sm text-text-secondary font-mono mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-white font-mono text-sm placeholder:text-text-muted focus:outline-none focus:border-violet transition-colors"
                      placeholder="Your name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-text-secondary font-mono mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                      className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-white font-mono text-sm placeholder:text-text-muted focus:outline-none focus:border-violet transition-colors"
                      placeholder="you@company.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-text-secondary font-mono mb-1">
                      Message <span className="text-text-muted">(optional)</span>
                    </label>
                    <textarea
                      name="message"
                      value={form.message}
                      onChange={handleChange}
                      rows={3}
                      className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-white font-mono text-sm placeholder:text-text-muted focus:outline-none focus:border-violet transition-colors resize-none"
                      placeholder="Tell us about your needs..."
                    />
                  </div>

                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 text-text-muted hover:text-white font-sans font-semibold py-2.5 px-4 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <GradientButton
                      type="submit"
                      disabled={sending}
                      size="sm"
                      className="flex-1"
                    >
                      {sending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Send
                        </>
                      )}
                    </GradientButton>
                  </div>
                </form>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
