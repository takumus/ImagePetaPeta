import { css } from "styled-system/css";

const rootStyle = css({
  width: "100%",
  height: "px3",
  overflow: "hidden",
  borderRadius: "window",
  backgroundColor: "text",
  padding: "2px",
});

const barStyle = css({
  height: "100%",
  borderRadius: "window",
  backgroundColor: "surface",
});

export default function VProgressBar({ progress }: { progress: number }) {
  return (
    <div className={rootStyle}>
      <div className={barStyle} style={{ width: `${progress}%` }} />
    </div>
  );
}
