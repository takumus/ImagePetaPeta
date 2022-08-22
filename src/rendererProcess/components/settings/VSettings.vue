<template>
  <t-settings-root>
    <ul>
      <li
        v-for="tab in tabs"
        :key="tab"
        :class="{
          selected: currentTab === tab,
        }"
        @click="currentTab = tab"
      >
        {{ t("settings." + tab) }}
      </li>
    </ul>
    <t-contents>
      <!--
        General
      -->
      <t-content v-show="currentTab === 'general'">
        <label>
          <input
            type="checkbox"
            v-model="settingsStore.state.value.darkMode"
            :disabled="settingsStore.state.value.autoDarkMode"
          />
          {{ t("settings.darkMode") }}
        </label>
        <br />
        <label>
          <input type="checkbox" v-model="settingsStore.state.value.autoDarkMode" />
          {{ t("settings.autoDarkMode") }}
        </label>
        <p>{{ t("settings.autoDarkModeDescriptions") }}</p>
        <label>
          <input type="checkbox" v-model="settingsStore.state.value.alwaysOnTop" />
          {{ t("settings.alwaysOnTop") }}
        </label>
        <p>{{ t("settings.alwaysOnTopDescriptions") }}</p>
        <label>
          <select v-model="settingsStore.state.value.show">
            <option value="board">{{ t("settings.showBoard") }}</option>
            <option value="browser">{{ t("settings.showBrowser") }}</option>
            <option value="both">{{ t("settings.showBoth") }}</option>
          </select>
          {{ t("settings.show") }}
        </label>
        <p>{{ t("settings.showDescriptions") }}</p>
      </t-content>
      <!--
        Control
      -->
      <t-content v-show="currentTab === 'control'">
        <label> {{ t("settings.zoomSensitivity") }}: </label>
        <input type="number" v-model="settingsStore.state.value.zoomSensitivity" />
        <p>{{ t("settings.zoomSensitivityDescriptions") }}</p>
        <label> {{ t("settings.moveSensitivity") }}: </label>
        <input type="number" v-model="settingsStore.state.value.moveSensitivity" />
        <p>{{ t("settings.moveSensitivityDescriptions") }}</p>
      </t-content>
      <!--
        Browser
      -->
      <t-content v-show="currentTab === 'browser'">
        <button v-show="regenerateMetadatasCompleted" @click="regenerateMetadatas">
          {{ t("settings.regenerateMetadatasButton") }}
        </button>
        <label v-show="!regenerateMetadatasCompleted">
          {{ regenerateMetadatasDone }}/{{ regenerateMetadatasCount }}
        </label>
        <p>{{ t("settings.regenerateMetadatasDescriptions") }}</p>
        <label>
          <input type="checkbox" v-model="settingsStore.state.value.loadTilesInOriginal" />
          {{ t("settings.loadTilesInOriginal") }}
        </label>
        <p>{{ t("settings.loadTilesInOriginalDescriptions") }}</p>
        <label>
          <input type="checkbox" v-model="settingsStore.state.value.showTagsOnTile" />
          {{ t("settings.showTagsOnTile") }}
        </label>
        <p>{{ t("settings.showTagsOnTileDescriptions") }}</p>
      </t-content>
      <!--
        Datas
      -->
      <t-content v-show="currentTab === 'datas'">
        <button @click="browsePetaImageDirectory">
          {{ t("settings.browsePetaImageDirectoryButton") }}</button
        ><br />
        <VEditableLabel
          :label="tempPetaImageDirectory"
          :clickToEdit="true"
          @input="(value) => (tempPetaImageDirectory = value)"
        />
        <br />
        <button @click="changePetaImageDirectory" :disabled="tempPetaImageDirectory === ''">
          {{ t("settings.changePetaImageDirectoryButton") }}
        </button>
        <p>{{ t("settings.changePetaImageDirectoryDescriptions") }}</p>
      </t-content>
      <!--
        Others
      -->
      <t-content v-show="currentTab === 'others'">
        <label>
          <input type="checkbox" v-model="settingsStore.state.value.alwaysShowNSFW" />
          {{ t("settings.alwaysShowNSFW") }} </label
        ><br />
        <p>{{ t("settings.alwaysShowNSFWDescriptions") }}</p>
        <label>
          <input type="checkbox" v-model="settingsStore.state.value.showFPS" />
          {{ t("settings.showFPS") }} </label
        ><br />
        <p>{{ t("settings.showFPSDescriptions") }}</p>
      </t-content>
      <!--
        Update
      -->
      <t-content v-show="currentTab === 'update'" class="update">
        <t-strong>
          <p v-if="updateAvailable">
            {{ t("settings.updateAvailable") }}<br />
            {{ t("settings.currentVersion") }}: {{ appInfoStore.state.value.version }}<br />
            {{ t("settings.latestVersion") }}: {{ latestVersion }}<br />
            <button @click="downloadUpdate">{{ t("settings.updateButton") }}</button>
          </p>
          <p v-else>
            {{ t("settings.thisIsLatest") }}<br />
            {{ t("settings.currentVersion") }}: {{ appInfoStore.state.value.version }}<br />
            <button @click="releaseNote">{{ t("settings.releaseNoteButton") }}</button>
          </p>
          <button @click="checkUpdate">{{ t("settings.checkUpdateButton") }}</button>
        </t-strong>
      </t-content>
      <!--
        Info
      -->
      <t-content v-show="currentTab === 'info'" class="info">
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
        <p>{{ t("info.assets") }}</p>
        <button tabindex="-1" @click="gotoIcons8">Icons8.com</button>
        <p>{{ t("info.debuggers") }}</p>
        <pre class="debuggers">{{ debuggers }}</pre>
        <p>{{ t("info.licenses") }}</p>
        <pre class="licenses">{{ licenses }}</pre>
      </t-content>
    </t-contents>
  </t-settings-root>
</template>

<script setup lang="ts">
// Vue
import { computed, onMounted, ref } from "vue";
// Components
import VEditableLabel from "@/rendererProcess/components/utils/VEditableLabel.vue";
// Others
import { API } from "@/rendererProcess/api";
import { LICENSES } from "@/@assets/licenses";
import { DOWNLOAD_URL, SUPPORT_URL } from "@/commons/defines";
import { DEBUGGERS } from "@/@assets/debuggers";
import { useSettingsStore } from "@/rendererProcess/stores/settingsStore";
import { useAppInfoStore } from "@/rendererProcess/stores/appInfoStore";
import { useI18n } from "vue-i18n";
import { useComponentsStore } from "@/rendererProcess/stores/componentsStore";
import { RemoteBinaryInfo } from "@/commons/datas/remoteBinaryInfo";

const settingsStore = useSettingsStore();
const appInfoStore = useAppInfoStore();
const components = useComponentsStore();
const { t } = useI18n();
const regenerateMetadatasCompleted = ref(true);
const regenerateMetadatasDone = ref(0);
const regenerateMetadatasCount = ref(0);
const tabNames = ["general", "control", "browser", "datas", "others", "update", "info"];
const tabs = ref(tabNames);
const currentTab = ref("general");
const tempPetaImageDirectory = ref("");
const updateAvailable = ref(false);
const latestVersion = ref("1.1.1");
onMounted(async () => {
  API.on("regenerateMetadatasProgress", (_, done, count) => {
    regenerateMetadatasDone.value = done;
    regenerateMetadatasCount.value = count;
    regenerateMetadatasCompleted.value = false;
  });
  API.on("regenerateMetadatasBegin", () => {
    regenerateMetadatasCompleted.value = false;
  });
  API.on("regenerateMetadatasComplete", () => {
    regenerateMetadatasCompleted.value = true;
  });
  API.on("foundLatestVersion", async (event, remote) => {
    notifyUpdate(remote);
  });
  tempPetaImageDirectory.value = settingsStore.state.value.petaImageDirectory.path;
  checkUpdate();
});
function notifyUpdate(remote: RemoteBinaryInfo) {
  latestVersion.value = remote.version;
  updateAvailable.value = true;
  currentTab.value = "update";
}
async function checkUpdate() {
  const remoteBinaryInfo = await API.send("getLatestVersion");
  if (!remoteBinaryInfo.isLatest) {
    notifyUpdate(remoteBinaryInfo);
  }
}
function regenerateMetadatas() {
  API.send("regenerateMetadatas");
}
async function browsePetaImageDirectory() {
  const path = await API.send("browsePetaImageDirectory");
  if (path) {
    tempPetaImageDirectory.value = path;
  }
}
async function changePetaImageDirectory() {
  if (tempPetaImageDirectory.value) {
    const result = await components.dialog.show(
      t("settings.changePetaImageDirectoryDialog", [tempPetaImageDirectory.value]),
      [t("shared.yes"), t("shared.no")],
    );
    if (result === 0) {
      if (!(await API.send("changePetaImageDirectory", tempPetaImageDirectory.value))) {
        await components.dialog.show(
          t("settings.changePetaImageDirectoryErrorDialog", [tempPetaImageDirectory.value]),
          [t("shared.yes")],
        );
        tempPetaImageDirectory.value = settingsStore.state.value.petaImageDirectory.path;
      }
    } else {
      tempPetaImageDirectory.value = settingsStore.state.value.petaImageDirectory.path;
    }
  }
}
const licenses = computed(() => {
  return LICENSES.map((lib) => `${lib.name}\n${lib.licenses}\n`).join("\n");
});
const debuggers = computed(() => {
  return DEBUGGERS.join(", ");
});
function gotoGithub() {
  API.send("openURL", "https://github.com/takumus/ImagePetaPeta");
}
function gotoIssues() {
  API.send(
    "openURL",
    `${SUPPORT_URL}?usp=pp_url&entry.1709939184=${encodeURIComponent(appInfoStore.state.value.version)}`,
  );
}
function gotoIcons8() {
  API.send("openURL", "https://icons8.com/");
}
function showDBFolder() {
  API.send("showDBFolder");
}
function showConfigFolder() {
  API.send("showConfigFolder");
}
function downloadUpdate() {
  API.send("openURL", `${DOWNLOAD_URL}${latestVersion.value}`);
}
function releaseNote() {
  API.send("openURL", `${DOWNLOAD_URL}${appInfoStore.state.value.version}`);
}
</script>

<style lang="scss" scoped>
t-settings-root {
  text-align: center;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  > ul {
    list-style-type: none;
    padding: 0px;
    > li {
      margin: 0px 8px;
      display: inline-block;
      cursor: pointer;
      &.selected {
        text-decoration: underline;
      }
    }
  }
  > t-contents {
    height: 100%;
    overflow-y: scroll;
    overflow-x: hidden;
    display: block;
    > t-content {
      text-align: left;
      display: block;
      > p {
        font-size: var(--size-0);
        margin-left: 16px;
        word-break: break-word;
      }
      .file-path {
        width: 100%;
      }
      &.update {
        > t-strong {
          text-align: center;
          display: block;
          > p {
            font-size: var(--size-1);
            word-break: break-word;
          }
        }
      }
      &.info {
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
    }
  }
}
</style>
