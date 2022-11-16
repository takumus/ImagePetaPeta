import { InjectionKey, reactive } from "vue";
import { ContextMenuItem } from "@/renderer/components/utils/contextMenuItem";
import { Vec2 } from "@/commons/utils/vec2";

export async function createComponentsStore() {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const components: any = {
    contextMenu: {},
    dialog: {},
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
  dialog: {
    show: (label: string, items: string[]) => Promise<number>;
  };
  modal: {
    modalIds: string[];
    currentModalZIndex: number;
  };
}
