import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";

import { URL_SUPPORT } from "@/commons/defines";

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

const preStyle = css({
  overflow: "hidden",
  fontSize: "size0",
  whiteSpace: "pre-wrap",
});

const leftAlignedPreStyle = css({
  textAlign: "left",
});

export default function VSettingsInfo() {
  const { t } = useTranslation();
  const appInfoStore = useAppInfoStore();
  const appInfo = appInfoStore.state.value;
  const [licenses, setLicenses] = useState<{ licenses: string; name: string; text: string }[]>([]);
  const [supporters, setSupporters] = useState<{ names: string[]; type: string }[]>([]);

  useEffect(() => {
    let mounted = true;
    void Promise.all([IPC.common.getLicenses(), IPC.common.getSupporters()]).then(
      ([licenseValues, supporterValues]) => {
        if (!mounted) {
          return;
        }
        setLicenses(licenseValues);
        setSupporters(
          Object.keys(supporterValues).map((type) => ({
            type,
            names: supporterValues[type],
          })),
        );
      },
    );
    return () => {
      mounted = false;
    };
  }, []);

  const supporterText = useMemo(
    () =>
      supporters
        .map((data) => `--${data.type}--\n${data.names.join("\n")}`)
        .join("\n\n"),
    [supporters],
  );

  const licenseText = useMemo(
    () => licenses.map((license) => `${license.name}\n${license.licenses}\n${license.text}`).join("\n"),
    [licenses],
  );

  function gotoGithub() {
    void IPC.common.openURL("https://github.com/takumus/ImagePetaPeta");
  }

  function gotoIssues() {
    void IPC.common.openURL(
      `${URL_SUPPORT}?usp=pp_url&entry.1709939184=${encodeURIComponent(appInfo.version)}`,
    );
  }

  function gotoIcons8() {
    void IPC.common.openURL("https://icons8.com/");
  }

  function showDBFolder() {
    void IPC.common.showDBFolder();
  }

  function showConfigFolder() {
    void IPC.common.showConfigFolder();
  }

  function showEULA() {
    void IPC.windows.open("eula");
  }

  return (
    <div className={rootStyle}>
      <p className={paragraphStyle}>
        {appInfo.name} {appInfo.version}
      </p>
      <p className={paragraphStyle}>Electron {appInfo.electronVersion}</p>
      <p className={paragraphStyle}>Chromium {appInfo.chromiumVersion}</p>
      <p className={paragraphStyle}>Node.js {appInfo.nodeVersion}</p>
      <button className={appButtonStyle} onClick={gotoGithub} type="button">
        {t("info.githubButton")}
      </button>
      <button className={appButtonStyle} onClick={gotoIssues} type="button">
        {t("info.issuesButton")}
      </button>
      <p />
      <button className={appButtonStyle} onClick={showDBFolder} type="button">
        {t("info.dbFolderButton")}
      </button>
      <button className={appButtonStyle} onClick={showConfigFolder} type="button">
        {t("info.configFolderButton")}
      </button>
      <p />
      <button className={appButtonStyle} onClick={showEULA} type="button">
        {t("info.showEULAButton")}
      </button>
      <p className={paragraphStyle}>{t("info.assets")}</p>
      <button className={appButtonStyle} onClick={gotoIcons8} type="button">
        Icons8.com
      </button>
      <p className={paragraphStyle}>{t("info.supporters")}</p>
      <pre className={preStyle}>{supporterText}</pre>
      <p className={paragraphStyle}>{t("info.licenses")}</p>
      <pre className={`${preStyle} ${leftAlignedPreStyle}`}>{licenseText}</pre>
    </div>
  );
}
