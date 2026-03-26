import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import PlanCard from '../components/pricing/PlanCard';
import PlanContactModal from '../components/pricing/PlanConfirmModal';
import { GradientButton } from '../components/ui/GradientButton';

function SkeletonCard() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-surface via-surface-2/80 to-surface border border-border/80 rounded-xl p-6 animate-pulse">
      <div className="absolute inset-0 bg-gradient-to-br from-violet/5 via-transparent to-cyan/5 opacity-20" />
      <div className="relative z-10">
        <div className="h-12 w-12 bg-surface-2 rounded-xl mb-4" />
        <div className="h-5 bg-surface-2 rounded w-20 mb-4" />
        <div className="h-8 bg-surface-2 rounded w-24 mb-2" />
        <div className="h-4 bg-surface-2 rounded w-28 mb-4" />
        <div className="h-px bg-border/50 mb-4" />
        <div className="space-y-2.5">
          <div className="h-3 bg-surface-2 rounded w-full" />
          <div className="h-3 bg-surface-2 rounded w-3/4" />
          <div className="h-3 bg-surface-2 rounded w-5/6" />
          <div className="h-3 bg-surface-2 rounded w-2/3" />
        </div>
        <div className="h-10 bg-surface-2 rounded mt-6" />
      </div>
    </div>
  );
}

export default function PricingPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [contactPlan, setContactPlan] = useState(null);

  const currentPlanSlug = user?.plan?.slug ?? null;
  const isTrialUser = user?.trial_active === true;

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get('/api/plans');
      const sorted = [...data].sort((a, b) =>
        (a.sort_order ?? a.id) - (b.sort_order ?? b.id)
      );
      setPlans(sorted);
    } catch (err) {
      setError(err.message || 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="font-sans text-2xl font-bold text-white mb-2">
          Choose Your Plan
        </h1>
        <p className="text-text-muted font-mono text-sm max-w-lg mx-auto">
          Select the plan that best fits your threat intelligence needs.
          {isTrialUser && ' Your trial is currently active.'}
        </p>
      </div>

      {/* Error state */}
      {error && !loading && (
        <div className="text-center py-12">
          <p className="text-red font-mono text-sm mb-4">{error}</p>
          <GradientButton onClick={fetchPlans} size="sm">
            Retry
          </GradientButton>
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Plan cards */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              currentPlanSlug={currentPlanSlug}
              onContact={setContactPlan}
            />
          ))}
        </div>
      )}

      {/* Pending plan change notice */}
      {user?.pending_plan && (
        <div className="max-w-2xl mx-auto p-3 rounded-lg bg-amber/10 border border-amber/30 text-amber text-sm font-mono text-center">
          Plan change to <span className="font-semibold">{user.pending_plan.name}</span> scheduled
          {user.plan_change_at && ` for ${new Date(user.plan_change_at).toLocaleDateString()}`}
        </div>
      )}

      {/* Contact modal */}
      <PlanContactModal
        isOpen={contactPlan !== null}
        onClose={() => setContactPlan(null)}
        planName={contactPlan?.name ?? ''}
      />
    </div>
  );
}
