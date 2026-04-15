import { useEffect, useMemo, useState } from "react";
import { css } from "styled-system/css";

import VTitleBar from "@/renderer/components/commons/titleBar/VTitleBar";
import { appButtonStyle } from "@/renderer/components/shared/controlStyles";
import { IPC } from "@/renderer/libs/ipc";
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
  flexDirection: "column",
  padding: "px2",
});

const bodyStyle = css({
  display: "flex",
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
  overflowY: "auto",
  whiteSpace: "pre-wrap",
  textAlign: "center",
  userSelect: "text",
});

const buttonsStyle = css({
  display: "flex",
  justifyContent: "center",
  flexWrap: "wrap",
  paddingBottom: "px2",
});

type ModalData = {
  id: string;
  label: string;
  items: string[];
};

export default function VWindowModal() {
  const { windowTitle } = useWindowTitleStore();
  const [modalDatas, setModalDatas] = useState<ModalData[]>([]);

  useEffect(() => {
    windowTitle.value = "";
  }, [windowTitle]);

  useEffect(() => {
    let mounted = true;
    const refresh = async () => {
      const datas = await IPC.modals.getAll();
      if (mounted) {
        setModalDatas(datas);
      }
    };

    void refresh();
    const subscription = IPC.modals.on("update", () => {
      void refresh();
    });

    return () => {
      mounted = false;
      subscription.off();
    };
  }, []);

  const modalData = useMemo(() => modalDatas[0], [modalDatas]);

  async function select(index: number) {
    if (modalData === undefined) {
      return;
    }
    await IPC.modals.select(modalData.id, index);
  }

  return (
    <div className={rootStyle}>
      <div>
        <VTitleBar hideControls title="" />
      </div>
      {modalData ? (
        <div className={contentStyle}>
          <div className={bodyStyle}>{modalData.label}</div>
          <div className={buttonsStyle}>
            {modalData.items.map((item, index) => (
              <button
                className={appButtonStyle}
                key={`${modalData.id}-${index}`}
                onClick={() => void select(index)}
                type="button">
                {item}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
