import { useEffect } from "react";

import { WindowScaffold } from "@/renderer/components/shared/WindowScaffold";
import { IPC } from "@/renderer/libs/ipc";
import { Keyboards } from "@/renderer/libs/keyboards";

export default function VWindowLibraries() {
  useEffect(() => {
    const keyboards = new Keyboards();
    keyboards.enabled = true;
    keyboards.keys("Escape").up(() => {
      void IPC.windows.close();
    });
    return () => {
      keyboards.destroy();
    };
  }, []);

  return <WindowScaffold>lib!</WindowScaffold>;
}
