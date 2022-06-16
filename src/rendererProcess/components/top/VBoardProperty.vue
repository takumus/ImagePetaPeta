<template>
  <t-board-property-root v-if="board">
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
  </t-board-property-root>
</template>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Prop, Ref, Watch } from "vue-property-decorator";
// Components
// Others
import { PetaBoard } from "@/commons/datas/petaBoard";
import { API } from "@/rendererProcess/api";
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
  openBrowser() {
    API.send("openBrowser");
  }
}
</script>

<style lang="scss" scoped>
t-board-property-root {
  position: absolute;
  top: 0px;
  left: 0px;
  height: 100%;
  width: 100%;
  padding: 4px;
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
</style>