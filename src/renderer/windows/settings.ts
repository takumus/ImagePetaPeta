import SettingsIndex from "@/renderer/components/VWSettings.vue";

import { WindowType } from "@/commons/datas/windowType";

import { create } from "@/renderer/windows/@base";

create(SettingsIndex, WindowType.SETTINGS);
