import { useId, type LabelHTMLAttributes, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/cn';

export function Label({
  className,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        'mb-1 block text-label font-medium text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

export function FormError({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  if (!children) return null;
  return (
    <p
      className={cn(
        'mt-1 flex items-center gap-1 text-label text-red-500',
        className,
      )}
    >
      <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
      {children}
    </p>
  );
}

/**
 * Field: bọc label + control + error, tự sinh id để gắn nhãn (accessibility).
 * Dùng render-prop: <Field label="Email">{({ id, invalid }) => <Input id={id} invalid={invalid}/>}</Field>
 */
export function Field({
  label,
  error,
  hint,
  required,
  className,
  children,
}: {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: (props: { id: string; invalid: boolean }) => ReactNode;
}) {
  const id = useId();
  return (
    <div className={cn('flex flex-col', className)}>
      {label && (
        <Label htmlFor={id}>
          {label}
          {required && <span className="text-red-500"> *</span>}
        </Label>
      )}
      {children({ id, invalid: !!error })}
      {hint && !error && (
        <p className="mt-1 text-label text-muted-foreground">{hint}</p>
      )}
      <FormError>{error}</FormError>
    </div>
  );
}
