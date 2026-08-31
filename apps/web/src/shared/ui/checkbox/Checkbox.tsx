import { useId, type ReactNode } from "react";

import styles from "./Checkbox.module.css";

type CheckboxSize = "sm" | "md";

export type CheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel?: string;
  children?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  value?: string;
  id?: string;
  className?: string;
  size?: CheckboxSize;
};

const sizeClassNames: Record<CheckboxSize, string> = {
  sm: styles.rootSmall!,
  md: styles.rootMedium!,
};

export function Checkbox({
  checked,
  onChange,
  ariaLabel,
  children,
  description,
  disabled = false,
  required = false,
  name,
  value,
  id,
  className = "",
  size = "md",
}: CheckboxProps) {
  const generatedId = useId();
  const inputId = id ?? `${generatedId}-checkbox`;
  const labelId = children ? `${generatedId}-label` : undefined;
  const descriptionId = description ? `${generatedId}-description` : undefined;
  const hasText = Boolean(children || description);

  return (
    <label
      className={[
        styles.root,
        sizeClassNames[size],
        disabled ? styles.rootDisabled : "",
        !hasText ? styles.rootIconOnly : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      htmlFor={inputId}
    >
      <span className={styles.control}>
        <input
          id={inputId}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          required={required}
          name={name}
          value={value}
          aria-label={!children ? ariaLabel : undefined}
          aria-labelledby={labelId}
          aria-describedby={descriptionId}
          className={styles.input}
          onChange={(event) => onChange(event.target.checked)}
        />

        <span className={styles.box} aria-hidden="true">
          <span className={styles.mark}>✓</span>
        </span>
      </span>

      {hasText ? (
        <span className={styles.copy}>
          {children ? <span id={labelId} className={styles.label}>{children}</span> : null}
          {description ? (
            <span id={descriptionId} className={styles.description}>
              {description}
            </span>
          ) : null}
        </span>
      ) : null}
    </label>
  );
}
