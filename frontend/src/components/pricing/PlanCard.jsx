import { Check } from 'lucide-react';

export default function PlanCard({ plan, currentPlanSlug, onSelect, isTrialUser }) {
  const isPopular = plan.is_popular === true;
  const isCurrent = plan.slug === currentPlanSlug;
  const isEnterprise = plan.slug === 'enterprise';

  const priceDisplay = plan.price_cents === 0
    ? (isEnterprise ? 'Custom' : 'Free')
    : `$${plan.price_cents / 100}`;

  const hasCurrentPlan = currentPlanSlug !== null;

  return (
    <div
      className={`relative overflow-hidden flex flex-col h-full bg-surface/60 backdrop-blur-sm rounded-xl p-6 transition-all duration-300 hover:translate-y-[-2px] ${
        isPopular
          ? 'border-2 border-violet shadow-lg shadow-violet/20'
          : 'border border-border'
      }`}
    >
      {/* Most Popular badge */}
      {isPopular && (
        <span className="absolute -top-0 left-1/2 -translate-x-1/2 px-3 py-1 bg-violet text-white text-xs font-display rounded-b-full">
          Most Popular
        </span>
      )}

      {/* Plan name */}
      <h3 className={`font-display text-lg font-bold text-white ${isPopular ? 'mt-4' : ''}`}>
        {plan.name}
      </h3>

      {/* Price */}
      <div className="mt-3">
        <span className="font-display text-3xl font-bold text-white">{priceDisplay}</span>
        {plan.price_cents > 0 && (
          <span className="text-sm text-text-muted font-mono">/mo</span>
        )}
      </div>

      {/* Daily credit limit */}
      <p className="font-mono text-sm text-text-secondary mt-1">
        {plan.daily_credit_limit} searches/day
      </p>

      {/* Feature list */}
      <ul className="mt-4 space-y-2 flex-1">
        {(plan.features || []).map((feature, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <Check className="w-4 h-4 text-green mt-0.5 shrink-0" />
            <span className="text-sm text-text-muted font-mono">{feature}</span>
          </li>
        ))}
      </ul>

      {/* Action button area */}
      <div className="mt-6">
        {isCurrent ? (
          <div className="flex justify-center">
            <span className="chip chip-cyan">Current Plan</span>
          </div>
        ) : isEnterprise ? (
          <a
            href="mailto:sales@aquasecure.ai"
            className="block w-full text-center border border-violet text-violet hover:bg-violet/10 font-display font-semibold py-2.5 px-6 rounded-lg transition-colors"
          >
            Contact Us
          </a>
        ) : (
          <button
            onClick={() => onSelect(plan)}
            className="w-full bg-gradient-to-r from-violet to-cyan text-white font-display font-semibold py-2.5 px-6 rounded-lg hover:opacity-90 transition-opacity"
          >
            {hasCurrentPlan ? 'Upgrade' : 'Select Plan'}
          </button>
        )}
      </div>
    </div>
  );
}
