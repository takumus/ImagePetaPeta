import { throttle } from "throttle-debounce";

import { WindowName } from "@/commons/windows";

import { windowIs } from "@/main/provides/utils/windowIs";
import { useWindows } from "@/main/provides/windows";

export class PopupWindow {
  private visible = false;
  constructor(private name: WindowName) {
    setInterval(() => {
      const windows = useWindows();
      if (
        windowIs.alive(this.window) &&
        windows.mainWindowName !== undefined &&
        windows.windows[windows.mainWindowName] !== undefined &&
        this.window.getParentWindow() !== windows.windows[windows.mainWindowName]
      ) {
        this.window.setParentWindow(windows.windows[windows.mainWindowName]!);
      }
      this.setVisible(this.visible);
    }, 10);
  }
  setVisible = (visible: boolean) => {
    this.visible = visible;
    const windows = useWindows();
    if (visible) {
      const parent =
        windows.mainWindowName !== undefined ? windows.windows[windows.mainWindowName] : undefined;
      if (parent === undefined) {
        return;
      }
      if (windowIs.dead(this.window)) {
        windows.openWindow(this.name, parent).setSkipTaskbar(true);
      }
      if (windowIs.alive(this.window)) {
        this.window.show();
      }
    } else {
      if (this.window === undefined || windowIs.dead(this.window)) {
        return;
      }
      this.window.hide();
    }
  };
  get window() {
    return useWindows().windows[this.name];
  }
}
