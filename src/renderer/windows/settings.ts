import SettingsIndex from "@/renderer/components/VWSettings.vue";
import { create } from "@/renderer/windows/@base";
import { WindowType } from "@/commons/datas/windowType";
create(SettingsIndex, WindowType.SETTINGS);
