import { PetaBoard } from "@/commons/datas/petaBoard";
import { RPetaPanel } from "@/commons/datas/rPetaPanel";
export interface RPetaBoard extends PetaBoard {
  petaPanels: { [petaPanelId: string]: RPetaPanel };
}
