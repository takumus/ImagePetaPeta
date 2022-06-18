import { reactive, App, ref, watch as _watch, ComponentCustomProperties } from "vue";
const nsfw = reactive({
  temporaryShowNSFW: false,
  alwaysShowNSFW: false,
  showNSFW: false
})
export default {
  async install(app: App) {
    app.config.globalProperties.$nsfw = nsfw;
    const settings = (app.config.globalProperties as ComponentCustomProperties).$settings;
    function update() {
      nsfw.alwaysShowNSFW = settings.alwaysShowNSFW;
      nsfw.showNSFW = nsfw.alwaysShowNSFW || nsfw.temporaryShowNSFW;
    }
    _watch(() => settings.alwaysShowNSFW, () => {
      update();
    });
    _watch(() => nsfw.temporaryShowNSFW, () => {
      update();
    });
    update();
  }
}
declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $nsfw: typeof nsfw;
  }
}