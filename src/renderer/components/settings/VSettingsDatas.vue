<template>
  <e-settings-content-root>
    <!-- <button @click="browsePetaFileDirectory">
      {{ t("settings.browsePetaFileDirectoryButton") }}
    </button>
    <br />
    <VTextarea
      :type="'single'"
      :click-to-edit="true"
      :trim="true"
      :text-area-style="{ width: '100%' }"
      :outer-style="{ width: '100%' }"
      :value="tempPetaFileDirectory"
      @update:value="(value) => (tempPetaFileDirectory = value)" />
    <br />
    <button @click="changePetaFileDirectory" :disabled="tempPetaFileDirectory === ''">
      {{ t("settings.changePetaFileDirectoryButton") }}
    </button>
    <p>{{ t("settings.changePetaFileDirectoryDescriptions") }}</p> -->
  </e-settings-content-root>
</template>

<script setup lang="ts"></script>

<style lang="scss" scoped></style>
<style lang="scss" scoped>
@use "@/renderer/components/settings/index.scss" as *;
</style>
