import VBrowser from "@/renderer/components/browser/VBrowser";
import VHeaderBar from "@/renderer/components/commons/headerBar/VHeaderBar";
import { WindowScaffold } from "@/renderer/components/shared/WindowScaffold";

export default function VWindowBrowser() {
  return (
    <WindowScaffold>
      <VHeaderBar />
      <VBrowser />
    </WindowScaffold>
  );
}
