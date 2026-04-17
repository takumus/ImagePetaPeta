import { css, cx } from "styled-system/css";

const rootStyle = css({
  display: "inline-block",
  border: "none",
  margin: 0,
  background: "transparent",
  padding: "px1",
  height: "23px",
  color: "inherit",
  cursor: "pointer",
});

const disabledStyle = css({
  cursor: "not-allowed",
  opacity: 0.56,
});

const trackStyle = css({
  position: "relative",
  display: "block",
  overflow: "hidden",
  height: "100%",
  aspectRatio: "2",
  borderRadius: "window",
  backgroundColor: "checkboxFalseBackground",
  transitionDuration: "100ms",
});

const trackCheckedStyle = css({
  backgroundColor: "checkboxTrueBackground",
});

const thumbStyle = css({
  position: "relative",
  left: "0%",
  display: "block",
  height: "100%",
  aspectRatio: "1",
  transform: "scale(0.7)",
  borderRadius: "circle",
  backgroundColor: "checkboxFalseCircle",
  boxShadow: "0px 0.5px 2px rgba(0, 0, 0, 0.2)",
  transitionDuration: "100ms",
  transitionProperty: "left, background-color",
});

const thumbCheckedStyle = css({
  left: "50%",
  backgroundColor: "checkboxTrueCircle",
});

export default function VCheckbox({
  disabled = false,
  value,
  onValueChange,
}: {
  disabled?: boolean;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <button
      aria-checked={value}
      className={cx(rootStyle, disabled && disabledStyle)}
      disabled={disabled}
      onClick={() => {
        if (!disabled) {
          onValueChange(!value);
        }
      }}
      role="switch"
      type="button">
      <span className={cx(trackStyle, value && trackCheckedStyle)}>
        <span className={cx(thumbStyle, value && thumbCheckedStyle)} />
      </span>
    </button>
  );
}
