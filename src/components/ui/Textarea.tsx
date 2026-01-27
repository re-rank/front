import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  showCount?: boolean;
  maxLength?: number;
  value?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, showCount, maxLength, id, value, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s/g, '-');
    const currentLength = typeof value === 'string' ? value.length : 0;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="block text-sm font-medium text-warm-700 mb-1">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          value={value}
          maxLength={maxLength}
          className={cn(
            'w-full px-3 py-2 border rounded-lg text-warm-900 placeholder-warm-400 resize-y min-h-[120px]',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
            'disabled:bg-warm-100 disabled:cursor-not-allowed',
            error ? 'border-red-500' : 'border-warm-300',
            className
          )}
          {...props}
        />
        <div className="flex justify-between mt-1">
          <div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            {helperText && !error && <p className="text-sm text-warm-500">{helperText}</p>}
          </div>
          {showCount && maxLength && (
            <p className={cn('text-sm', currentLength > maxLength ? 'text-red-500' : 'text-warm-500')}>
              {currentLength.toLocaleString()} / {maxLength.toLocaleString()}
            </p>
          )}
        </div>
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export { Textarea };
