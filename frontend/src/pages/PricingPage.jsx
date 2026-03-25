import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import PlanCard from '../components/pricing/PlanCard';
import PlanConfirmModal from '../components/pricing/PlanConfirmModal';

function SkeletonCard() {
  return (
    <div className="bg-surface/60 border border-border backdrop-blur-sm rounded-xl p-6 animate-pulse">
      <div className="h-5 bg-surface-2 rounded w-20 mb-4" />
      <div className="h-8 bg-surface-2 rounded w-24 mb-2" />
      <div className="h-4 bg-surface-2 rounded w-28 mb-6" />
      <div className="space-y-2">
        <div className="h-3 bg-surface-2 rounded w-full" />
        <div className="h-3 bg-surface-2 rounded w-3/4" />
        <div className="h-3 bg-surface-2 rounded w-5/6" />
        <div className="h-3 bg-surface-2 rounded w-2/3" />
      </div>
      <div className="h-10 bg-surface-2 rounded mt-6" />
    </div>
  );
}

export default function PricingPage() {
  const { user, isAuthenticated, refreshUser } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  const currentPlanSlug = user?.plan?.slug ?? null;
  const isTrialUser = user?.trial_active === true;
  const currentPlan = user?.plan ?? null;

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

  const handleSelectPlan = useCallback((plan) => {
    setSuccessMessage(null);
    setSelectedPlan(plan);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!selectedPlan) return;
    setConfirmLoading(true);
    try {
      await apiClient.post('/api/plan', { plan: selectedPlan.slug });
      await refreshUser();
      await fetchPlans();
      setSelectedPlan(null);
      setSuccessMessage(`Successfully switched to ${selectedPlan.name} plan`);
    } catch (err) {
      setError(err.message || 'Failed to change plan');
      setSelectedPlan(null);
    } finally {
      setConfirmLoading(false);
    }
  }, [selectedPlan, refreshUser, fetchPlans]);

  const handleCloseModal = useCallback(() => {
    if (!confirmLoading) {
      setSelectedPlan(null);
    }
  }, [confirmLoading]);

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

      {/* Success message */}
      {successMessage && (
        <div className="max-w-2xl mx-auto p-3 rounded-lg bg-green/10 border border-green/30 text-green text-sm font-mono text-center">
          {successMessage}
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="text-center py-12">
          <p className="text-red font-mono text-sm mb-4">{error}</p>
          <button
            onClick={fetchPlans}
            className="bg-gradient-to-r from-violet to-cyan text-white font-sans font-semibold py-2 px-6 rounded-lg hover:opacity-90 transition-opacity"
          >
            Retry
          </button>
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
              onSelect={handleSelectPlan}
              isTrialUser={isTrialUser}
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

      {/* Confirmation modal */}
      <PlanConfirmModal
        isOpen={selectedPlan !== null}
        onClose={handleCloseModal}
        onConfirm={handleConfirm}
        selectedPlan={selectedPlan}
        currentPlan={currentPlan}
        isLoading={confirmLoading}
        isTrialUser={isTrialUser}
      />
    </div>
  );
}
