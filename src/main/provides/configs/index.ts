import { DBInfo } from "@/commons/datas/dbInfo";
import { Libraries } from "@/commons/datas/libraries";
import { Library } from "@/commons/datas/library";
import { Settings } from "@/commons/datas/settings";
import { States } from "@/commons/datas/states";
import { WindowStates } from "@/commons/datas/windowStates";

import Config from "@/main/libs/config";
import { createKey, createUseFunction } from "@/main/libs/di";
import { ConfigSecureFilePassword } from "@/main/provides/configs/secureFilePassword";

export const configLibraryKey = createKey<Config<Library>>("configLibrary");
export const configDBInfoKey = createKey<Config<DBInfo>>("configDBInfo");
export const configSettingsKey = createKey<Config<Settings>>("configSettings");
export const configLibrariesKey = createKey<Config<Libraries>>("configLibraries");
export const configStatesKey = createKey<Config<States>>("configStates");
export const configWindowStatesKey = createKey<Config<WindowStates>>("configWindowStates");
export const configSecureFilePasswordKey = createKey<ConfigSecureFilePassword>(
  "configSecureFilePassword",
);
export const useConfigLibrary = createUseFunction(configLibraryKey);
export const useConfigDBInfo = createUseFunction(configDBInfoKey);
export const useConfigSettings = createUseFunction(configSettingsKey);
export const useConfigLibraries = createUseFunction(configLibrariesKey);
export const useConfigStates = createUseFunction(configStatesKey);
export const useConfigWindowStates = createUseFunction(configWindowStatesKey);
export const useConfigSecureFilePassword = createUseFunction(configSecureFilePasswordKey);
