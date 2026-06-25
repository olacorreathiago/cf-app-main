import * as React from "react";
import { cn } from "@/lib/utils";

interface FieldInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  /** Icon rendered on the left inside the input */
  icon?: React.ReactNode;
  /** Icon rendered on the right inside the input */
  trailingIcon?: React.ReactNode;
}

export const FieldInput = React.forwardRef<HTMLInputElement, FieldInputProps>(
  ({ label, error, hint, icon, trailingIcon, className, id, ...props }, ref) => {
    const inputId = id ?? React.useId();

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-text-secondary"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {icon && (
            <span className="pointer-events-none absolute left-4 flex items-center text-text-tertiary">
              {icon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
            }
            className={cn(
              "w-full rounded-xl bg-bg-input text-text-primary",
              "border border-border",
              "px-4 py-3.5 text-base",
              "placeholder:text-text-tertiary",
              "outline-none transition-shadow duration-150",
              "focus:ring-2 focus:ring-ring focus:border-transparent",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "aria-invalid:border-error aria-invalid:ring-2 aria-invalid:ring-error/30",
              icon && "pl-11",
              trailingIcon && "pr-11",
              className
            )}
            {...props}
          />

          {trailingIcon && (
            <span className="absolute right-4 flex items-center text-text-tertiary">
              {trailingIcon}
            </span>
          )}
        </div>

        {error && (
          <p id={`${inputId}-error`} role="alert" className="flex items-center gap-1.5 text-sm text-error">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
              <path d="M7 4.5V7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="7" cy="9.5" r="0.75" fill="currentColor" />
            </svg>
            {error}
          </p>
        )}

        {hint && !error && (
          <p id={`${inputId}-hint`} className="text-sm text-text-tertiary">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

FieldInput.displayName = "FieldInput";
