import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Loader2 } from 'lucide-react';

export default function PlanConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  selectedPlan,
  currentPlan,
  isLoading,
  isTrialUser,
}) {
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

  const currentCredits = currentPlan?.daily_credit_limit || (isTrialUser ? 10 : 3);
  const currentPrice = currentPlan?.price_cents ? currentPlan.price_cents / 100 : 0;
  const newPrice = selectedPlan?.price_cents ? selectedPlan.price_cents / 100 : 0;

  const isDowngrade = selectedPlan && currentPlan &&
    selectedPlan.daily_credit_limit < currentPlan.daily_credit_limit;

  return (
    <AnimatePresence>
      {isOpen && selectedPlan && (
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
            <h2 className="font-display text-xl font-bold text-white mb-4">
              Switch to {selectedPlan.name}?
            </h2>

            {/* Comparison section */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-2 border border-border">
                <span className="text-sm text-text-muted font-mono">Daily Limit</span>
                <div className="flex items-center gap-2 font-mono text-sm">
                  <span className="text-text-secondary">{currentCredits}</span>
                  <ArrowRight className="w-3 h-3 text-violet" />
                  <span className="text-white font-semibold">{selectedPlan.daily_credit_limit}</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-2 border border-border">
                <span className="text-sm text-text-muted font-mono">Price</span>
                <div className="flex items-center gap-2 font-mono text-sm">
                  <span className="text-text-secondary">${currentPrice}/mo</span>
                  <ArrowRight className="w-3 h-3 text-violet" />
                  <span className="text-white font-semibold">${newPrice}/mo</span>
                </div>
              </div>
            </div>

            {/* Downgrade warning */}
            {isDowngrade && (
              <p className="text-sm text-amber font-mono mb-4">
                Downgrade will take effect at end of billing period
              </p>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 text-text-muted hover:text-white font-display font-semibold py-2.5 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-violet to-cyan text-white font-display font-semibold py-2.5 px-4 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Confirming...
                  </>
                ) : (
                  'Confirm'
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
