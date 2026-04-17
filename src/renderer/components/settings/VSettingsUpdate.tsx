import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";

import { URL_DOWNLOAD } from "@/commons/defines";

import { appButtonStyle } from "@/renderer/components/shared/controlStyles";
import { IPC } from "@/renderer/libs/ipc";
import { useAppInfoStore } from "@/renderer/stores/appInfoStore/useAppInfoStore";

const rootStyle = css({
  display: "block",
  textAlign: "center",
});

const paragraphStyle = css({
  fontSize: "size1",
  wordBreak: "break-word",
});

export default function VSettingsUpdate() {
  const { t } = useTranslation();
  const appInfoStore = useAppInfoStore();
  const appInfo = appInfoStore.state.value;
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [latestVersion, setLatestVersion] = useState("1.1.1");

  useEffect(() => {
    void checkUpdate();
  }, []);

  async function checkUpdate() {
    const remoteBinaryInfo = await IPC.common.getLatestVersion();
    setLatestVersion(remoteBinaryInfo.version);
    setUpdateAvailable(!remoteBinaryInfo.isLatest);
  }

  function downloadUpdate() {
    void IPC.common.openURL(`${URL_DOWNLOAD}${latestVersion}`);
  }

  function releaseNote() {
    void IPC.common.openURL(`${URL_DOWNLOAD}${appInfo.version}`);
  }

  return (
    <div className={rootStyle}>
      {updateAvailable ? (
        <div>
          <p className={paragraphStyle}>{t("settings.updateAvailable")}</p>
          <p className={paragraphStyle}>
            {t("settings.currentVersion")}: {appInfo.version}
          </p>
          <p className={paragraphStyle}>
            {t("settings.latestVersion")}: {latestVersion}
          </p>
          <p>
            <button className={appButtonStyle} onClick={downloadUpdate} type="button">
              {t("settings.updateButton")}
            </button>
          </p>
        </div>
      ) : (
        <div>
          <p className={paragraphStyle}>{t("settings.thisIsLatest")}</p>
          <p className={paragraphStyle}>
            {t("settings.currentVersion")}: {appInfo.version}
          </p>
          <p>
            <button className={appButtonStyle} onClick={releaseNote} type="button">
              {t("settings.releaseNoteButton")}
            </button>
          </p>
        </div>
      )}
      <button className={appButtonStyle} onClick={() => void checkUpdate()} type="button">
        {t("settings.checkUpdateButton")}
      </button>
    </div>
  );
}
