import VCapture from "@/renderer/components/capture/VCapture";
import VHeaderBar from "@/renderer/components/commons/headerBar/VHeaderBar";
import { WindowScaffold } from "@/renderer/components/shared/WindowScaffold";

export default function VWindowCapture() {
  return (
    <WindowScaffold>
      <VHeaderBar />
      <VCapture />
    </WindowScaffold>
  );
}
