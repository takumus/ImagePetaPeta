<template>
  <ul
    v-show="this.show"
    class="complement-root"
    ref="complement"
    :style="{
      top: position.y + 'px',
      left: position.x + 'px',
      zIndex: zIndex
    }"
  >
    <li class="item" v-html="$texts.close">

    </li>
    <li
      v-for="item, i in filteredItems"
      :key="item"
      @mousedown="select(item)"
      @mousemove="moveSelectionAbsolute(i)"
      class="item"
      :class="{
        selected: i == currentIndex
      }"
    >
      {{item}}
    </li>
  </ul>
</template>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Prop, Ref } from "vue-property-decorator";

// Components
import VEditableLabel from "@/rendererProcess/components/utils/VEditableLabel.vue";

// Others
import { Vec2 } from "@/commons/utils/vec2";
import { Keyboards } from "@/rendererProcess/utils/keyboards";
import FuzzySearch from 'fuzzy-search';
@Options({
  components: {
  }
})
export default class VComplement extends Vue {
  @Prop()
  zIndex = 0;
  @Ref("complement")
  complement!: HTMLElement;
  items: string[] = [];
  filteredItems: string[] = [];
  position = new Vec2(0, 0);
  show = false;
  target?: VEditableLabel;
  currentIndex = 0;
  keyboards: Keyboards = new Keyboards();
  searcher?: FuzzySearch<string>;
  mounted() {
    this.$components.complement = this;
    this.keyboards.down(["arrowup"], () => {
      if (!this.target) return;
      this.moveSelectionRelative(-1);
    });
    this.keyboards.down(["arrowdown"], () => {
      if (!this.target) return;
      this.moveSelectionRelative(1);
    });
    this.keyboards.down(["tab"], () => {
      if (!this.target) return;
      this.moveSelectionRelative(Keyboards.pressed("shift") ? -1 : 1);
    });
    this.keyboards.down(["enter"], () => {
      if (!this.target) return;
      const item = this.filteredItems[this.currentIndex];
      if (item) {
        this.select(item);
      }
    });
    this.keyboards.down(["escape"], () => {
      this.$nextTick(() => {
        this.blur();
      });
    });
    setInterval(() => {
      if (this.show) {
        this.updatePosition();
      }
    }, 200);
  }
  normalizeIndex() {
    if (this.currentIndex < 0) {
      if (this.filteredItems.length > 0) {
        this.currentIndex = this.filteredItems.length - 1;
      } else {
        this.currentIndex = 0;
      }
    }
    if (this.filteredItems.length > 0) {
      this.currentIndex = this.currentIndex % this.filteredItems.length;
    }
  }
  unmounted() {
    //
  }
  moveSelectionAbsolute(index: number) {
    this.currentIndex = index;
    this.normalizeIndex();
    this.moveCursorToLast();
  }
  moveSelectionRelative(index: number) {
    this.currentIndex += index;
    this.normalizeIndex();
    this.moveCursorToLast();
  }
  moveCursorToLast() {
    setTimeout(() => {
      const range = document.createRange();
      if (this.target?.labelInput.firstChild) {
        range.setStart(this.target.labelInput.firstChild, this.target.tempText.length);
        range.collapse(true)
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }, 1);
  }
  open(input: VEditableLabel, items: string[]): void {
    if (input == this.target && this.show) {
      return;
    }
    this.updateItems(items);
    this.target = input;
    this.filteredItems = [];
    input.labelInput.addEventListener("blur", this.blur);
    input.labelInput.addEventListener("input", this.input);
    this.show = true;
    this.input();
    this.keyboards.enabled = true;
    this.keyboards.lock();
  }
  updateItems(items: string[]) {
    this.items = items;
    this.searcher = new FuzzySearch(items, undefined, {
      sort: true
    });
  }
  blur() {
    this.show = false;
    this.keyboards.enabled = false;
    this.keyboards.unlock();
    if (this.target) {
      this.target.labelInput.removeEventListener("blur", this.blur);
      this.target.labelInput.removeEventListener("input", this.input);
      this.target.labelInput.blur();
      this.target = undefined;
    }
  }
  input() {
    if (!this.show || !this.target) {
      return;
    }
    this.currentIndex = -1;
    const value = this.target.tempText.trim();
    // -Fuzzy
    if (this.searcher) {
      this.filteredItems = this.searcher?.search(value);
    }
    this.updatePosition();
  }
  select(item: string) {
    if (this.target) {
      this.target.apply(item);
      this.blur();
    }
  }
  updatePosition() {
    if (this.target) {
      const rect = this.target.$el.getBoundingClientRect();
      this.position.x = rect.x;
      this.position.y = rect.y + rect.height;
    }
  }
}
</script>

<style lang="scss" scoped>
.complement-root {
  position: fixed;
  background-color: var(--contextmenu-item-color);
  padding: 0px;
  margin: 0px;
  box-shadow: 1px 1px 5px rgba($color: #000000, $alpha: 0.5);
  color: var(--font-color);
  border-radius: var(--rounded);
  overflow: hidden;
  >.item {
    white-space: nowrap;
    list-style-type: none;
    min-width: 128px;
    padding: 4px 24px;
    // padding-left: 24px;
    font-size: 1em;
    cursor: pointer;
    &.selected {
      background-color: var(--contextmenu-item-hover-color);
    }
  }
  >.separate {
    border-bottom: solid 1px #CCCCCC;
    margin: 0px 8px;
    height: 0px;
    overflow: hidden;
  }
}
</style>