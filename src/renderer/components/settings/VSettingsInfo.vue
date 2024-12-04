<template>
  <e-settings-content-root class="info">
    <p>{{ appInfoStore.state.value.name }} {{ appInfoStore.state.value.version }}</p>
    <p>Electron {{ appInfoStore.state.value.electronVersion }}</p>
    <p>Chromium {{ appInfoStore.state.value.chromiumVersion }}</p>
    <p>Node.js {{ appInfoStore.state.value.nodeVersion }}</p>
    <button tabindex="-1" @click="gotoGithub">
      {{ t("info.githubButton") }}
    </button>
    <button tabindex="-1" @click="gotoIssues">
      {{ t("info.issuesButton") }}
    </button>
    <p></p>
    <button tabindex="-1" @click="showDBFolder">
      {{ t("info.dbFolderButton") }}
    </button>
    <button tabindex="-1" @click="showConfigFolder">
      {{ t("info.configFolderButton") }}
    </button>
    <p></p>
    <button tabindex="-1" @click="showEULA">
      {{ t("info.showEULAButton") }}
    </button>
    <p>{{ t("info.assets") }}</p>
    <button tabindex="-1" @click="gotoIcons8">Icons8.com</button>
    <p>{{ t("info.supporters") }}</p>
    <pre class="licenses">{{
      supporters
        .map((data) => {
          return `--${data.type}--\n` + `${data.names.join("\n")}`;
        })
        .join("\n\n")
    }}</pre>
    <p>{{ t("info.licenses") }}</p>
    <pre class="licenses">{{
      licenses.map((lib) => `${lib.name}\n${lib.licenses}\n${lib.text}`).join("\n")
    }}</pre>
  </e-settings-content-root>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

import { URL_SUPPORT } from "@/commons/defines";

import { IPC } from "@/renderer/libs/ipc";
import { useAppInfoStore } from "@/renderer/stores/appInfoStore/useAppInfoStore";

const { t } = useI18n();
const appInfoStore = useAppInfoStore();
const licenses = ref<{ name: string; text: string; licenses: string }[]>([]);
const supporters = ref<{ type: string; names: string[] }[]>([]);
onMounted(async () => {
  const [_licenses, _supporters] = await Promise.all([
    IPC.common.getLicenses(),
    IPC.common.getSupporters(),
  ]);
  licenses.value = _licenses;
  Object.keys(_supporters).forEach((type) => {
    supporters.value.push({
      type,
      names: _supporters[type],
    });
  });
});
function gotoGithub() {
  IPC.common.openURL("https://github.com/takumus/ImagePetaPeta");
}
function gotoIssues() {
  IPC.common.openURL(
    `${URL_SUPPORT}?usp=pp_url&entry.1709939184=${encodeURIComponent(
      appInfoStore.state.value.version,
    )}`,
  );
}
function gotoIcons8() {
  IPC.common.openURL("https://icons8.com/");
}
function showDBFolder() {
  IPC.common.showDBFolder();
}
function showConfigFolder() {
  IPC.common.showConfigFolder();
}
function showEULA() {
  IPC.windows.open("eula");
}
</script>

<style lang="scss" scoped>
e-settings-content-root.info {
  display: block;
  text-align: center;
  > pre {
    overflow: hidden;
    font-size: var(--size-0);
    white-space: pre-wrap;
    &.licenses {
      text-align: left;
    }
    &.supporters {
      text-align: center;
    }
  }
  > p {
    font-size: var(--size-1);
    word-break: break-word;
  }
}
</style>
<style lang="scss" scoped>
@use "@/renderer/components/settings/index.scss" as *;
</style>
