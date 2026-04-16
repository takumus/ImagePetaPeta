import { css, cx } from "styled-system/css";

import { RPetaBoard } from "@/commons/datas/rPetaBoard";

const rootStyle = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "px1",
  width: "100%",
  height: "100%",
  paddingX: "px2",
});

const buttonStyle = css({
  minWidth: "56px",
  height: "24px",
  borderWidth: "window",
  borderStyle: "solid",
  borderColor: "border",
  borderRadius: "rounded",
  backgroundColor: "surface",
  color: "text",
  fontSize: "size0",
});

const inputStyle = css({
  width: "32px",
  height: "24px",
  border: "none",
  backgroundColor: "transparent",
  padding: 0,
});

export default function VBoardProperty({
  board,
  onUpdate,
}: {
  board: RPetaBoard;
  onUpdate: (board: RPetaBoard) => void;
}) {
  return (
    <div className={rootStyle}>
      <button
        className={buttonStyle}
        onClick={() =>
          onUpdate({
            ...board,
            transform: {
              ...board.transform,
              scale: 1,
            },
          })
        }
        tabIndex={-1}
        type="button">
        {board.transform.scale.toFixed(2)}x
      </button>
      <input
        aria-label="board fill color"
        className={cx(buttonStyle, inputStyle)}
        onChange={(event) =>
          onUpdate({
            ...board,
            background: {
              ...board.background,
              fillColor: event.target.value,
            },
          })
        }
        tabIndex={-1}
        type="color"
        value={board.background.fillColor}
      />
      <input
        aria-label="board line color"
        className={cx(buttonStyle, inputStyle)}
        onChange={(event) =>
          onUpdate({
            ...board,
            background: {
              ...board.background,
              lineColor: event.target.value,
            },
          })
        }
        tabIndex={-1}
        type="color"
        value={board.background.lineColor}
      />
    </div>
  );
}
