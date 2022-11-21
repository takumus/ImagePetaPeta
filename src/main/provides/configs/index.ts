import { DBInfo } from "@/commons/datas/dbInfo";
import { Settings } from "@/commons/datas/settings";
import { States } from "@/commons/datas/states";
import { WindowStates } from "@/commons/datas/windowStates";
import Config from "@/main/storages/config";
import { createKey } from "@/main/utils/di";

export const configDBInfoKey = createKey<Config<DBInfo>>("configDBInfo");
export const configSettingsKey = createKey<Config<Settings>>("configSettings");
export const configStatesKey = createKey<Config<States>>("configStates");
export const configWindowStatesKey = createKey<Config<WindowStates>>("configWindowStates");
