<template>
  <t-board-property-root>
    <t-property v-if="board">
      <button
        tabindex="-1"
        @click="board.transform.scale = 1"
      >
        {{Math.floor(board.transform.scale * 100)}}%
      </button>
      <button
        class="color"
        tabindex="-1"
        :style="{
          backgroundColor: board.background.fillColor
        }"
        @click="$refs['inputFillColor'].click()"
      >
        &nbsp;
      </button>
      <input
        type="color"
        v-model="board.background.fillColor"
        tabindex="-1"
        ref="inputFillColor"
      >
      <button
        class="color"
        tabindex="-1"
        :style="{
          backgroundColor: board.background.lineColor
        }"
        @click="$refs['inputLineColor'].click()"
      >
        &nbsp;
      </button>
      <input
        type="color"
        v-model="board.background.lineColor"
        tabindex="-1"
        ref="inputLineColor"
      >
    </t-property>
    <t-shared class="left">
      <button
        tabindex="-1"
        @click="$components.browser.open()"
      >
        <t-icon class="browser"></t-icon>
      </button>
      <button
        tabindex="-1"
        @click="$api.send('importImageFiles')"
      >
        <t-icon class="import-file"></t-icon>
      </button>
      <button
        tabindex="-1"
        @click="$api.send('importImageDirectories')"
      >
        <t-icon class="import-folder"></t-icon>
      </button>
    </t-shared>
    <t-shared class=" right">
      <button
        tabindex="-1"
        @click="$components.info.open"
      >
        <t-icon class="info"></t-icon>
      </button>
      <button
        tabindex="-1"
        @click="$components.settings.open"
      >
        <t-icon class="settings"></t-icon>
      </button>
    </t-shared>
  </t-board-property-root>
</template>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Prop, Ref, Watch } from "vue-property-decorator";
// Components
// Others
import { PetaBoard } from "@/commons/datas/petaBoard";
@Options({
  components: {
  },
  emits: [
  ]
})
export default class VBoardProperty extends Vue {
  @Prop()
  board!: PetaBoard;
  mounted() {
    //
  }
  unmounted() {
    //
  }
}
</script>

<style lang="scss" scoped>
t-board-property-root {
  --tab-height: 24px;
  --top-draggable-height: 10px;
  width: 100%;
  position: absolute;
  z-index: 2;
  background-color: var(--tab-selected-color);
  height: 30px;
  box-shadow: -1px 2px 2px 0px rgba(0, 0, 0, 0.4);
  border-bottom: solid 1px var(--bg-color);
  display: block;
  >t-shared {
    position: absolute;
    top: 0px;
    height: 100%;
    padding: 4px;
    display: flex;
    flex-shrink: 1;
    text-align: left;
    justify-content: flex-end;
    &.left {
      left: 0px;
      button {
        margin-right: 4px;
      }
    }
    &.right {
      right: 0px;
      button {
        margin-left: 4px;
      }
    }
    &.left, &.right {
      >button {
        min-width: 24px;
        padding: 0px;
        height: 100%;
        margin: 0px;
        border: none;
        >t-icon {
          display: block;
          width: 100%;
          height: 100%;
          background-size: 14px;
          background-repeat: no-repeat;
          background-position: center center;
          filter: var(--icon-filter);
          &.browser {
            background-image: url("~@/@assets/browser.png");
          }
          &.import-file {
            background-image: url("~@/@assets/importFile.png");
          }
          &.import-folder {
            background-image: url("~@/@assets/importFolder.png");
          }
          &.settings {
            background-image: url("~@/@assets/settings.png");
          }
          &.info {
            background-image: url("~@/@assets/info.png");
          }
        }
      }
    }
  }
  >t-property {
    position: absolute;
    top: 0px;
    left: 0px;
    height: 100%;
    width: 100%;
    padding: 4px;
    padding-left: 6px;
    text-align: center;
    >input {
      display: inline-block;
      width: 0px;
      height: 0px;
      overflow: hidden;
      position: relative;
      margin: 0px;
      padding: 0px;
      border: none;
    }
    >button {
      min-width: 24px;
      padding: 0px;
      height: 100%;
      margin: 0px;
      min-width: 50px;
      margin-right: 4px;
      &.color {
        border-radius: 100px;
        width: auto;
        min-width: 0px;
        aspect-ratio: 1;
      }
    }
  }
}
</style>