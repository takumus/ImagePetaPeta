import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { css, cx } from "styled-system/css";

import { Settings } from "@/commons/datas/settings";

import VSettingsBrowser from "@/renderer/components/settings/VSettingsBrowser";
import VSettingsControl from "@/renderer/components/settings/VSettingsControl";
import VSettingsDatas from "@/renderer/components/settings/VSettingsDatas";
import VSettingsGeneral from "@/renderer/components/settings/VSettingsGeneral";
import VSettingsInfo from "@/renderer/components/settings/VSettingsInfo";
import VSettingsOthers from "@/renderer/components/settings/VSettingsOthers";
import VSettingsUpdate from "@/renderer/components/settings/VSettingsUpdate";
import VSettingsWeb from "@/renderer/components/settings/VSettingsWeb";
import { IPC } from "@/renderer/libs/ipc";

const rootStyle = css({
  display: "flex",
  flexDirection: "row",
  height: "100%",
  overflow: "hidden",
});

const categoriesStyle = css({
  paddingRight: "px2",
});

const categoryStyle = css({
  display: "block",
  marginBottom: "px2",
  cursor: "pointer",
});

const selectedCategoryStyle = css({
  textDecoration: "underline",
});

const contentsStyle = css({
  flex: 1,
  overflowX: "hidden",
  overflowY: "auto",
});

const tabNames = [
  "general",
  "control",
  "browser",
  "datas",
  "web",
  "others",
  "update",
  "info",
] as const;

type TabName = (typeof tabNames)[number];

export default function VSettings() {
  const { t } = useTranslation();
  const [currentTab, setCurrentTab] = useState<TabName>("general");
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    let mounted = true;
    void IPC.settings.get().then((value) => {
      if (mounted) {
        setSettings(value);
      }
    });

    const settingsSubscription = IPC.settings.on("update", (_event, value) => {
      setSettings(value);
    });
    const latestVersionSubscription = IPC.common.on("foundLatestVersion", () => {
      setCurrentTab("update");
    });

    void IPC.common.getLatestVersion().then((remoteBinaryInfo) => {
      if (!remoteBinaryInfo.isLatest) {
        setCurrentTab("update");
      }
    });

    return () => {
      mounted = false;
      settingsSubscription.off();
      latestVersionSubscription.off();
    };
  }, []);

  async function updateSettings(nextSettings: Settings) {
    setSettings(nextSettings);
    await IPC.settings.update(nextSettings);
  }

  const content = useMemo(() => {
    if (settings === null) {
      return null;
    }
    const onSettingsChange = (next: Settings) => void updateSettings(next);
    if (currentTab === "general") {
      return <VSettingsGeneral onSettingsChange={onSettingsChange} settings={settings} />;
    }
    if (currentTab === "control") {
      return <VSettingsControl onSettingsChange={onSettingsChange} settings={settings} />;
    }
    if (currentTab === "browser") {
      return <VSettingsBrowser onSettingsChange={onSettingsChange} settings={settings} />;
    }
    if (currentTab === "datas") {
      return <VSettingsDatas onSettingsChange={onSettingsChange} settings={settings} />;
    }
    if (currentTab === "web") {
      return <VSettingsWeb onSettingsChange={onSettingsChange} settings={settings} />;
    }
    if (currentTab === "others") {
      return <VSettingsOthers onSettingsChange={onSettingsChange} settings={settings} />;
    }
    if (currentTab === "update") {
      return <VSettingsUpdate />;
    }
    return <VSettingsInfo />;
  }, [currentTab, settings]);

  return (
    <div className={rootStyle}>
      <div className={categoriesStyle}>
        {tabNames.map((tab) => (
          <div
            className={cx(categoryStyle, currentTab === tab && selectedCategoryStyle)}
            key={tab}
            onClick={() => setCurrentTab(tab)}>
            {t(`settings.${tab}`)}
          </div>
        ))}
      </div>
      <div className={contentsStyle}>{content}</div>
    </div>
  );
}
