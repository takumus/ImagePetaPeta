<template>
  <t-settings-datas-root>
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
  </t-settings-datas-root>
</template>

<script setup lang="ts">
// Others
import { API } from "@/rendererProcess/api";
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
    [t("shared.yes"), t("shared.no")],
  );
  if (result === 0) {
    if (!(await API.send("changePetaImageDirectory", tempPetaImageDirectory.value))) {
      await components.dialog.show(t("settings.changePetaImageDirectoryErrorDialog", [tempPetaImageDirectory.value]), [
        t("shared.yes"),
      ]);
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
  const path = await API.send("browsePetaImageDirectory");
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

<style lang="scss" scoped>
t-settings-datas-root {
  text-align: left;
  display: block;
  > p {
    font-size: var(--size-0);
    margin-left: 16px;
    word-break: break-word;
  }
}
</style>
