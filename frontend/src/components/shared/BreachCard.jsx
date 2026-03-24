import { useState } from 'react';
import { Mail, KeyRound, Database, Calendar, ChevronDown, ChevronUp, Globe } from 'lucide-react';
import { useFormatDate } from '../../hooks/useFormatDate';

function FieldRow({ icon: IconComponent, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 min-w-0">
      <IconComponent size={14} className="text-text-muted shrink-0" />
      <span className="text-xs text-text-muted shrink-0">{label}:</span>
      <span className="text-sm font-mono text-text-primary truncate">{value}</span>
    </div>
  );
}

export function BreachCard({ breach }) {
  const { formatDate } = useFormatDate();
  const [expanded, setExpanded] = useState(false);

  const extraFields = [
    breach.username && { label: 'Username', value: breach.username },
    breach.first_name && { label: 'First Name', value: breach.first_name },
    breach.last_name && { label: 'Last Name', value: breach.last_name },
    breach.phone && { label: 'Phone', value: breach.phone },
    ...(Array.isArray(breach.fields)
      ? breach.fields.map((f) => ({ label: f, value: 'Present' }))
      : []),
  ].filter(Boolean);

  const hasExtra = extraFields.length > 0;

  return (
    <div className="bg-surface/60 border border-border backdrop-blur-sm rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <FieldRow icon={Mail} label="Email" value={breach.email} />
        <FieldRow icon={KeyRound} label="Password" value={breach.password} />
        <FieldRow icon={Database} label="Source" value={breach.source} />
        <FieldRow icon={Globe} label="URL" value={breach.url} />
      </div>

      {hasExtra && (
        <>
          {expanded && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-border">
              {extraFields.map((field, i) => (
                <div key={i} className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-text-muted shrink-0">{field.label}:</span>
                  <span className="text-sm font-mono text-text-primary truncate">
                    {field.value}
                  </span>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => setExpanded((prev) => !prev)}
            className="flex items-center gap-1 text-xs text-cyan hover:text-cyan/80 transition-colors"
          >
            {expanded ? (
              <>
                <ChevronUp size={14} /> Show less
              </>
            ) : (
              <>
                <ChevronDown size={14} /> Show more
              </>
            )}
          </button>
        </>
      )}
    </div>
  );
}
