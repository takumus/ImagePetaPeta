export type Style = {
  "--color-0": string;
  "--color-0-floating": string;
  "--color-1": string;
  "--color-2": string;
  "--color-accent-1": string;
  "--color-accent-2": string;
  "--color-border": string;
  "--color-overlay": string;
  "--color-font": string;
  "--filter-icon": string;
  "--shadow": string;
  "--floating-shadow": string;
  "--shadow-small": string;
  "--color-checkbox-false-background": string;
  "--color-checkbox-false-circle": string;
  "--color-checkbox-true-background": string;
  "--color-checkbox-true-circle": string;
};
export const defaultStyles = {
  dark: {
    "--color-0": "#141414",
    "--color-0-floating": "#1b1b1b",
    "--color-1": "#272727",
    "--color-2": "#343434",
    "--color-accent-1": "rgb(41, 85, 112)",
    "--color-accent-2": "#9cdcfe",
    "--color-border": "#5c5c5c",
    "--color-overlay": "#ffffff30",
    "--color-font": "#d3d3d3",
    "--filter-icon": "unset",
    "--shadow": "0px 0px var(--px-1) var(--px-2) rgba(0, 0, 0, 0.5)",
    "--floating-shadow": "1px 1px 5px rgba(0, 0, 0, 0.7)",
    "--shadow-small": "0px 1px 2px 0px rgba(0, 0, 0, 0.5)",
    "--color-checkbox-false-background": "var(--color-2)",
    "--color-checkbox-false-circle": "var(--color-font)",
    "--color-checkbox-true-background": "var(--color-accent-1)",
    "--color-checkbox-true-circle": "var(--color-font)",
  } as Style,
  light: {
    "--color-0": "#ffffff",
    "--color-0-floating": "#ffffff",
    "--color-1": "#f4f4f4",
    "--color-2": "#dedede",
    "--color-accent-1": "#bcdcff",
    "--color-accent-2": "#afd7ff",
    "--color-border": "#999999",
    "--color-overlay": "#00000070",
    "--color-font": "#1a1a1a",
    "--filter-icon": "brightness(0.7) invert(100%)",
    "--shadow": "0px 0px var(--px-1) var(--px-2) rgba(0, 0, 0, 0.3)",
    "--floating-shadow": "1px 1px 5px rgba(0, 0, 0, 0.3)",
    "--shadow-small": "0px 1px 2px 0px rgba(0, 0, 0, 0.3)",
    "--color-checkbox-false-background": "var(--color-2)",
    "--color-checkbox-false-circle": "var(--color-0)",
    "--color-checkbox-true-background": "var(--color-accent-2)",
    "--color-checkbox-true-circle": "var(--color-0)",
  },
};
export function applyStyle(style: Style) {
  const root = document.body;
  Object.keys(style).forEach((key) => {
    root.style.setProperty(key, (style as { [key: string]: string })[key]);
  });
}
