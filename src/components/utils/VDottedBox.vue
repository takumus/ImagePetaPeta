<template>
  <article
    class="dottedbox-root"
    :style="{
      top: `${y}px`,
      left: `${x}px`,
      width: `${absWidth}px`,
      height: `${absHeight}px`
    }"
  >
    <div
      v-if="!svg"
      class="border back"
    >
    </div>
    <div
      v-if="!svg"
      class="border front"
    >
    </div>
    <svg 
      v-if="svg"
      :width="absWidth"
      :height="absHeight"
    >
      <polygon
        :points="`0,0 ${absWidth},0 ${absWidth},${absHeight} 0,${absHeight} 0,0`"
        stroke="black"
        fill="none"
        stroke-width="2"
      />
      <polygon
        :points="`${dasharrayOffset},0 ${absWidth},0 ${absWidth},${absHeight} 0,${absHeight} 0,0`"
        stroke="white"
        stroke-dasharray="5,5"
        fill="none"
        stroke-width="2"
      />
    </svg>
  </article>
</template>

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
  get absWidth() {
    return Math.abs(this.width);
  }
  get absHeight() {
    return Math.abs(this.height);
  }
  get svg() {
    return false;
  }
}
</script>

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