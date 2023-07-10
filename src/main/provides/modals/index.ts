import { IpcMainInvokeEvent } from "electron";
import { v4 as uuid } from "uuid";

import { WINDOW_MODAL_UPDATE_INTERVAL } from "@/commons/defines";

import { createKey, createUseFunction } from "@/main/libs/di";
import { windowIs } from "@/main/provides/utils/windowIs";
import { EmitMainEventTargetType, useWindows } from "@/main/provides/windows";

export class Modals {
  orders: {
    id: string;
    label: string;
    items: string[];
    select: (index: number) => void;
  }[] = [];
  constructor() {
    setInterval(() => {
      if (this.orders.length < 1) {
        return;
      }
      const windows = useWindows();
      const modal = windows.windows.modal;
      if (windowIs.alive(modal) && modal?.isFocused()) {
        // モーダルにフォーカスが当たっていたら無視
        return;
      }
      const parent =
        windows.mainWindowName !== undefined ? windows.windows[windows.mainWindowName] : undefined;
      if (parent === undefined) {
        // 親がなかったら無視
        return;
      }
      if (!windowIs.alive(modal)) {
        // モーダルが死んでたら開く
        windows.openWindow("modal", parent, true);
        return;
      }
      if (modal === undefined || modal.getParentWindow() === parent) {
        // モーダルがundefinedか、親が同じなら無視
        return;
      }
      // フォーカス
      modal.focus();
    }, WINDOW_MODAL_UPDATE_INTERVAL);
  }
  async open(event: IpcMainInvokeEvent, label: string, items: string[]) {
    const windows = useWindows();
    return await new Promise<number>((res) => {
      const id = uuid();
      let selected = false;
      const modalData = {
        id,
        label,
        items,
        select: (index: number) => {
          if (selected) {
            return;
          }
          selected = true;
          res(index);
        },
      };
      this.orders.push(modalData);
      windows.emitMainEvent(
        { type: EmitMainEventTargetType.WINDOW_NAMES, windowNames: ["modal"] },
        "updateModalDatas",
      );
      windows.openWindow("modal", event, true);
      windows.windows.modal?.on("closed", () => {
        // this.select(modalData.id, -1);
      });
    });
  }
  async select(id: string, index: number) {
    const windows = useWindows();
    this.orders.find((modal) => modal.id === id)?.select(index);
    this.orders = this.orders.filter((modalData) => modalData.id !== id);
    windows.emitMainEvent(
      { type: EmitMainEventTargetType.WINDOW_NAMES, windowNames: ["modal"] },
      "updateModalDatas",
    );
    if (this.orders.length === 0 && windowIs.alive("modal")) {
      windows.windows.modal?.close();
    }
  }
  async getOrders() {
    return this.orders.map((modalData) => ({
      id: modalData.id,
      items: modalData.items,
      label: modalData.label,
    }));
  }
}

export const modalsKey = createKey<Modals>("modals");
export const useModals = createUseFunction(modalsKey);
