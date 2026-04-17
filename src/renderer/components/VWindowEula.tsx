import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";

import { EULA } from "@/commons/defines";
import { Settings } from "@/commons/datas/settings";

import { WindowScaffold } from "@/renderer/components/shared/WindowScaffold";
import { appButtonStyle } from "@/renderer/components/shared/controlStyles";
import { IPC } from "@/renderer/libs/ipc";

const bodyStyle = css({
  display: "block",
  userSelect: "text",
  whiteSpace: "pre-wrap",
});

const buttonsStyle = css({
  display: "flex",
  justifyContent: "center",
  flexWrap: "wrap",
  marginTop: "px2",
});

export default function VWindowEula() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    let mounted = true;
    void IPC.settings.get().then((value) => {
      if (mounted) {
        setSettings(value);
      }
    });

    const subscription = IPC.settings.on("update", (_event, value) => {
      setSettings(value);
    });

    return () => {
      mounted = false;
      subscription.off();
    };
  }, []);

  const needToAgree = useMemo(() => {
    return settings !== null ? settings.eula !== EULA : false;
  }, [settings]);

  return (
    <WindowScaffold>
      <div className={bodyStyle}>{t("eula.body")}</div>
      <div className={buttonsStyle}>
        {needToAgree ? (
          <>
            <button className={appButtonStyle} onClick={() => IPC.common.eula(true)} type="button">
              {t("eula.agree")}
            </button>
            <button className={appButtonStyle} onClick={() => IPC.common.eula(false)} type="button">
              {t("eula.disagree")}
            </button>
          </>
        ) : (
          <button className={appButtonStyle} onClick={() => IPC.windows.close()} type="button">
            {t("commons.closeButton")}
          </button>
        )}
      </div>
    </WindowScaffold>
  );
}
