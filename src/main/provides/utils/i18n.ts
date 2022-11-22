import { DateTimeFormat, NumberFormat } from "@intlify/core-base";
import { I18n } from "vue-i18n";

import languages from "@/commons/languages";

import { createKey, createUseFunction } from "@/main/utils/di";

export const i18nKey =
  createKey<I18n<typeof languages, DateTimeFormat, NumberFormat, string, true>>("i18n");
export const useI18n = createUseFunction(i18nKey);
