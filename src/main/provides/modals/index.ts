import { IpcMainInvokeEvent } from "electron";
import { v4 as uuid } from "uuid";

import { createKey, createUseFunction } from "@/main/libs/di";
import { EmitMainEventTargetType, useWindows } from "@/main/provides/windows";

export class Modals {
  orders: {
    id: string;
    label: string;
    items: string[];
    select: (index: number) => void;
  }[] = [];
  constructor() {
    //
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
        this.select(modalData.id, -1);
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
    if (
      this.orders.length === 0 &&
      windows.windows.modal !== undefined &&
      !windows.windows.modal.isDestroyed()
    ) {
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
