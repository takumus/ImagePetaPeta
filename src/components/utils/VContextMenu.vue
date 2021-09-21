<template>
  <ul v-show="this.show" class="context-menu-root" ref="contextMenu" :style="{ top: position.y + 'px', left: position.x + 'px' }">
    <li v-for="item in items" :key="item._id" @click="select(item)" :class="{
      item: !item.separate,
      separate: item.separate
    }">
      {{item.label}}
    </li>
  </ul>
</template>

<style lang="scss" scoped>
.context-menu-root {
  position: fixed;
  background-color: #333333;
  padding: 0px;
  margin: 0px;
  box-shadow: 2px 2px 5px rgba($color: #000000, $alpha: 0.5);
  .item {
    white-space: nowrap;
    color: #ffffff;
    list-style-type: none;
    min-width: 128px;
    padding: 8px 24px;
    // padding-left: 24px;
    font-size: 0.9em;
    cursor: pointer;
    &:hover {
      background-color: #555555;
    }
  }
  .separate {
    border-bottom: solid 1px #CCCCCC;
    margin: 0px 8px;
    height: 0px;
    overflow: hidden;
  }
}
</style>

<script lang="ts">
import { ContextMenuItem } from "@/datas";
import { Vec2 } from "@/utils";
import { Options, Vue } from "vue-class-component";
import { Prop, Ref } from "vue-property-decorator";
import { v4 as uuid } from "uuid";
import GLOBALS from "@/globals";
@Options({
  components: {
  }
})
export default class VContextMenu extends Vue {
  @Ref("contextMenu")
  contextMenu!: HTMLElement;
  items: ContextMenuItem[] = [];
  position = new Vec2(0, 0);
  show = false;
  mounted() {
    GLOBALS.contextMenu.open = this.open;
    window.addEventListener("mousedown", (event) => {
      if ((event.target as HTMLElement).parentElement != this.contextMenu) {
        this.select();
        return;
      }
    });
  }
  unmounted() {
    //
  }
  open(items: ContextMenuItem[], position: Vec2): void {
    if (this.show) {
      this.select();
    }
    items.forEach((i) => i.id = uuid());
    this.position.x = position.x + 8;
    this.position.y = position.y + 8;
    this.items = items;
    this.show = true;
  }
  select(item?: ContextMenuItem) {
    if (!this.show) return;
    this.show = false;
    if (item) {
      if (item.click) {
        item.click();
      }
    }
  }
}
</script>
