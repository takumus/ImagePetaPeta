import { IpcMainInvokeEvent } from "electron";
import { v4 as uuid } from "uuid";

import { createKey, createUseFunction } from "@/main/libs/di";
import { EmitMainEventTargetType, useWindows } from "@/main/provides/windows";
import { PopupWindow } from "@/main/provides/windows/popup";

export class Modals {
  orders: {
    id: string;
    label: string;
    items: string[];
    select: (index: number) => void;
  }[] = [];
  popup: PopupWindow;
  constructor() {
    this.popup = new PopupWindow("modal");
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
        { type: "windowNames", windowNames: ["modal"] },
        "common",
        "updateModalDatas",
      );
      this.popup.setVisible(true);
    });
  }
  async select(id: string, index: number) {
    const windows = useWindows();
    this.orders.find((modal) => modal.id === id)?.select(index);
    this.orders = this.orders.filter((modalData) => modalData.id !== id);
    windows.emitMainEvent(
      { type: "windowNames", windowNames: ["modal"] },
      "common",
      "updateModalDatas",
    );
    if (this.orders.length === 0) {
      this.popup.setVisible(false);
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
