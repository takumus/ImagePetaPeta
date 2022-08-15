<template>
  <t-root
    :class="{
      dark: $darkMode.value
    }"
  >
    <t-content>
      <t-top>
        <VTitleBar :title="$t('titles.settings')">
        </VTitleBar>
      </t-top>
      <t-browser>
        <VSettings />
      </t-browser>
    </t-content>
    <VDialog
      :zIndex="6"
    ></VDialog>
    <VContextMenu
      :zIndex="4"
    />
    <VComplement
      :zIndex="5"
    />
  </t-root>
</template>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Ref, Watch } from "vue-property-decorator";
// Components
import VTitleBar from "@/rendererProcess/components/top/VTitleBar.vue";
import VContextMenu from "@/rendererProcess/components/utils/VContextMenu.vue";
import VComplement from "@/rendererProcess/components/utils/VComplement.vue";
import VSettings from "@/rendererProcess/components/settings/VSettings.vue";
import VDialog from "@/rendererProcess/components/utils/VDialog.vue";
// Others
import { API } from "@/rendererProcess/api";
import { Keyboards } from "../utils/keyboards";
@Options({
  components: {
    VTitleBar,
    VContextMenu,
    VComplement,
    VSettings,
    VDialog
  },
})
export default class SettingsIndex extends Vue {
  title = "";
  keyboards: Keyboards = new Keyboards();
  async mounted() {
    this.title = `${this.$t("titles.settings")} - ${this.$appInfo.name} ${this.$appInfo.version}`;
    document.title = this.title;
    this.keyboards.enabled = true;
    this.keyboards.up(["Escape"], () => {
      API.send("windowClose");
    });
  }
  @Watch("$focusedWindows.focused")
  changeWindowIsFocused() {
    // console.log(this.$focusedWindows.focused);
  }
}
</script>

<style lang="scss" scoped>
t-root {
  >t-content {
    position: fixed;
    top: 0px;
    left: 0px;
    display: flex;
    height: 100%;
    width: 100%;
    flex-direction: column;
    >t-top {
      display: block;
      width: 100%;
      z-index: 2;
    }
    >t-browser {
      display: block;
      overflow: hidden;
      padding: 16px;
      background-color: var(--bg-color);
      flex: 1;
      z-index: 1;
    }
    >t-modals {
      position: absolute;
      width: 100%;
      height: 100%;
      top: 0px;
      left: 0px;
      z-index: 3;
    }
  }
}
</style>
<style lang="scss">
@import "@/rendererProcess/components/index.scss";
</style>