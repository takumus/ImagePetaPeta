import { defineConfig } from "@pandacss/dev";

import { sizeStyles } from "./src/renderer/styles/styles";

export default defineConfig({
  include: ["./src/**/*.{ts,tsx,js,jsx}"],
  exclude: [],
  outdir: "styled-system",
  preflight: false,
  theme: {
    extend: {
      tokens: {
        spacing: {
          px0: { value: sizeStyles["--px-0"] },
          px1: { value: sizeStyles["--px-1"] },
          px2: { value: sizeStyles["--px-2"] },
          px3: { value: sizeStyles["--px-3"] },
          px4: { value: sizeStyles["--px-4"] },
        },
        sizes: {
          tabHeight: { value: sizeStyles["--tab-height"] },
          topDraggableHeight: { value: sizeStyles["--top-draggable-height"] },
        },
        radii: {
          window: { value: sizeStyles["--rounded"] },
          circle: { value: sizeStyles["--rounded-circle"] },
        },
        fontSizes: {
          size0: { value: sizeStyles["--size-0"] },
          size1: { value: sizeStyles["--size-1"] },
          size2: { value: sizeStyles["--size-2"] },
        },
        borderWidths: {
          window: { value: sizeStyles["--px-border"] },
        },
        shadows: {
          window: { value: "var(--shadow)" },
          floating: { value: "var(--shadow-floating)" },
          small: { value: "var(--shadow-small)" },
        },
      },
      semanticTokens: {
        colors: {
          surface: { value: "var(--color-0)" },
          surfaceFloating: { value: "var(--color-0-floating)" },
          surfaceMuted: { value: "var(--color-1)" },
          surfaceEmphasis: { value: "var(--color-2)" },
          accent: { value: "var(--color-accent-1)" },
          accentStrong: { value: "var(--color-accent-2)" },
          border: { value: "var(--color-border)" },
          overlay: { value: "var(--color-overlay)" },
          text: { value: "var(--color-font)" },
          checkboxFalseBackground: { value: "var(--color-checkbox-false-background)" },
          checkboxFalseCircle: { value: "var(--color-checkbox-false-circle)" },
          checkboxTrueBackground: { value: "var(--color-checkbox-true-background)" },
          checkboxTrueCircle: { value: "var(--color-checkbox-true-circle)" },
          windowButton: { value: "var(--color-window-button)" },
          closeHover: { value: "var(--window-buttons-close-hover)" },
        },
      },
    },
  },
  globalCss: {
    "*, *::before, *::after": {
      boxSizing: "border-box",
    },
    "html, body, #app": {
      margin: 0,
      padding: 0,
      width: "100%",
      height: "100%",
      overflow: "hidden",
      backgroundColor: "surface",
      color: "text",
      fontSize: "12px",
      lineHeight: "12px",
      fontFamily:
        '"Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif',
      userSelect: "none",
    },
    "::-webkit-scrollbar": {
      width: sizeStyles["--px-3"],
    },
    "::-webkit-scrollbar-thumb": {
      minHeight: sizeStyles["--px-4"],
      border: "solid var(--px-1) rgba(0, 0, 0, 0)",
      borderRadius: "9999px",
      backgroundColor: "border",
      backgroundClip: "padding-box",
    },
    "#initialization": {
      display: "flex",
      position: "absolute",
      top: 0,
      left: 0,
      zIndex: 100,
      flexDirection: "column",
      width: "100%",
      height: "100%",
      overflow: "hidden",
      padding: "64px",
    },
    "#initialization > #initialization-title": {
      fontSize: "1.5em",
      lineHeight: "1.5em",
    },
    "#initialization > #initialization-log": {
      flex: 1,
      width: "100%",
      overflowY: "scroll",
      whiteSpace: "pre-wrap",
      wordWrap: "break-word",
    },
  },
});
