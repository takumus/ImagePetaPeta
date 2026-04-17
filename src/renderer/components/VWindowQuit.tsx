import { useTranslation } from "react-i18next";

import { WindowScaffold } from "@/renderer/components/shared/WindowScaffold";

export default function VWindowQuit() {
  const { t } = useTranslation();
  return <WindowScaffold hideControls>{t("quit.quitting")}</WindowScaffold>;
}
