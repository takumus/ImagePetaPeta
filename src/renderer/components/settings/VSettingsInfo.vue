<template>
  <e-settings-content-root class="info">
    <p>{{ appInfoStore.state.value.name }} {{ appInfoStore.state.value.version }}</p>
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
    <p>{{ t("info.debuggers") }}</p>
    <pre class="debuggers">{{ debuggers }}</pre>
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

import { DEBUGGERS } from "@/@assets/debuggers";
import { IPC } from "@/renderer/libs/ipc";
import { useAppInfoStore } from "@/renderer/stores/appInfoStore/useAppInfoStore";

const { t } = useI18n();
const appInfoStore = useAppInfoStore();
const licenses = ref<{ name: string; text: string; licenses: string }[]>([]);
const debuggers = computed(() => {
  return DEBUGGERS.join(", ");
});
onMounted(async () => {
  licenses.value = await IPC.send("getLicenses");
});
function gotoGithub() {
  IPC.send("openURL", "https://github.com/takumus/ImagePetaPeta");
}
function gotoIssues() {
  IPC.send(
    "openURL",
    `${URL_SUPPORT}?usp=pp_url&entry.1709939184=${encodeURIComponent(
      appInfoStore.state.value.version,
    )}`,
  );
}
function gotoIcons8() {
  IPC.send("openURL", "https://icons8.com/");
}
function showDBFolder() {
  IPC.send("showDBFolder");
}
function showConfigFolder() {
  IPC.send("showConfigFolder");
}
function showEULA() {
  IPC.send("openWindow", "eula");
}
</script>

<style lang="scss" scoped>
e-settings-content-root.info {
  text-align: center;
  display: block;
  > pre {
    &.licenses {
      text-align: left;
    }
    &.debuggers {
      text-align: center;
    }
    overflow: hidden;
    white-space: pre-wrap;
    font-size: var(--size-0);
  }
  > p {
    font-size: var(--size-1);
    word-break: break-word;
  }
}
</style>
<style lang="scss" scoped>
@import "@/renderer/components/settings/index.scss";
</style>
