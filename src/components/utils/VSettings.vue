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
@Options({
  components: {
    VModal,
    VEditableLabel
  },
})
export default class VSettings extends Vue {
  visible = false;
  async mounted() {
    this.$globalComponents.settings = this;
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