import languages from "@/commons/languages";
import { createKey } from "@/main/utils/di";
import { I18n } from "vue-i18n";
import { DateTimeFormat, NumberFormat } from "@intlify/core-base";
export const i18nKey =
  createKey<I18n<typeof languages, DateTimeFormat, NumberFormat, string, true>>("i18n");
