import { InjectionKey, reactive } from "vue";

import { Vec2 } from "@/commons/utils/vec2";

import { ContextMenuItem } from "@/renderer/components/commons/utils/contextMenu/contextMenuItem";

export async function createComponentsStore() {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const components: any = {
    contextMenu: {},
    tooltip: {},
    modal: {
      modalIds: [],
      currentModalZIndex: 1,
    },
  };
  return reactive(components as Components);
}
export type ComponentsStore = Awaited<ReturnType<typeof createComponentsStore>>;
export const componentsStoreKey: InjectionKey<ComponentsStore> = Symbol("componentsStore");
interface Components {
  contextMenu: {
    open: (items: ContextMenuItem[], position: Vec2) => void;
  };
  tooltip: {
    open: (label: string, event: PointerEvent) => void;
  };
  modal: {
    modalIds: string[];
    currentModalZIndex: number;
  };
}
