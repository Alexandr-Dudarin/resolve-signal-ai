import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

import {
  DEFAULT_SELECT_EMPTY_LABEL,
  DEFAULT_SELECT_PLACEHOLDER,
} from "./Select.copy";
import styles from "./Select.module.css";

export type SelectOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
  kind?: "option" | "group";
};

type SelectLayout = "filter" | "form" | "full";
type SelectDropdownAlign = "start" | "end";
type SelectDropdownWidth = "default" | "trigger";

export type SelectProps = {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  placeholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  className?: string;
  layout?: SelectLayout;
  dropdownAlign?: SelectDropdownAlign;
  dropdownWidth?: SelectDropdownWidth;
};

const layoutClassNames: Record<SelectLayout, string> = {
  filter: styles.rootFilter!,
  form: styles.rootForm!,
  full: styles.rootFull!,
};

const TOUCH_OPTION_SELECT_MOVE_THRESHOLD_PX = 10;

function isSelectableOption(option: SelectOption | undefined): boolean {
  return Boolean(option && option.kind !== "group" && !option.disabled);
}

function getEnabledOptionIndexes(options: SelectOption[]): number[] {
  return options
    .map((option, index) => (isSelectableOption(option) ? index : -1))
    .filter((index) => index >= 0);
}

function getInitialHighlightedIndex(
  options: SelectOption[],
  value: string
): number {
  const selectedIndex = options.findIndex(
    (option) => option.value === value && isSelectableOption(option)
  );

  if (selectedIndex >= 0) {
    return selectedIndex;
  }

  return getEnabledOptionIndexes(options)[0] ?? -1;
}

function getNextHighlightedIndex(
  options: SelectOption[],
  currentIndex: number,
  direction: 1 | -1
): number {
  const enabledIndexes = getEnabledOptionIndexes(options);

  if (enabledIndexes.length === 0) {
    return -1;
  }

  const currentPosition = enabledIndexes.indexOf(currentIndex);

  if (currentPosition === -1) {
    return direction === 1
      ? (enabledIndexes[0] ?? -1)
      : (enabledIndexes[enabledIndexes.length - 1] ?? -1);
  }

  const nextPosition =
    (currentPosition + direction + enabledIndexes.length) %
    enabledIndexes.length;

  return enabledIndexes[nextPosition] ?? -1;
}

function isTouchLikePointer(event: ReactPointerEvent<HTMLElement>): boolean {
  return event.pointerType === "touch" || event.pointerType === "pen";
}

export function Select({
  value,
  options,
  onChange,
  ariaLabel,
  placeholder = DEFAULT_SELECT_PLACEHOLDER,
  emptyLabel = DEFAULT_SELECT_EMPTY_LABEL,
  disabled = false,
  className = "",
  layout = "filter",
  dropdownAlign = "start",
  dropdownWidth = "default",
}: SelectProps) {
  const generatedId = useId();
  const triggerId = `${generatedId}-trigger`;
  const listboxId = `${generatedId}-listbox`;
  const getOptionId = (index: number) => `${generatedId}-option-${index}`;

  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const shouldScrollToSelectedOnOpenRef = useRef(false);
  const suppressNextTriggerClickRef = useRef(false);
  const suppressNextTriggerClickTimerRef = useRef<number | null>(null);
  const delayedCloseTimerRef = useRef<number | null>(null);
  const optionPointerStateRef = useRef<{
    pointerId: number;
    index: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const ignoreNextOptionClickRef = useRef(false);
  const ignoreNextOptionClickTimerRef = useRef<number | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(() =>
    getInitialHighlightedIndex(options, value)
  );

  const selectedOption = useMemo(
    () =>
      options.find(
        (option) => option.kind !== "group" && option.value === value
      ) ?? null,
    [options, value]
  );

  const selectedLabel = selectedOption?.label ?? placeholder;
  const hasSelectedOption = selectedOption !== null;
  const highlightedOption = options[highlightedIndex];
  const activeDescendantId =
    isOpen && isSelectableOption(highlightedOption)
      ? getOptionId(highlightedIndex)
      : undefined;

  const rootClassName = [
    styles.root,
    layoutClassNames[layout],
    isOpen ? styles.rootOpen : "",
    disabled ? styles.rootDisabled : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const dropdownClassName = [
    styles.dropdown,
    dropdownAlign === "end" ? styles.dropdownEnd : "",
    dropdownWidth === "trigger" ? styles.dropdownMatchTrigger : "",
  ]
    .filter(Boolean)
    .join(" ");

  const suppressNextTriggerClick = () => {
    suppressNextTriggerClickRef.current = true;

    if (suppressNextTriggerClickTimerRef.current !== null) {
      window.clearTimeout(suppressNextTriggerClickTimerRef.current);
    }

    suppressNextTriggerClickTimerRef.current = window.setTimeout(() => {
      suppressNextTriggerClickRef.current = false;
      suppressNextTriggerClickTimerRef.current = null;
    }, 450);
  };

  const ignoreNextOptionClick = () => {
    ignoreNextOptionClickRef.current = true;

    if (ignoreNextOptionClickTimerRef.current !== null) {
      window.clearTimeout(ignoreNextOptionClickTimerRef.current);
    }

    ignoreNextOptionClickTimerRef.current = window.setTimeout(() => {
      ignoreNextOptionClickRef.current = false;
      ignoreNextOptionClickTimerRef.current = null;
    }, 450);
  };

  const openDropdown = () => {
    if (disabled) {
      return;
    }

    setHighlightedIndex(getInitialHighlightedIndex(options, value));
    shouldScrollToSelectedOnOpenRef.current = true;
    setIsOpen(true);
  };

  const closeDropdown = () => {
    shouldScrollToSelectedOnOpenRef.current = false;
    setIsOpen(false);
  };

  const selectOption = (
    option: SelectOption,
    index: number,
    settings: {
      shouldFocusTrigger?: boolean;
      closeDelayMs?: number;
    } = {}
  ) => {
    if (!isSelectableOption(option)) {
      return;
    }

    const shouldFocusTrigger = settings.shouldFocusTrigger ?? true;
    const closeDelayMs = settings.closeDelayMs ?? 0;

    const finishClose = () => {
      closeDropdown();

      if (shouldFocusTrigger) {
        triggerRef.current?.focus();
      } else {
        triggerRef.current?.blur();
      }
    };

    setHighlightedIndex(index);

    if (option.value !== value) {
      onChange(option.value);
    }

    if (closeDelayMs > 0) {
      if (delayedCloseTimerRef.current !== null) {
        window.clearTimeout(delayedCloseTimerRef.current);
      }

      delayedCloseTimerRef.current = window.setTimeout(() => {
        delayedCloseTimerRef.current = null;
        finishClose();
      }, closeDelayMs);

      return;
    }

    finishClose();
  };

  const handleTriggerClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (disabled) {
      return;
    }

    if (suppressNextTriggerClickRef.current) {
      event.preventDefault();
      event.stopPropagation();
      suppressNextTriggerClickRef.current = false;
      return;
    }

    if (isOpen) {
      closeDropdown();
      return;
    }

    openDropdown();
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();

      if (!isOpen) {
        openDropdown();
        return;
      }

      setHighlightedIndex((currentIndex) =>
        getNextHighlightedIndex(options, currentIndex, 1)
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      if (!isOpen) {
        openDropdown();
        return;
      }

      setHighlightedIndex((currentIndex) =>
        getNextHighlightedIndex(options, currentIndex, -1)
      );
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setHighlightedIndex(getEnabledOptionIndexes(options)[0] ?? -1);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();

      const enabledIndexes = getEnabledOptionIndexes(options);
      setHighlightedIndex(enabledIndexes[enabledIndexes.length - 1] ?? -1);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();

      if (!isOpen) {
        openDropdown();
        return;
      }

      const highlightedOption = options[highlightedIndex];

      if (highlightedOption) {
        selectOption(highlightedOption, highlightedIndex);
      }

      return;
    }

    if (event.key === "Escape") {
      if (isOpen) {
        event.preventDefault();
        closeDropdown();
      }
    }
  };

  useEffect(() => {
    optionRefs.current = optionRefs.current.slice(0, options.length);
  }, [options.length]);

  useEffect(() => {
    if (!isOpen || !shouldScrollToSelectedOnOpenRef.current) {
      return;
    }

    const selectedIndex = getInitialHighlightedIndex(options, value);

    if (selectedIndex < 0) {
      shouldScrollToSelectedOnOpenRef.current = false;
      return;
    }

    const animationFrameId = window.requestAnimationFrame(() => {
      const selectedOptionElement = optionRefs.current[selectedIndex];

      if (!selectedOptionElement) {
        shouldScrollToSelectedOnOpenRef.current = false;
        return;
      }

      selectedOptionElement.scrollIntoView({
        block: "center",
      });

      shouldScrollToSelectedOnOpenRef.current = false;
    });

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [isOpen, options, value]);

  useEffect(() => {
    if (
      !isOpen ||
      highlightedIndex < 0 ||
      shouldScrollToSelectedOnOpenRef.current
    ) {
      return;
    }

    const animationFrameId = window.requestAnimationFrame(() => {
      const highlightedOptionElement = optionRefs.current[highlightedIndex];

      highlightedOptionElement?.scrollIntoView({
        block: "nearest",
      });
    });

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [highlightedIndex, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleDocumentPointerDown(
      event: globalThis.MouseEvent | globalThis.TouchEvent
    ) {
      if (!rootRef.current) {
        return;
      }

      if (!rootRef.current.contains(event.target as Node)) {
        closeDropdown();
      }
    }

    document.addEventListener("mousedown", handleDocumentPointerDown);
    document.addEventListener("touchstart", handleDocumentPointerDown);

    return () => {
      document.removeEventListener("mousedown", handleDocumentPointerDown);
      document.removeEventListener("touchstart", handleDocumentPointerDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setHighlightedIndex((currentIndex) => {
      const currentOption = options[currentIndex];

      if (isSelectableOption(currentOption)) {
        return currentIndex;
      }

      return getInitialHighlightedIndex(options, value);
    });
  }, [isOpen, options, value]);

  useEffect(() => {
    if (disabled) {
      closeDropdown();
    }
  }, [disabled]);

  useEffect(() => {
    return () => {
      if (suppressNextTriggerClickTimerRef.current !== null) {
        window.clearTimeout(suppressNextTriggerClickTimerRef.current);
      }

      if (delayedCloseTimerRef.current !== null) {
        window.clearTimeout(delayedCloseTimerRef.current);
      }

      if (ignoreNextOptionClickTimerRef.current !== null) {
        window.clearTimeout(ignoreNextOptionClickTimerRef.current);
      }
    };
  }, []);

  return (
    <div ref={rootRef} className={rootClassName}>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        role="combobox"
        className={styles.trigger}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-activedescendant={activeDescendantId}
        disabled={disabled}
        onClick={handleTriggerClick}
        onKeyDown={handleTriggerKeyDown}
      >
        <span
          className={[
            styles.triggerLabel,
            !hasSelectedOption ? styles.triggerPlaceholder : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {selectedLabel}
        </span>

        <span className={styles.chevron} aria-hidden="true">
          ▾
        </span>
      </button>

      {isOpen ? (
        <div
          id={listboxId}
          className={dropdownClassName}
          role="listbox"
          aria-labelledby={triggerId}
        >
          {options.length > 0 ? (
            options.map((option, index) => {
              if (option.kind === "group") {
                return (
                  <div
                    key={option.value}
                    className={styles.optionGroup}
                    role="presentation"
                  >
                    <span className={styles.optionGroupLabel}>
                      {option.label}
                    </span>
                  </div>
                );
              }

              const isSelected = option.value === value;
              const isHighlighted = index === highlightedIndex;

              return (
                <button
                  key={option.value}
                  ref={(element) => {
                    optionRefs.current[index] = element;
                  }}
                  id={getOptionId(index)}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={option.disabled || undefined}
                  disabled={option.disabled}
                  className={[
                    styles.option,
                    isSelected ? styles.optionSelected : "",
                    isHighlighted ? styles.optionHighlighted : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onMouseEnter={() => {
                    if (isSelectableOption(option)) {
                      setHighlightedIndex(index);
                    }
                  }}
                  onPointerDown={(event) => {
                    if (
                      !isTouchLikePointer(event) ||
                      !isSelectableOption(option)
                    ) {
                      return;
                    }

                    optionPointerStateRef.current = {
                      pointerId: event.pointerId,
                      index,
                      startX: event.clientX,
                      startY: event.clientY,
                      moved: false,
                    };
                  }}
                  onPointerMove={(event) => {
                    const pointerState = optionPointerStateRef.current;

                    if (
                      !pointerState ||
                      pointerState.pointerId !== event.pointerId
                    ) {
                      return;
                    }

                    const distanceX = Math.abs(
                      event.clientX - pointerState.startX
                    );
                    const distanceY = Math.abs(
                      event.clientY - pointerState.startY
                    );

                    if (
                      distanceX > TOUCH_OPTION_SELECT_MOVE_THRESHOLD_PX ||
                      distanceY > TOUCH_OPTION_SELECT_MOVE_THRESHOLD_PX
                    ) {
                      pointerState.moved = true;
                    }
                  }}
                  onPointerUp={(event) => {
                    const pointerState = optionPointerStateRef.current;

                    if (
                      !pointerState ||
                      pointerState.pointerId !== event.pointerId
                    ) {
                      return;
                    }

                    optionPointerStateRef.current = null;
                    ignoreNextOptionClick();

                    if (
                      pointerState.moved ||
                      pointerState.index !== index ||
                      !isSelectableOption(option)
                    ) {
                      return;
                    }

                    event.preventDefault();
                    event.stopPropagation();

                    suppressNextTriggerClick();
                    selectOption(option, index, {
                      shouldFocusTrigger: false,
                      closeDelayMs: 120,
                    });
                  }}
                  onPointerCancel={() => {
                    optionPointerStateRef.current = null;
                  }}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={(event) => {
                    event.stopPropagation();

                    if (ignoreNextOptionClickRef.current) {
                      event.preventDefault();
                      ignoreNextOptionClickRef.current = false;
                      return;
                    }

                    selectOption(option, index);
                  }}
                >
                  <span className={styles.optionLabel}>{option.label}</span>

                  {option.description ? (
                    <span className={styles.optionDescription}>
                      {option.description}
                    </span>
                  ) : null}
                </button>
              );
            })
          ) : (
            <div className={styles.emptyOption}>{emptyLabel}</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
