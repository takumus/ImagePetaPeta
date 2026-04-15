import Fuse from "fuse.js";
import {
  CSSProperties,
  forwardRef,
  KeyboardEvent,
  MouseEvent,
  MutableRefObject,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { css, cx } from "styled-system/css";

const rootStyle = css({
  position: "relative",
  display: "inline-block",
  minWidth: "px3",
  width: "100%",
});

const baseFieldStyle = css({
  display: "inline-block",
  width: "100%",
  minHeight: "size2",
  borderRadius: "calc(var(--rounded) / 4)",
  color: "text",
  lineHeight: "size2",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  outline: "none",
});

const idleStyle = css({
  cursor: "pointer",
});

const editingStyle = css({
  cursor: "text",
  backgroundColor: "surface",
});

const outlinedStyle = css({
  boxShadow: "inset 0 0 0 1px var(--colors-text)",
});

const inputResetStyle = css({
  border: "none",
  background: "transparent",
  resize: "none",
  padding: 0,
  font: "inherit",
});

const complementStyle = css({
  position: "absolute",
  top: "calc(100% + 4px)",
  left: 0,
  zIndex: 10,
  display: "flex",
  flexWrap: "wrap",
  gap: "px1",
  maxWidth: "256px",
  padding: "px2",
  borderWidth: "window",
  borderStyle: "solid",
  borderColor: "border",
  borderRadius: "window",
  backgroundColor: "surface",
  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)",
});

const complementItemStyle = css({
  display: "inline-block",
  borderWidth: "window",
  borderStyle: "solid",
  borderColor: "border",
  borderRadius: "window",
  backgroundColor: "surfaceMuted",
  paddingX: "px1",
  paddingY: "px0",
  fontSize: "size0",
  lineHeight: "size1",
  cursor: "pointer",
  userSelect: "none",
  _hover: {
    backgroundColor: "surfaceEmphasis",
  },
});

const selectedComplementItemStyle = css({
  backgroundColor: "surfaceEmphasis",
  borderColor: "accent",
});

export type VTextareaHandle = {
  edit: () => void;
  isEditing: () => boolean;
};

type Props = {
  allowEmpty?: boolean;
  blurToReset?: boolean;
  clickToEdit?: boolean;
  complements?: string[];
  look?: string;
  noOutline?: boolean;
  onDeleteOfEmpty?: () => void;
  onValueChange?: (value: string) => void;
  outerStyle?: CSSProperties;
  readOnly?: boolean;
  textAreaStyle?: CSSProperties;
  trim?: boolean;
  type: "single" | "multi";
  value?: string;
};

function formatValue(value: string, type: Props["type"], trim?: boolean) {
  let nextValue = value;
  if (type === "single") {
    nextValue = nextValue.replace(/\r?\n/g, "");
  }
  if (trim) {
    nextValue = nextValue.trim();
  }
  return nextValue;
}

const VTextarea = forwardRef<VTextareaHandle, Props>(function VTextarea(
  {
    allowEmpty,
    blurToReset,
    clickToEdit,
    complements,
    look,
    noOutline,
    onDeleteOfEmpty,
    onValueChange,
    outerStyle,
    readOnly,
    textAreaStyle,
    trim,
    type,
    value,
  },
  ref,
) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(value ?? "");
  const [selectedIndex, setSelectedIndex] = useState(0);

  useImperativeHandle(ref, () => ({
    edit() {
      if (readOnly) {
        return;
      }
      setEditing(true);
      setDraftValue(value ?? "");
    },
    isEditing() {
      return editing;
    },
  }));

  useEffect(() => {
    if (!editing) {
      setDraftValue(value ?? "");
    }
  }, [editing, value]);

  useEffect(() => {
    if (!editing || inputRef.current === null) {
      return;
    }
    inputRef.current.focus();
    if ("select" in inputRef.current) {
      inputRef.current.select();
    }
  }, [editing]);

  const filteredComplements = useMemo(() => {
    if (!editing || complements === undefined) {
      return [];
    }
    const source = formatValue(draftValue, type, trim);
    if (source === "") {
      return complements;
    }
    const fuse = new Fuse(complements);
    return fuse.search(source).map((result) => result.item);
  }, [complements, draftValue, editing, trim, type]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [draftValue, filteredComplements.length]);

  function restore() {
    setDraftValue(value ?? "");
  }

  function commit(nextValue: string, blur: boolean) {
    if (readOnly) {
      return;
    }
    const formatted = formatValue(nextValue, type, trim);
    if (blur && blurToReset) {
      restore();
      setEditing(false);
      return;
    }
    if (formatted === "") {
      if (!allowEmpty) {
        restore();
        setEditing(false);
        return;
      }
    }
    if (formatted !== formatValue(value ?? "", type, trim)) {
      onValueChange?.(formatted);
    }
    setEditing(false);
  }

  function beginEdit() {
    if (readOnly || editing) {
      return;
    }
    setEditing(true);
    setDraftValue(value ?? "");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (!editing) {
      return;
    }
    if ((event.key === "Backspace" || event.key === "Delete") && draftValue === "") {
      onDeleteOfEmpty?.();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      commit(draftValue, true);
      return;
    }
    if (type === "single" && event.key === "Enter") {
      event.preventDefault();
      if (filteredComplements.length > 0 && selectedIndex >= 0) {
        const item = filteredComplements[selectedIndex];
        if (item !== undefined) {
          setDraftValue(item);
          commit(item, false);
          return;
        }
      }
      commit(draftValue, false);
      return;
    }
    if (editing && filteredComplements.length > 0) {
      if (event.key === "ArrowDown" || event.key === "Tab") {
        event.preventDefault();
        setSelectedIndex((current) =>
          filteredComplements.length === 0 ? 0 : (current + 1) % filteredComplements.length,
        );
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((current) =>
          filteredComplements.length === 0
            ? 0
            : (current - 1 + filteredComplements.length) % filteredComplements.length,
        );
      }
    }
  }

  const displayValue = editing ? formatValue(value ?? "", type, trim) : formatValue(look ?? value ?? "", type, trim);
  const commonClassName = cx(
    baseFieldStyle,
    editing ? editingStyle : idleStyle,
    noOutline === false && editing && outlinedStyle,
  );

  function renderInput() {
    if (type === "multi") {
      return (
        <textarea
          className={cx(commonClassName, inputResetStyle)}
          onBlur={() => commit(draftValue, true)}
          onChange={(event) => setDraftValue(event.target.value)}
          onKeyDown={handleKeyDown}
          ref={inputRef as MutableRefObject<HTMLTextAreaElement | null>}
          spellCheck={false}
          style={textAreaStyle}
          value={draftValue}
        />
      );
    }
    return (
        <input
          className={cx(commonClassName, inputResetStyle)}
        onBlur={() => commit(draftValue, true)}
        onChange={(event) => setDraftValue(event.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={(event) => {
          event.preventDefault();
          const pasted = event.clipboardData.getData("text/plain");
          setDraftValue((current) => `${current}${formatValue(pasted, type, trim)}`);
        }}
          ref={inputRef as MutableRefObject<HTMLInputElement | null>}
        spellCheck={false}
        style={textAreaStyle}
        value={draftValue}
      />
    );
  }

  return (
    <div className={rootStyle} style={outerStyle}>
      {editing ? (
        renderInput()
      ) : (
        <div
          className={commonClassName}
          onClick={() => {
            if (clickToEdit) {
              beginEdit();
            }
          }}
          onDoubleClick={() => beginEdit()}
          onMouseDown={(event: MouseEvent<HTMLDivElement>) => {
            if (readOnly) {
              event.preventDefault();
            }
          }}
          style={textAreaStyle}>
          {displayValue}
        </div>
      )}
      {editing && filteredComplements.length > 0 ? (
        <div className={complementStyle}>
          {filteredComplements.map((item, index) => (
            <button
              className={cx(complementItemStyle, index === selectedIndex && selectedComplementItemStyle)}
              key={item}
              onMouseDown={(event) => {
                event.preventDefault();
                setDraftValue(item);
                commit(item, false);
              }}
              type="button">
              {item}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
});

export default VTextarea;
