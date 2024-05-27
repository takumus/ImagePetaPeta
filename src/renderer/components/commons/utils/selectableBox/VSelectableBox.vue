<template>
  <e-selectable-box-root>
    <e-images
      :class="{
        selected,
      }">
      <e-content>
        <slot name="content"></slot>
      </e-content>
      <e-background> </e-background>
    </e-images>
    <e-inners
      :class="{
        selected,
      }">
      <slot name="inner"></slot>
    </e-inners>
    <e-selected v-show="selected"> </e-selected>
  </e-selectable-box-root>
</template>

<script setup lang="ts">
const props = defineProps<{
  selected: boolean;
}>();
</script>

<style lang="scss" scoped>
e-selectable-box-root {
  display: block;
  position: relative;
  border-radius: var(--rounded);
  width: 100%;
  height: 100%;
  overflow: hidden;
  > e-images {
    display: block;
    position: relative;
    filter: brightness(0.7);
    cursor: pointer;
    border-radius: var(--rounded);
    width: 100%;
    height: 100%;
    overflow: hidden;
    &.selected {
      filter: brightness(1);
      border-radius: var(--rounded);
      padding: 2px;
    }
    > e-background {
      display: block;
      position: absolute;
      top: 0px;
      left: 0px;
      z-index: 0;
      background-image: url("/images/textures/transparent.png");
      background-repeat: repeat;
      width: 100%;
      height: 100%;
    }
    > e-content {
      display: block;
      position: absolute;
      top: 0px;
      left: 0px;
      z-index: 1;
      width: 100%;
      height: 100%;
    }
  }
  &:hover {
    box-shadow: 1px 1px 5px rgba(0, 0, 0, 0.5);
    > e-images {
      filter: brightness(1);
    }
  }
  > e-inners {
    display: block;
    position: absolute;
    top: 0px;
    left: 0px;
    border: solid var(--px-1) transparent;
    width: 100%;
    height: 100%;
    pointer-events: none;
    &.selected {
      border: solid var(--px-2) transparent;
    }
  }
  > e-selected {
    display: block;
    position: absolute;
    right: 0px;
    bottom: 0px;
    box-shadow: var(--shadow) inset;
    border-radius: var(--rounded);
    width: 100%;
    height: 100%;
    pointer-events: none;
    &:before {
      position: absolute;
      box-shadow: 0px 0px 0px calc(var(--px-1) * 0.5 - 0.4px) var(--color-font) inset;
      border: solid calc(var(--px-1)) var(--color-0);
      border-radius: var(--rounded);
      width: 100%;
      height: 100%;
      content: "";
    }
    &:after {
      position: absolute;
      border: solid calc(var(--px-1) * 0.5) var(--color-font);
      border-radius: var(--rounded);
      width: 100%;
      height: 100%;
      content: "";
    }
  }
}
</style>
