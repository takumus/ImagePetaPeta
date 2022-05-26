<template>
  <VModal
    :visible="visible"
    :center="true"
    :childStyle="{
      width: '500px'
    }"
    :visibleCloseButton="true"
    @close="close"
  >
    <t-settings-root>
      <p>{{$t("settings.settings")}}</p>
      <ul>
        <li
          v-for="tab in tabs"
          :key="tab"
          :class="{
            selected: currentTab == tab
          }"
          @click="currentTab = tab"
        >
          {{$t("settings." + tab)}}
        </li>
      </ul>
      <t-contents>
        <!--
          General
        -->
        <t-content v-show="currentTab == 'general'">
          <label>
            <input
              type="checkbox"
              :checked="$settings.darkMode"
              :disabled="$settings.autoDarkMode"
              @change="$settings.darkMode = Boolean($event.target.checked)"
            >
            {{$t("settings.darkMode")}}
          </label>
          <br>
          <label>
            <input
              type="checkbox"
              :checked="$settings.autoDarkMode"
              @change="$settings.autoDarkMode = Boolean($event.target.checked)"
            >
            {{$t("settings.autoDarkMode")}}
          </label>
          <p>{{$t("settings.autoDarkModeDescriptions")}}</p>
          <label>
            <input
              type="checkbox"
              :checked="$settings.alwaysOnTop"
              @change="$settings.alwaysOnTop = Boolean($event.target.checked)"
            >
            {{$t("settings.alwaysOnTop")}}
          </label>
          <p>{{$t("settings.alwaysOnTopDescriptions")}}</p>
          <label>
            <input
              type="checkbox"
              :checked="$settings.autoAddTag"
              @change="$settings.autoAddTag = Boolean($event.target.checked)"
            >
            {{$t("settings.autoAddTag")}}
          </label>
          <p>{{$t("settings.autoAddTagDescriptions")}}</p>
        </t-content>
        <!--
          Control
        -->
        <t-content v-show="currentTab == 'control'">
          <label>
            {{$t("settings.zoomSensitivity")}}:
          </label>
          <input
            type="number"
            :value="$settings.zoomSensitivity"
            @change="$settings.zoomSensitivity = Number($event.target.value)"
          >
          <p>{{$t("settings.zoomSensitivityDescriptions")}}</p>
          <label>
            {{$t("settings.moveSensitivity")}}:
          </label>
          <input
            type="number"
            :value="$settings.moveSensitivity"
            @change="$settings.moveSensitivity = Number($event.target.value)"
          >
          <p>{{$t("settings.moveSensitivityDescriptions")}}</p>
        </t-content>
        <!--
          Browser
        -->
        <t-content v-show="currentTab == 'browser'">
          <button
            @click="regenerateMetadatas"
          >
            {{$t("settings.regenerateMetadatasButton")}}
          </button>
          <label
            v-show="!regenerateMetadatasCompleted"
          >
            {{regenerateMetadatasDone}}/{{regenerateMetadatasCount}}
          </label>
          <p>{{$t("settings.regenerateMetadatasDescriptions")}}</p>
          <label>
            <input
              type="checkbox"
              :checked="$settings.loadThumbnailsInOriginal"
              @change="$settings.loadThumbnailsInOriginal = Boolean($event.target.checked)"
            >
            {{$t("settings.loadThumbnailsInOriginal")}}
          </label>
          <p>{{$t("settings.loadThumbnailsInOriginalDescriptions")}}</p>
        </t-content>
        <!--
          Datas
        -->
        <t-content v-show="currentTab == 'datas'">
          <button
            @click="browsePetaImageDirectory"
          >
            {{$t("settings.browsePetaImageDirectoryButton")}}
          </button>
          <input type="text" v-model="tempPetaImageDirectory" class="file-path">
          <br>
          <button
            @click="changePetaImageDirectory"
            :disabled="tempPetaImageDirectory == ''"
          >
            {{$t("settings.changePetaImageDirectoryButton")}}
          </button>
          <p>{{$t("settings.changePetaImageDirectoryDescriptions")}}</p>
        </t-content>
        <!--
          Others
        -->
        <t-content v-show="currentTab == 'others'">
          <label>
            <input
              type="checkbox"
              :checked="$settings.ignoreMinorUpdate"
              @change="$settings.ignoreMinorUpdate = Boolean($event.target.checked)"
            >
            {{$t("settings.ignoreMinorUpdate")}}
          </label><br>
          <p>{{$t("settings.ignoreMinorUpdateDescriptions")}}</p>
          <label>
            <input
              type="checkbox"
              :checked="$settings.alwaysShowNSFW"
              @change="$settings.alwaysShowNSFW = Boolean($event.target.checked)"
            >
            {{$t("settings.alwaysShowNSFW")}}
          </label><br>
          <p>{{$t("settings.alwaysShowNSFWDescriptions")}}</p>
          <label>
            <input
              type="checkbox"
              :checked="$settings.showFPS"
              @change="$settings.showFPS = Boolean($event.target.checked)"
            >
            {{$t("settings.showFPS")}}
          </label><br>
          <p>{{$t("settings.showFPSDescriptions")}}</p>
        </t-content>
      </t-contents>
    </t-settings-root>
  </VModal>
</template>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Prop, Ref, Watch } from "vue-property-decorator";
// Components
import VModal from "@/rendererProcess/components/modal/VModal.vue";
import VEditableLabel from "@/rendererProcess/components/utils/VEditableLabel.vue";
// Others
import { API } from "@/rendererProcess/api";
import { Settings } from "@/commons/datas/settings";
@Options({
  components: {
    VModal,
    VEditableLabel
  },
})
export default class VSettings extends Vue {
  visible = false;
  regenerateMetadatasCompleted = true;
  regenerateMetadatasDone = 0;
  regenerateMetadatasCount = 0;
  tabs = ["general", "control", "browser", "datas", "others"];
  currentTab = "general";
  tempPetaImageDirectory = "";
  async mounted() {
    this.$components.settings = this;
    API.on("regenerateMetadatasProgress", (_, done, count) => {
      this.regenerateMetadatasDone = done;
      this.regenerateMetadatasCount = count;
    });
    API.on("regenerateMetadatasBegin", (_) => {
      this.regenerateMetadatasCompleted = false;
    });
    API.on("regenerateMetadatasComplete", (_) => {
      this.regenerateMetadatasCompleted = true;
    });
  }
  open() {
    this.visible = false;
    this.$nextTick(() => {
      this.visible = true;
    });
    this.tempPetaImageDirectory = this.$settings.petaImageDirectory.path;
  }
  close() {
    this.visible = false;
  }
  regenerateMetadatas() {
    API.send("regenerateMetadatas");
  }
  async browsePetaImageDirectory() {
    const path = await API.send("browsePetaImageDirectory");
    if (path) {
      this.tempPetaImageDirectory = path;
    }
  }
  async changePetaImageDirectory() {
    if (this.tempPetaImageDirectory) {
      const result = await this.$components.dialog.show(
        this.$t("settings.changePetaImageDirectoryDialog", [this.tempPetaImageDirectory]),
        [this.$t("shared.yes"), this.$t("shared.no")]
      );
      if (result == 0) {
        if (!await API.send("changePetaImageDirectory", this.tempPetaImageDirectory)) {
          await this.$components.dialog.show(
            this.$t("settings.changePetaImageDirectoryErrorDialog", [this.tempPetaImageDirectory]),
            [this.$t("shared.yes")]
          );
          this.tempPetaImageDirectory = this.$settings.petaImageDirectory.path;
        }
      } else {
        this.tempPetaImageDirectory = this.$settings.petaImageDirectory.path;
      }
    }
  }
}
</script>

<style lang="scss" scoped>
t-settings-root {
  text-align: center;
  display: block;
  >ul {
    list-style-type: none;
    padding: 0px;
    >li {
      margin: 0px 8px;
      display: inline-block;
      cursor: pointer;
      &.selected {
        text-decoration: underline;
      }
    }
  }
  >t-contents {
    // color: #333333;
    height: 190px;
    overflow-y: scroll;
    overflow-x: hidden;
    display: block;
    >t-content {
      text-align: left;
      display: block;
      >p {
        font-size: 0.8em;
        margin-left: 16px;
        white-space: pre;
        word-break: break-all;
        white-space: pre-wrap;
      }
      .file-path {
        width: 100%;
      }
    }
  }
}
</style>