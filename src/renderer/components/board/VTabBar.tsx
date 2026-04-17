import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { css, cx } from "styled-system/css";

import { RPetaBoard } from "@/commons/datas/rPetaBoard";

const rootStyle = css({
  display: "flex",
  alignItems: "stretch",
  gap: "1px",
  minWidth: 0,
  overflowX: "auto",
  overflowY: "hidden",
  paddingRight: "px1",
});

const tabStyle = css({
  display: "flex",
  alignItems: "center",
  gap: "px1",
  minWidth: "120px",
  maxWidth: "220px",
  borderTopLeftRadius: "rounded",
  borderTopRightRadius: "rounded",
  backgroundColor: "surfaceMuted",
  paddingLeft: "px2",
  paddingRight: "px1",
});

const selectedStyle = css({
  backgroundColor: "surface",
});

const inputStyle = css({
  minWidth: 0,
  width: "100%",
  border: "none",
  backgroundColor: "transparent",
  color: "text",
  fontSize: "size0",
  outline: "none",
});

const buttonStyle = css({
  display: "grid",
  placeItems: "center",
  width: "24px",
  minWidth: "24px",
  height: "24px",
  border: "none",
  borderRadius: "rounded",
  backgroundColor: "transparent",
  color: "text",
  fontSize: "size1",
  _hover: {
    backgroundColor: "surfaceEmphasis",
  },
});

const removeButtonStyle = css({
  fontSize: "12px",
  lineHeight: 1,
});

export default function VTabBar({
  boards,
  currentPetaBoardId,
  onAdd,
  onRemove,
  onSelect,
  onUpdateBoard,
}: {
  boards: RPetaBoard[];
  currentPetaBoardId: string;
  onAdd: () => void;
  onRemove: (board: RPetaBoard) => void;
  onSelect: (board: RPetaBoard) => void;
  onUpdateBoard: (board: RPetaBoard) => void;
}) {
  const { t } = useTranslation();
  const selectedBoard = useMemo(
    () => boards.find((board) => board.id === currentPetaBoardId),
    [boards, currentPetaBoardId],
  );

  return (
    <div className={rootStyle}>
      {boards.map((board) => {
        const selected = board.id === currentPetaBoardId;
        return (
          <div
            className={cx(tabStyle, selected && selectedStyle)}
            key={board.id}
            onPointerDown={() => onSelect(board)}>
            <input
              className={inputStyle}
              defaultValue={board.name}
              key={`${board.id}:${board.name}`}
              onBlur={(event) => {
                const name = event.target.value.trim();
                if (name !== "" && name !== board.name) {
                  onUpdateBoard({
                    ...board,
                    name,
                  });
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  (event.currentTarget as HTMLInputElement).blur();
                }
              }}
            />
            {selectedBoard && boards.length > 1 && selected ? (
              <button
                aria-label={t("tab.menu.remove", [board.name])}
                className={cx(buttonStyle, removeButtonStyle)}
                onClick={(event) => {
                  event.stopPropagation();
                  onRemove(board);
                }}
                tabIndex={-1}
                type="button">
                ×
              </button>
            ) : null}
          </div>
        );
      })}
      <button className={buttonStyle} onClick={onAdd} tabIndex={-1} type="button">
        +
      </button>
    </div>
  );
}
