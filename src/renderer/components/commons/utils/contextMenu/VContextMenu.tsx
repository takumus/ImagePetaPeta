import { useEffect, useMemo, useRef, useState } from "react";
import { css, cx } from "styled-system/css";

import { Vec2 } from "@/commons/utils/vec2";

import { ContextMenuItem } from "@/renderer/components/commons/utils/contextMenu/contextMenuItem";
import { useComponentsStore } from "@/renderer/stores/componentsStore/useComponentsStore";

const layerStyle = css({
  position: "fixed",
  inset: 0,
  zIndex: 9999,
  pointerEvents: "none",
});

const menuStyle = css({
  position: "fixed",
  minWidth: "128px",
  maxWidth: "512px",
  borderWidth: "window",
  borderStyle: "solid",
  borderColor: "border",
  borderRadius: "window",
  backgroundColor: "surface",
  padding: "px1",
  color: "text",
  boxShadow: "0 16px 40px rgba(0, 0, 0, 0.35)",
  pointerEvents: "auto",
});

const itemStyle = css({
  display: "block",
  width: "100%",
  border: "none",
  borderRadius: "calc(var(--rounded) / 2)",
  backgroundColor: "transparent",
  paddingX: "24px",
  paddingY: "px2",
  color: "inherit",
  textAlign: "left",
  wordBreak: "break-word",
  cursor: "pointer",
  _hover: {
    backgroundColor: "surfaceEmphasis",
  },
});

const disabledItemStyle = css({
  opacity: 0.56,
  cursor: "not-allowed",
  _hover: {
    backgroundColor: "transparent",
  },
});

const separateStyle = css({
  marginX: "px2",
  marginY: "px1",
  borderBottomWidth: "window",
  borderBottomStyle: "solid",
  borderBottomColor: "border",
  height: 0,
});

export default function VContextMenu() {
  const components = useComponentsStore();
  const menuRef = useRef<HTMLUListElement | null>(null);
  const [items, setItems] = useState<ContextMenuItem[]>([]);
  const [position, setPosition] = useState<Vec2 | null>(null);
  const [adjustedPosition, setAdjustedPosition] = useState<Vec2 | null>(null);

  const filteredItems = useMemo(() => items.filter((item) => item.skip !== true), [items]);
  const visible = filteredItems.length > 0 && position !== null;

  useEffect(() => {
    components.contextMenu = {
      open(nextItems: ContextMenuItem[], nextPosition: Vec2) {
        setItems(nextItems);
        setPosition(new Vec2(nextPosition));
      },
    };
  }, [components]);

  useEffect(() => {
    if (!visible || !menuRef.current || position === null) {
      return;
    }
    const rect = menuRef.current.getBoundingClientRect();
    const x = Math.min(position.x, window.innerWidth - rect.width - 8);
    const y = Math.min(position.y, window.innerHeight - rect.height - 8);
    setAdjustedPosition(new Vec2(Math.max(8, x), Math.max(8, y)));
  }, [filteredItems, position, visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    function close() {
      setItems([]);
      setPosition(null);
      setAdjustedPosition(null);
    }
    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        close();
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
      }
    }
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    window.addEventListener("blur", close);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("blur", close);
    };
  }, [visible]);

  if (!visible) {
    return null;
  }

  const menuPosition = adjustedPosition ?? position;

  return (
    <div className={layerStyle}>
      <ul
        className={menuStyle}
        ref={menuRef}
        style={{
          left: menuPosition?.x ?? 8,
          top: menuPosition?.y ?? 8,
        }}>
        {filteredItems.map((item, index) =>
          item.separate ? (
            <li className={separateStyle} key={`sep-${index}`} />
          ) : (
            <li key={`${item.label ?? "item"}-${index}`}>
              <button
                className={cx(itemStyle, item.disabled && disabledItemStyle)}
                disabled={item.disabled}
                onClick={() => {
                  setItems([]);
                  setPosition(null);
                  setAdjustedPosition(null);
                  item.click?.();
                }}
                type="button">
                {item.label}
              </button>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
