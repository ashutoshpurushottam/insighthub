import { useCallback, useMemo, useRef } from 'react';

interface SqlEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
}

export function SqlEditor({
  value,
  onChange,
  placeholder = 'SELECT * FROM ...',
  rows = 12,
  disabled = false,
}: SqlEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const lineNumbers = useMemo(() => {
    const count = value.split('\n').length;
    return Array.from({ length: count }, (_, i) => i + 1);
  }, [value]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange],
  );

  const handleScroll = useCallback(() => {
    const textarea = textareaRef.current;
    const gutter = textarea?.previousElementSibling as HTMLElement | null;
    if (textarea && gutter) {
      gutter.scrollTop = textarea.scrollTop;
    }
  }, []);

  return (
    <div className="flex overflow-hidden rounded-md border border-gray-300 focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500">
      <div
        aria-hidden="true"
        className="overflow-hidden border-r border-gray-200 bg-gray-50 px-3 py-2 text-right font-mono text-sm leading-6 text-gray-400 select-none"
      >
        {lineNumbers.map((num) => (
          <div key={num}>{num}</div>
        ))}
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onScroll={handleScroll}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        spellCheck={false}
        className="w-full resize-y bg-white px-3 py-2 font-mono text-sm leading-6 text-gray-900 placeholder-gray-400 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
      />
    </div>
  );
}
