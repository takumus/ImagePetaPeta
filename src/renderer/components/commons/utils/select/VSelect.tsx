import { ChangeEvent } from "react";
import { css } from "styled-system/css";

import { SelectItem } from "@/renderer/components/commons/utils/select/selectItem";

const rootStyle = css({
  display: "inline-block",
});

const selectStyle = css({
  minHeight: "size2",
  borderWidth: "window",
  borderStyle: "solid",
  borderColor: "border",
  borderRadius: "window",
  backgroundColor: "surface",
  paddingLeft: "px2",
  paddingRight: "px4",
  color: "text",
  fontSize: "size1",
  lineHeight: "size1",
  outline: "none",
  cursor: "pointer",
  _focusVisible: {
    borderColor: "accent",
  },
});

export default function VSelect({
  items,
  minWidth,
  onValueChange,
  value,
}: {
  items: SelectItem[];
  minWidth?: string;
  onValueChange: (value: string | number) => void;
  value: string | number;
}) {
  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const item = items.find((candidate) => String(candidate.value) === event.target.value);
    if (item !== undefined) {
      onValueChange(item.value);
    }
  }

  return (
    <span className={rootStyle}>
      <select
        className={selectStyle}
        onChange={handleChange}
        style={{ minWidth }}
        value={String(value)}>
        {items.map((item) => (
          <option key={String(item.value)} value={String(item.value)}>
            {item.label}
          </option>
        ))}
      </select>
    </span>
  );
}
