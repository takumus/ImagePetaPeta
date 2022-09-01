export function resizeImage(
  width: number,
  height: number,
  size: number,
  resizeTo: "width" | "height",
) {
  if (resizeTo === "width") {
    return {
      width: size,
      height: (size / width) * height,
    };
  } else {
    return {
      width: (size / height) * width,
      height: size,
    };
  }
}
