import { PetaPanel } from "@/commons/datas/petaPanel";
export interface RPetaPanel extends PetaPanel {
  renderer: {
    selected: boolean;
  };
}
