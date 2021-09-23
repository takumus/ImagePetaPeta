<template>
  <article class="info-root" v-if="show">
    <div class="info">
      <p>{{ appInfo.name }} {{ appInfo.version }}</p>
      <button tabindex="-1" @click="gotoGithub">Github</button>
      <button tabindex="-1" @click="gotoIssues">Issues</button>
      <p>Files</p>
      <button tabindex="-1" @click="showDBFolder">DB Folder</button>
      <p>Licenses</p>
      <pre>
        {{ licenses }}
      </pre>
      <button tabindex="-1" @click="ok">Close</button>
    </div>
  </article>
</template>

<style lang="scss" scoped>
.info-root {
  z-index: 4;
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0px;
  left: 0px;
  background-color: rgba($color: #000000, $alpha: 0.7);
  .info {
    width: 600px;
    background-color: #ffffff;
    padding: 16px;
    border-radius: 8px;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    overflow: hidden;
    text-align: center;
    pre {
      text-align: left;
      overflow: hidden;
      word-break: break-all;
      white-space: pre-wrap ;
      color: #333333;
      height: 128px;
      overflow-y: auto;
      overflow-x: hidden;
      font-size: 0.7em;
      background-color: #eeeeee;
    }
    p {
      white-space: nowrap;
      color: #333333;
    }
  }
}
</style>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
// import { Prop, Ref } from "vue-property-decorator";
// Others
import { LICENSES } from "@/licenses";
import { API } from "@/api";
import { AppInfo } from "@/datas";
@Options({
  components: {
  },
})
export default class VInfo extends Vue {
  rawProgress = 100;
  info = 100;
  show = false;
  version = "0.1.0";
  appInfo: AppInfo = {
    name: "",
    version: ""
  }
  async mounted() {
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
  ok() {
    this.show = false;
  }
}
</script>
