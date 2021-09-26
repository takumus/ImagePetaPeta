<template>
  <VModal :visible="visible" :center="true" :zIndex="3">
    <article class="info-root">
      <p>{{ appInfo.name }} {{ appInfo.version }}</p>
      <button tabindex="-1" @click="gotoGithub">{{$t("info.githubButton")}}</button>
      <button tabindex="-1" @click="gotoIssues">{{$t("info.issuesButton")}}</button>
      <p></p>
      <button tabindex="-1" @click="showDBFolder">{{$t("info.dbFolderButton")}}</button>
      <p>{{$t("info.licenses")}}</p>
      <pre>
        {{ licenses }}
      </pre>
      <button @click="close">{{$t("shared.closeButton")}}</button>
    </article>
  </VModal>
</template>

<style lang="scss" scoped>
.info-root {
  text-align: center;
  // color: #333333;
  pre {
    text-align: left;
    overflow: hidden;
    word-break: break-all;
    white-space: pre-wrap;
    height: 128px;
    overflow-y: auto;
    overflow-x: hidden;
    font-size: 0.7em;
  }
  p {
    white-space: nowrap;
  }
}
</style>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
// import { Prop, Ref } from "vue-property-decorator";
// Components
import VModal from "@/components/VModal.vue";
// Others
import { LICENSES } from "@/assets/licenses";
import { API } from "@/api";
import { AppInfo } from "@/datas/appInfo";
@Options({
  components: {
    VModal
  },
})
export default class VInfo extends Vue {
  rawProgress = 100;
  info = 100;
  visible = false;
  version = "0.1.0";
  appInfo: AppInfo = {
    name: "",
    version: ""
  }
  async mounted() {
    this.$globalComponents.info = this;
    this.appInfo = await API.send("getAppInfo");
  }
  get licenses() {
    return LICENSES.map((lib) => `${lib.name}\n${lib.licenses}\n\n`).join('\n');
  }
  gotoGithub() {
    API.send("openURL", "https://github.com/takumus/ImagePetaPeta");
  }
  gotoIssues() {
    API.send("openURL", "https://github.com/takumus/ImagePetaPeta/issues");
  }
  showDBFolder() {
    API.send("showDBFolder");
  }
  open() {
    this.visible = true;
  }
  close() {
    this.visible = false;
  }
}
</script>
