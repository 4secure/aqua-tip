import { Check, Shield, Zap, Rocket, Building2, Crown } from 'lucide-react';
import { GradientButton } from '../ui/GradientButton';
import { Card } from '../ui/Card';
import { cn } from '../../lib/utils';

const PLAN_ICONS = {
  free: Shield,
  basic: Zap,
  pro: Rocket,
  business: Building2,
  enterprise: Crown,
};

export default function PlanCard({ plan, currentPlanSlug, onContact }) {
  const isPopular = plan.is_popular === true;
  const isCurrent = plan.slug === currentPlanSlug;

  const priceDisplay = plan.price_cents === 0
    ? (plan.slug === 'enterprise' ? 'Custom' : 'Free')
    : `$${plan.price_cents / 100}`;

  const Icon = PLAN_ICONS[plan.slug] || Shield;

  return (
    <div className="group relative transition-all duration-500 hover:scale-[1.02] hover:-rotate-1 hover:z-10">
      <Card
        className={cn(
          'relative overflow-hidden h-full',
          'bg-gradient-to-br from-surface via-surface-2/80 to-surface',
          isPopular
            ? 'border-2 border-violet/60 shadow-lg shadow-violet/20'
            : 'border border-border/80'
        )}
      >
        {/* Gradient overlay */}
        <div
          className={cn(
            'absolute inset-0 opacity-20 transition-opacity duration-500 group-hover:opacity-30',
            isPopular
              ? 'bg-gradient-to-br from-violet/30 via-transparent to-cyan/20'
              : 'bg-gradient-to-br from-violet/10 via-transparent to-cyan/5'
          )}
        />

        {/* Animated blur orbs */}
        <div className="absolute -top-8 -left-8 w-32 h-32 bg-violet/15 rounded-full blur-2xl animate-bounce [animation-duration:6s]" />
        <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-cyan/10 rounded-full blur-2xl animate-pulse [animation-duration:4s]" />

        {/* Ping dots */}
        <div className="absolute top-4 right-4 w-1.5 h-1.5 rounded-full bg-violet/40 animate-ping [animation-duration:3s]" />
        <div className="absolute bottom-6 left-5 w-1 h-1 rounded-full bg-cyan/30 animate-ping [animation-duration:4s] [animation-delay:1s]" />

        {/* Shimmer sweep on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        </div>

        {/* Most Popular badge */}
        {isPopular && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20">
            <span className="inline-block px-4 py-1 bg-gradient-to-r from-violet to-violet-light text-white text-xs font-sans font-semibold rounded-b-lg shadow-lg shadow-violet/30">
              Most Popular
            </span>
          </div>
        )}

        {/* Content */}
        <div className={cn('relative z-10 flex flex-col h-full p-6', isPopular && 'pt-10')}>
          {/* Plan icon in glowing circle */}
          <div className="mb-4">
            <div className={cn(
              'inline-flex items-center justify-center w-12 h-12 rounded-xl',
              'bg-gradient-to-br from-violet/20 to-cyan/10',
              'border border-violet/20',
              'shadow-lg shadow-violet/10',
              'transition-all duration-500 group-hover:shadow-violet/30 group-hover:border-violet/40'
            )}>
              <Icon className="w-6 h-6 text-violet-light" />
            </div>
          </div>

          {/* Plan name with gradient text */}
          <h3 className="font-sans text-lg font-bold bg-gradient-to-r from-white to-text-secondary bg-clip-text text-transparent group-hover:from-violet-light group-hover:to-cyan transition-all duration-500">
            {plan.name}
          </h3>

          {/* Price */}
          <div className="mt-3">
            <span className="font-sans text-3xl font-bold text-white">{priceDisplay}</span>
            {plan.price_cents > 0 && (
              <span className="text-sm text-text-muted font-mono">/mo</span>
            )}
          </div>

          {/* Daily credit limit */}
          <p className="font-mono text-sm text-text-secondary mt-1">
            {plan.daily_credit_limit} searches/day
          </p>

          {/* Divider line with animated width */}
          <div className="relative my-4 h-px bg-border/50">
            <div className="absolute inset-y-0 left-0 w-0 group-hover:w-full bg-gradient-to-r from-violet/50 to-cyan/30 transition-all duration-700" />
          </div>

          {/* Feature list */}
          <ul className="space-y-2.5 flex-1">
            {(plan.features || []).map((feature, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <div className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full bg-green/10 flex items-center justify-center">
                  <Check className="w-3 h-3 text-green" />
                </div>
                <span className="text-sm text-text-muted font-mono leading-snug">{feature}</span>
              </li>
            ))}
          </ul>

          {/* Action button */}
          <div className="mt-6">
            {isCurrent ? (
              <div className="flex justify-center">
                <span className="chip chip-cyan">Current Plan</span>
              </div>
            ) : (
              <GradientButton
                onClick={() => onContact(plan)}
                size="sm"
                className="w-full"
              >
                Contact Us
              </GradientButton>
            )}
          </div>
        </div>

        {/* Corner glow top-left */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-violet/0 group-hover:bg-violet/10 rounded-full blur-2xl transition-all duration-700 pointer-events-none" />

        {/* Corner glow bottom-right */}
        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-cyan/0 group-hover:bg-cyan/8 rounded-full blur-2xl transition-all duration-700 pointer-events-none" />
      </Card>
    </div>
  );
}
