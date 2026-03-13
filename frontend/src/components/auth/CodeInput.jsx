import { useState, useRef, useCallback } from 'react';

export default function CodeInput({ length = 6, onComplete, disabled = false }) {
  const [values, setValues] = useState(Array(length).fill(''));
  const inputRefs = useRef([]);

  const focusInput = useCallback((index) => {
    if (index >= 0 && index < length) {
      inputRefs.current[index]?.focus();
    }
  }, [length]);

  function handleChange(index, e) {
    const raw = e.target.value;
    if (!/^\d*$/.test(raw)) return;

    const digit = raw.slice(-1);
    const next = values.map((v, i) => (i === index ? digit : v));
    setValues(next);

    if (digit && index < length - 1) {
      focusInput(index + 1);
    }

    if (digit && next.every((v) => v !== '')) {
      onComplete?.(next.join(''));
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace' && values[index] === '' && index > 0) {
      focusInput(index - 1);
    }
  }

  function handlePaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;

    const next = values.map((v, i) => (i < pasted.length ? pasted[i] : v));
    setValues(next);

    const focusIdx = Math.min(pasted.length, length - 1);
    focusInput(focusIdx);

    if (next.every((v) => v !== '')) {
      onComplete?.(next.join(''));
    }
  }

  function reset() {
    setValues(Array(length).fill(''));
    focusInput(0);
  }

  return (
    <div className="flex gap-3 justify-center" onPaste={handlePaste}>
      {values.map((val, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          value={val}
          disabled={disabled}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className={`w-12 h-14 text-center text-xl font-mono bg-surface-2 border border-border rounded-lg text-text-primary focus:border-violet focus:outline-none transition-colors ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        />
      ))}
    </div>
  );
}

// Expose reset via ref pattern -- consumer can also remount with key
CodeInput.displayName = 'CodeInput';
