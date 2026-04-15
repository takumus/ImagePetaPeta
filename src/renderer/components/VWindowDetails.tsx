import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";

import { PetaFile } from "@/commons/datas/petaFile";

import VProperty from "@/renderer/components/commons/property/VProperty";
import VHeaderBar from "@/renderer/components/commons/headerBar/VHeaderBar";
import VTitleBar from "@/renderer/components/commons/titleBar/VTitleBar";
import VDetails from "@/renderer/components/details/VDetails";
import { IPC } from "@/renderer/libs/ipc";
import { Keyboards } from "@/renderer/libs/keyboards";
import { useAppInfoStore } from "@/renderer/stores/appInfoStore/useAppInfoStore";
import { useWindowTitleStore } from "@/renderer/stores/windowTitleStore/useWindowTitleStore";

const rootStyle = css({
  position: "fixed",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  backgroundColor: "surface",
  color: "text",
});

const contentStyle = css({
  display: "flex",
  flex: 1,
  overflow: "hidden",
  padding: 0,
});

const boardStyle = css({
  flex: 1,
  overflow: "hidden",
});

const propertyStyle = css({
  zIndex: 1,
  width: "320px",
  borderLeftWidth: "window",
  borderLeftStyle: "solid",
  borderLeftColor: "border",
  backgroundColor: "surface",
  padding: "px2",
});

export default function VWindowDetails() {
  const { t } = useTranslation();
  const appInfoStore = useAppInfoStore();
  const { windowTitle } = useWindowTitleStore();
  const [petaFile, setPetaFile] = useState<PetaFile>();
  const appName = appInfoStore.state.value.name;
  const title = useMemo(() => t("titles.details"), [t]);

  useEffect(() => {
    windowTitle.value = `${title} - ${appName}`;
  }, [appName, title, windowTitle]);

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

  useEffect(() => {
    let mounted = true;
    void IPC.details.get().then((value) => {
      if (mounted) {
        setPetaFile(value);
      }
    });

    const detailsSubscription = IPC.common.on("detailsPetaFile", (_event, nextPetaFile) => {
      setPetaFile(nextPetaFile);
    });
    const petaFilesSubscription = IPC.petaFiles.on("update", (_event, updatedPetaFiles, mode) => {
      setPetaFile((current) => {
        if (current === undefined) {
          return current;
        }
        const next = updatedPetaFiles.find((item) => item.id === current.id);
        if (next !== undefined) {
          return next;
        }
        if (mode === "remove") {
          return undefined;
        }
        return current;
      });
    });

    return () => {
      mounted = false;
      detailsSubscription.off();
      petaFilesSubscription.off();
    };
  }, []);

  return (
    <div className={rootStyle}>
      <div>
        <VTitleBar title={title} />
        <VHeaderBar />
      </div>
      <div className={contentStyle}>
        <div className={boardStyle}>
          <VDetails petaFile={petaFile} />
        </div>
        <div className={propertyStyle}>
          <VProperty onPetaFileChange={setPetaFile} petaFile={petaFile} />
        </div>
      </div>
    </div>
  );
}
