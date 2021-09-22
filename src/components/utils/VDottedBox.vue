<template>
  <div class="dottedbox-root" :style="{
    top: `${y}px`,
    left: `${x}px`,
    width: `${_width}px`,
    height: `${_height}px`
  }">
    <div
      v-if="!_svg"
      class="border back"
    >
    </div>
    <div
      v-if="!_svg"
      class="border front"
    >
    </div>
    <svg 
      v-if="_svg"
      :width="_width"
      :height="_height"
    >
      <polygon
        :points="`0,0 ${_width},0 ${_width},${_height} 0,${_height} 0,0`"
        stroke="black"
        fill="none"
        stroke-width="2"
      />
      <polygon
        :points="`${_dasharrayOffset},0 ${_width},0 ${_width},${_height} 0,${_height} 0,0`"
        stroke="white"
        stroke-dasharray="5,5"
        fill="none"
        stroke-width="2"
      />
    </svg>
  </div>
</template>

<style lang="scss" scoped>
.dottedbox-root {
  position: absolute;
  pointer-events: none;
  .border {
    position: absolute;
    width: 100%;
    height: 100%;
    border-width: 1.5px;
    &.back {
      border-style: solid;
      border-color: #ffffff;
    }
    &.front {
      border-style: dashed;
      border-color: #000000;
    }
  }
  svg {
    position: absolute;
  }
}
</style>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Prop, Ref } from "vue-property-decorator";
@Options({
  components: {
  }
})
export default class VDottedBox extends Vue {
  @Prop()
  x = 0;
  @Prop()
  y = 0;
  @Prop()
  width = 0;
  @Prop()
  height = 0;
  dasharrayOffset = 0;
  dasharrayAnimateId = 0;
  async mounted() {
    this.dasharrayAnimateId = window.setInterval(() => {
      this.dasharrayOffset += 2;
      this.dasharrayOffset %= 10;
    }, 100);
  }
  unmounted() {
    window.clearInterval(this.dasharrayAnimateId);
  }
  get _dasharrayOffset() {
    return this.dasharrayOffset;
  }
  get _width() {
    return Math.abs(this.width);
  }
  get _height() {
    return Math.abs(this.height);
  }
  get _svg() {
    return false;
  }
}
</script>
