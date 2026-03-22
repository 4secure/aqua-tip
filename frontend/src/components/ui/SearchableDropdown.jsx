import { useState, useRef, useEffect } from 'react';

export default function SearchableDropdown({ options, value, onChange, placeholder, error }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = options
    .filter((opt) => opt.label.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 50);

  const selectedLabel = options.find((opt) => opt.value === value)?.label || '';

  function handleFocus() {
    setIsOpen(true);
    setQuery('');
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
    if (e.key === 'Enter' && filtered.length > 0) {
      e.preventDefault();
      onChange(filtered[0].value);
      setIsOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        className="input-field w-full"
        placeholder={placeholder}
        value={isOpen ? query : selectedLabel}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
      />
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto bg-surface-2 border border-border rounded-lg shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-text-muted font-mono">No results found</div>
          ) : (
            filtered.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`w-full text-left px-3 py-2 text-sm font-mono ${
                  opt.value === value
                    ? 'bg-violet/10 text-text-primary'
                    : 'text-text-primary hover:bg-violet/10'
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(opt.value);
                  setIsOpen(false);
                }}
              >
                {opt.label}
              </button>
            ))
          )}
        </div>
      )}
      {error && <p className="mt-1 text-xs text-red font-mono">{error}</p>}
    </div>
  );
}
