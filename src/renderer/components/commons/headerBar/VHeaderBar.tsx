import { PropsWithChildren, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { css, cx } from "styled-system/css";

import BrowserIcon from "@/_public/images/icons/browser.png";
import BoardIcon from "@/_public/images/icons/board.png";
import ImportFileIcon from "@/_public/images/icons/importFile.png";
import ImportFolderIcon from "@/_public/images/icons/importFolder.png";
import NSFWIcon from "@/_public/images/icons/nsfw.png";
import SettingsIcon from "@/_public/images/icons/settings.png";
import SFWIcon from "@/_public/images/icons/sfw.png";
import WebIcon from "@/_public/images/icons/web.png";
import { Settings } from "@/commons/datas/settings";

import { appButtonStyle } from "@/renderer/components/shared/controlStyles";
import { IPC } from "@/renderer/libs/ipc";
import { useWindowNameStore } from "@/renderer/stores/windowNameStore/useWindowNameStore";

const rootStyle = css({
  position: "relative",
  zIndex: 2,
  display: "block",
  width: "100%",
  minHeight: "30px",
  backgroundColor: "surface",
});

const shadowStyle = css({
  boxShadow: "0px 1px 1px 0px rgba(0, 0, 0, 0.3)",
});

const leftGroupStyle = css({
  position: "absolute",
  top: 0,
  left: 0,
  display: "flex",
  height: "100%",
  padding: "px1",
  gap: "px1",
});

const rightGroupStyle = css({
  position: "absolute",
  top: 0,
  right: 0,
  display: "flex",
  height: "100%",
  padding: "px1",
  gap: "px1",
});

const propertyStyle = css({
  display: "block",
});

const iconButtonStyle = css({
  minWidth: "24px",
  height: "100%",
  margin: 0,
  border: "none",
  padding: 0,
  backgroundColor: "transparent",
});

const iconStyle = css({
  display: "block",
  width: "100%",
  height: "100%",
  backgroundPosition: "center center",
  backgroundRepeat: "no-repeat",
  backgroundSize: "14px",
  filter: "var(--filter-icon)",
});

export default function VHeaderBar({ children }: PropsWithChildren) {
  const { t } = useTranslation();
  const { windowName } = useWindowNameStore();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [showNSFW, setShowNSFW] = useState(false);

  useEffect(() => {
    let mounted = true;
    void IPC.settings.get().then((value) => {
      if (mounted) {
        setSettings(value);
      }
    });
    void IPC.nsfw.get().then((value) => {
      if (mounted) {
        setShowNSFW(value);
      }
    });

    const settingsSubscription = IPC.settings.on("update", (_event, value) => {
      setSettings(value);
    });
    const nsfwSubscription = IPC.common.on("showNSFW", (_event, value) => {
      setShowNSFW(value);
    });

    return () => {
      mounted = false;
      settingsSubscription.off();
      nsfwSubscription.off();
    };
  }, []);

  const visible = useMemo(() => {
    return (
      windowName.value === "board" ||
      windowName.value === "details" ||
      windowName.value === "browser" ||
      windowName.value === "capture"
    );
  }, [windowName.value]);

  async function toggleNSFW() {
    if (!showNSFW) {
      const result = await IPC.modals.open(t("utilsBar.nsfwConfirm"), [
        t("commons.yes"),
        t("commons.no"),
      ]);
      if (result === 0) {
        await IPC.nsfw.set(true);
      }
    } else {
      await IPC.nsfw.set(false);
    }
  }

  return (
    <div className={cx(rootStyle, windowName.value === "board" && shadowStyle)}>
      <div className={propertyStyle}>{children}</div>
      {visible ? (
        <>
          <div className={leftGroupStyle}>
            {windowName.value !== "board" ? (
              <HeaderButton icon={BoardIcon} onClick={() => IPC.windows.open("board")} />
            ) : null}
            {windowName.value !== "browser" ? (
              <HeaderButton icon={BrowserIcon} onClick={() => IPC.windows.open("browser")} />
            ) : null}
            {windowName.value !== "details" ? (
              <HeaderButton icon={ImportFileIcon} onClick={() => IPC.importer.browse("files")} />
            ) : null}
            {windowName.value !== "details" ? (
              <HeaderButton
                icon={ImportFolderIcon}
                onClick={() => IPC.importer.browse("directories")}
              />
            ) : null}
            {windowName.value !== "details" && settings?.web ? (
              <HeaderButton icon={WebIcon} onClick={() => IPC.windows.open("web")} />
            ) : null}
          </div>
          <div className={rightGroupStyle}>
            <HeaderButton icon={showNSFW ? NSFWIcon : SFWIcon} onClick={() => void toggleNSFW()} />
            <HeaderButton icon={SettingsIcon} onClick={() => IPC.windows.open("settings")} />
          </div>
        </>
      ) : null}
    </div>
  );

  function HeaderButton({ icon, onClick }: { icon: string; onClick: () => void }) {
    return (
      <button className={cx(appButtonStyle, iconButtonStyle)} onClick={onClick} tabIndex={-1} type="button">
        <span className={iconStyle} style={{ backgroundImage: `url(${icon})` }} />
      </button>
    );
  }
}
