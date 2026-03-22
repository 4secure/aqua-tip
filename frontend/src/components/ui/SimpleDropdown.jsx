import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export default function SimpleDropdown({
  options,
  value,
  onChange,
  placeholder,
  error,
  otherValue,
  onOtherChange,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleToggle() {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpward(spaceBelow < 260);
    }
    setIsOpen((prev) => !prev);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        className="input-field text-left flex items-center justify-between w-full"
        onClick={handleToggle}
      >
        <span className={value ? 'text-text-primary' : 'text-text-muted'}>
          {value || placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute z-50 w-full max-h-60 overflow-y-auto bg-surface-2 border border-border rounded-lg shadow-lg ${
            openUpward ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
        >
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              className={`w-full text-left px-3 py-2 text-sm font-mono ${
                opt === value
                  ? 'bg-violet/10 text-text-primary'
                  : 'text-text-primary hover:bg-violet/10'
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(opt);
                setIsOpen(false);
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {value === 'Other' && otherValue !== undefined && onOtherChange && (
        <input
          type="text"
          className="input-field mt-2 w-full"
          placeholder="Enter your role"
          value={otherValue}
          onChange={(e) => onOtherChange(e.target.value)}
        />
      )}

      {error && <p className="mt-1 text-xs text-red font-mono">{error}</p>}
    </div>
  );
}
