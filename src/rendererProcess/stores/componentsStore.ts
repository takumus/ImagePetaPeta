import { InjectionKey, reactive } from "vue";
import { inject } from "@/rendererProcess/utils/vue";
import { ContextMenuItem } from "@/rendererProcess/components/utils/contextMenuItem";
import { Vec2 } from "@/commons/utils/vec2";

export async function createComponentsStore() {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const components: any = {
    contextMenu: {},
    complement: {},
    dialog: {},
    modal: {
      modalIds: [],
      currentModalZIndex: 1,
    },
  };
  return reactive(components as Components);
}
export function useComponentsStore() {
  return inject(componentsStoreKey);
}
export type ComponentsStore = Awaited<ReturnType<typeof createComponentsStore>>;
export const componentsStoreKey: InjectionKey<ComponentsStore> = Symbol("componentsStore");
interface Components {
  contextMenu: {
    open: (items: ContextMenuItem[], position: Vec2) => void;
  };
  complement: {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    open: (element: any, items: string[]) => void;
    updateItems: (items: string[]) => void;
  };
  dialog: {
    show: (label: string, items: string[]) => Promise<number>;
  };
  modal: {
    modalIds: string[];
    currentModalZIndex: number;
  };
}
