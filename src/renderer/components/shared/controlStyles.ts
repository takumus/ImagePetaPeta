import { css } from "styled-system/css";

export const appButtonStyle = css({
  display: "inline-block",
  margin: "px1",
  overflow: "hidden",
  borderWidth: "window",
  borderStyle: "solid",
  borderColor: "border",
  borderRadius: "window",
  backgroundColor: "surface",
  paddingX: "px3",
  paddingY: "px1",
  color: "text",
  cursor: "pointer",
  textOverflow: "ellipsis",
  fontSize: "size1",
  lineHeight: "size1",
  outline: "none",
  _hover: {
    backgroundColor: "surfaceEmphasis",
  },
  _active: {
    backgroundColor: "surfaceEmphasis",
  },
  _focusVisible: {
    borderColor: "accent",
  },
  _disabled: {
    cursor: "not-allowed",
    opacity: 0.56,
  },
});

export const textInputStyle = css({
  width: "100%",
  borderWidth: "window",
  borderStyle: "solid",
  borderColor: "border",
  borderRadius: "window",
  backgroundColor: "surface",
  paddingX: "px2",
  paddingY: "px1",
  color: "text",
  fontSize: "size1",
  lineHeight: "size1",
  outline: "none",
  _focusVisible: {
    borderColor: "accent",
  },
});
