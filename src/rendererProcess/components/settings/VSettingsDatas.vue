<template>
  <t-settings-content-root>
    <button @click="browsePetaImageDirectory">
      {{ t("settings.browsePetaImageDirectoryButton") }}</button
    ><br />
    <VTextarea
      :type="'single'"
      :clickToEdit="true"
      :trim="true"
      :textAreaStyle="{ width: '100%' }"
      :outerStyle="{ width: '100%' }"
      :value="tempPetaImageDirectory"
      @update:value="(value) => (tempPetaImageDirectory = value)"
    />
    <br />
    <button @click="changePetaImageDirectory" :disabled="tempPetaImageDirectory === ''">
      {{ t("settings.changePetaImageDirectoryButton") }}
    </button>
    <p>{{ t("settings.changePetaImageDirectoryDescriptions") }}</p>
  </t-settings-content-root>
</template>

<script setup lang="ts">
// Others
import { IPC } from "@/rendererProcess/ipc";
import { useComponentsStore } from "@/rendererProcess/stores/componentsStore";
import { useSettingsStore } from "@/rendererProcess/stores/settingsStore";
import { onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import VTextarea from "@/rendererProcess/components/utils/VTextarea.vue";

const settingsStore = useSettingsStore();
const components = useComponentsStore();
const { t } = useI18n();
const tempPetaImageDirectory = ref("");
onMounted(() => {
  restorePetaImageDirectory();
});
async function changePetaImageDirectory() {
  const result = await components.dialog.show(
    t("settings.changePetaImageDirectoryDialog", [tempPetaImageDirectory.value]),
    [t("commons.yes"), t("commons.no")],
  );
  if (result === 0) {
    if (!(await IPC.send("changePetaImageDirectory", tempPetaImageDirectory.value))) {
      await components.dialog.show(
        t("settings.changePetaImageDirectoryErrorDialog", [tempPetaImageDirectory.value]),
        [t("commons.yes")],
      );
      restorePetaImageDirectory();
    }
  } else {
    restorePetaImageDirectory();
  }
}
function restorePetaImageDirectory() {
  tempPetaImageDirectory.value = settingsStore.state.value.petaImageDirectory.path;
}
async function browsePetaImageDirectory() {
  const path = await IPC.send("browsePetaImageDirectory");
  if (path) {
    tempPetaImageDirectory.value = path;
  }
}
watch(
  () => settingsStore.state.value.petaImageDirectory.path,
  () => {
    restorePetaImageDirectory();
  },
);
</script>

<style lang="scss" scoped></style>
<style lang="scss" scoped>
@import "@/rendererProcess/components/settings/index.scss";
</style>
