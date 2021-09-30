<template>
  <VModal
    :visible="visible"
    :center="true"
    :zIndex="zIndex"
  >
    <article class="settings-root">
      <p>{{$t("settings.settings")}}</p>
      <label>
        <input
          type="checkbox"
          :checked="$settings.lowMemoryMode"
          @change="$settings.lowMemoryMode = Boolean($event.target.checked)"
        >
        {{$t("settings.lowMemoryMode")}}
      </label>
      <p></p>
      <label>
        <input
          type="checkbox"
          :checked="$settings.darkMode"
          @change="$settings.darkMode = Boolean($event.target.checked)"
        >
        {{$t("settings.darkMode")}}
      </label>
      <p></p>
      <label>
        <input
          type="checkbox"
          :checked="$settings.alwaysOnTop"
          @change="$settings.alwaysOnTop = Boolean($event.target.checked)"
        >
        {{$t("settings.alwaysOnTop")}}
      </label>
      <p></p>
      <button @click="close">{{$t("shared.closeButton")}}</button>
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
  @Prop()
  zIndex = 0;
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
  p {
    white-space: nowrap;
  }
}
</style>