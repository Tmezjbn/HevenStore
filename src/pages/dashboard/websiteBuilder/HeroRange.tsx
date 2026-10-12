export default function HeroRange({
  label,
  value,
  min,
  max,
  onChange,
  leftHint,
  rightHint,
  linkedNote,
  ariaLabel,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  leftHint: string;
  rightHint: string;
  linkedNote?: string;
  ariaLabel: string;
}) {
  return (
    <label className="flex w-full flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
      <span className="flex justify-between gap-2 text-xs font-semibold tracking-wide text-base-content/80">
        <span>
          {label}
          {linkedNote ? (
            <span className="ms-1.5 font-medium text-info">{linkedNote}</span>
          ) : null}
        </span>
        <span className="tabular-nums text-base-content/65">{value}%</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onInput={(e) => onChange(Number((e.target as HTMLInputElement).value))}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range range-primary range-xs"
        aria-label={ariaLabel}
      />
      <span className="flex justify-between text-xs text-base-content/55">
        <span>{leftHint}</span>
        <span>{rightHint}</span>
      </span>
    </label>
  );
}
