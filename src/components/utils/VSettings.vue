<template>
  <VModal :visible="visible" :center="true" :zIndex="3">
    <article class="settings-root">
      <p>{{$t("settings.settings")}}</p>
      <button @click="close">{{$t("shared.closeButton")}}</button>
    </article>
  </VModal>
</template>

<style lang="scss" scoped>
.settings-root {
  text-align: center;
  p {
    white-space: nowrap;
    color: #333333;
  }
}
</style>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Prop, Ref } from "vue-property-decorator";
// Components
import VModal from "@/components/VModal.vue";
// Others
import { API } from "@/api";
@Options({
  components: {
    VModal
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
}
</script>
