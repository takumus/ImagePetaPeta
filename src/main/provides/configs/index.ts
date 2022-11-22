import { DBInfo } from "@/commons/datas/dbInfo";
import { Settings } from "@/commons/datas/settings";
import { States } from "@/commons/datas/states";
import { WindowStates } from "@/commons/datas/windowStates";

import Config from "@/main/libs/config";
import { createKey, createUseFunction } from "@/main/libs/di";

export const configDBInfoKey = createKey<Config<DBInfo>>("configDBInfo");
export const configSettingsKey = createKey<Config<Settings>>("configSettings");
export const configStatesKey = createKey<Config<States>>("configStates");
export const configWindowStatesKey = createKey<Config<WindowStates>>("configWindowStates");
export const useConfigDBInfo = createUseFunction(configDBInfoKey);
export const useConfigSettings = createUseFunction(configSettingsKey);
export const useConfigStates = createUseFunction(configStatesKey);
export const useConfigWindowStates = createUseFunction(configWindowStatesKey);
