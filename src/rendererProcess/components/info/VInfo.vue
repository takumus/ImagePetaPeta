<template>
  <VModal
    :visible="visible"
    :center="true"
    :visibleCloseButton="true"
    @close="close"
  >
    <article class="info-root">
      <p>
        {{ $appInfo.name }} {{ $appInfo.version }}
      </p>
      <button
        tabindex="-1"
        @click="gotoGithub">
        {{$t("info.githubButton")}}
      </button>
      <button
        tabindex="-1"
        @click="gotoIssues">
        {{$t("info.issuesButton")}}
      </button>
      <p></p>
      <button
        tabindex="-1"
        @click="showDBFolder">
        {{$t("info.dbFolderButton")}}
      </button>
      <button
        tabindex="-1"
        @click="showConfigFolder">
        {{$t("info.configFolderButton")}}
      </button>
      <p>{{$t("info.assets")}}</p>
      <button
        tabindex="-1"
        @click="gotoIcons8">
        Icons8.com
      </button>
      <p>{{$t("info.licenses")}}</p>
      <pre>{{ licenses }}</pre>
    </article>
  </VModal>
</template>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Prop, Ref } from "vue-property-decorator";
// Components
import VModal from "@/rendererProcess/components/modal/VModal.vue";
// Others
import { LICENSES } from "@/@assets/licenses";
import { API } from "@/rendererProcess/api";
import { SUPPORT_URL } from "@/commons/defines";
@Options({
  components: {
    VModal
  },
})
export default class VInfo extends Vue {
  rawProgress = 100;
  info = 100;
  visible = false;
  async mounted() {
    this.$components.info = this;
  }
  get licenses() {
    return LICENSES.map((lib) => `${lib.name}\n${lib.licenses}\n`).join('\n');
  }
  gotoGithub() {
    API.send("openURL", "https://github.com/takumus/ImagePetaPeta");
  }
  gotoIssues() {
    API.send("openURL", `${SUPPORT_URL}?usp=pp_url&entry.1709939184=${encodeURIComponent(this.$appInfo.version)}`);
  }
  gotoIcons8() {
    API.send("openURL", "https://icons8.com/");
  }
  showDBFolder() {
    API.send("showDBFolder");
  }
  showConfigFolder() {
    API.send("showConfigFolder");
  }
  open() {
    this.visible = false;
    this.$nextTick(() => {
      this.visible = true;
    });
  }
  close() {
    this.visible = false;
  }
}
</script>

<style lang="scss" scoped>
.info-root {
  text-align: center;
  // color: #333333;
  >pre {
    text-align: left;
    overflow: hidden;
    word-break: break-all;
    white-space: pre-wrap;
    height: 128px;
    overflow-y: auto;
    overflow-x: hidden;
    font-size: 0.8em;
  }
  >p {
    white-space: nowrap;
  }
}
</style>