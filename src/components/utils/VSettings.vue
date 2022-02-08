<template>
  <VModal
    :visible="visible"
    :center="true"
    :visibleCloseButton="true"
    @close="close"
  >
    <article class="settings-root">
      <p>{{$t("settings.settings")}}</p>
      <section>
        <label>
          <input
            type="checkbox"
            :checked="$settings.darkMode"
            :disabled="$settings.autoDarkMode"
            @change="$settings.darkMode = Boolean($event.target.checked)"
          >
          {{$t("settings.darkMode")}}
        </label>
      </section>
      <section>
        <label>
          <input
            type="checkbox"
            :checked="$settings.autoDarkMode"
            @change="$settings.autoDarkMode = Boolean($event.target.checked)"
          >
          {{$t("settings.autoDarkMode")}}
        </label>
        <p>{{$t("settings.autoDarkModeDescriptions")}}</p>
      </section>
      <section>
        <label>
          <input
            type="checkbox"
            :checked="$settings.alwaysOnTop"
            @change="$settings.alwaysOnTop = Boolean($event.target.checked)"
          >
          {{$t("settings.alwaysOnTop")}}
        </label>
        <p>{{$t("settings.alwaysOnTopDescriptions")}}</p>
      </section>
      <section>
        <label>
          {{$t("settings.zoomSensitivity")}}:
        </label>
        <input
          type="number"
          :value="$settings.zoomSensitivity"
          @change="$settings.zoomSensitivity = Number($event.target.value)"
        >
        <p>{{$t("settings.zoomSensitivityDescriptions")}}</p>
      </section>
      <section>
        <label>
          {{$t("settings.moveSensitivity")}}:
        </label>
        <input
          type="number"
          :value="$settings.moveSensitivity"
          @change="$settings.moveSensitivity = Number($event.target.value)"
        >
        <p>{{$t("settings.moveSensitivityDescriptions")}}</p>
      </section>
      <section>
        <label>
          <input
            type="checkbox"
            :checked="$settings.autoHideUI"
            @change="$settings.autoHideUI = Boolean($event.target.checked)"
          >
          {{$t("settings.autoHideUI")}}
        </label><br>
        <p>{{$t("settings.autoHideUIDescriptions")}}</p>
      </section>
      <section>
        <label>
          {{$t("settings.thumbnailsSize")}}:
        </label>
        <select
          :value="$settings.thumbnails.size"
          @change="$settings.thumbnails.size = Number($event.target.value)"
          :disabled="!regenerateThumbnailsCompleted"
        >
          <option
            :value="size"
            v-for="size in thumbnailsSize"
            :key="size"
          >
            {{size}}
          </option>
        </select>px, 
        <label>
          {{$t("settings.thumbnailsQuality")}}:
        </label>
        <select
          :value="$settings.thumbnails.quality"
          @change="$settings.thumbnails.quality = Number($event.target.value)"
          :disabled="!regenerateThumbnailsCompleted"
        >
          <option
            :value="quality"
            v-for="quality in thumbnailsQuality"
            :key="quality"
          >
            {{quality}}
          </option>
        </select>
        <button
          @click="regenerateThumbnails"
        >
          {{$t("settings.thumbnailsRegenerateButton")}}
        </button>
        <label
          v-show="!regenerateThumbnailsCompleted"
        >
          {{regenerateThumbnailsDone}}/{{regenerateThumbnailsCount}}
        </label>
        <p>{{$t("settings.thumbnailsDescriptions")}}</p>
      </section>
      <section>
        <label>
          <input
            type="checkbox"
            :checked="$settings.showFPS"
            @change="$settings.showFPS = Boolean($event.target.checked)"
          >
          {{$t("settings.showFPS")}}
        </label><br>
        <p>{{$t("settings.showFPSDescriptions")}}</p>
      </section>
    </article>
  </VModal>
</template>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Prop, Ref, Watch } from "vue-property-decorator";
// Components
import VModal from "@/components/modal/VModal.vue";
import VEditableLabel from "@/components/utils/VEditableLabel.vue";
// Others
import { API } from "@/api";
import { BROWSER_THUMBNAIL_QUALITY, BROWSER_THUMBNAIL_SIZE } from "@/defines";
@Options({
  components: {
    VModal,
    VEditableLabel
  },
})
export default class VSettings extends Vue {
  visible = false;
  regenerateThumbnailsCompleted = true;
  regenerateThumbnailsDone = 0;
  regenerateThumbnailsCount = 0;
  async mounted() {
    this.$globalComponents.settings = this;
    API.on("regenerateThumbnailsProgress", (_, done, count) => {
      this.regenerateThumbnailsDone = done;
      this.regenerateThumbnailsCount = count;
    });
    API.on("regenerateThumbnailsBegin", (_) => {
      this.regenerateThumbnailsCompleted = false;
    });
    API.on("regenerateThumbnailsComplete", (_) => {
      this.regenerateThumbnailsCompleted = true;
    });
  }
  open() {
    this.visible = true;
  }
  close() {
    this.visible = false;
  }
  @Watch("$settings", { deep: true })
  save() {
    API.send("updateSettings", this.$settings);
  }
  regenerateThumbnails() {
    API.send("regenerateThumbnails");
  }
  get thumbnailsSize() {
    return BROWSER_THUMBNAIL_SIZE;
  }
  get thumbnailsQuality() {
    return BROWSER_THUMBNAIL_QUALITY;
  }
}
</script>

<style lang="scss" scoped>
.settings-root {
  text-align: center;
  // color: #333333;
  >section {
    text-align: left;
    >p {
      font-size: 0.8em;
      margin-left: 16px;
      white-space: pre;
    }
  }
}
</style>