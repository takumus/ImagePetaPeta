<template>
  <ul
    v-show="show"
    class="complement-root"
    ref="complement"
    :style="{
      top: position.y + 'px',
      left: position.x + 'px',
      height: height,
      zIndex: zIndex
    }"
  >
    <li
      v-for="item, i in filteredItems"
      :key="item"
      @pointerdown="select(item)"
      @pointermove="moveSelectionAbsolute(i)"
      @mouseleave="moveSelectionAbsolute(-1)"
      class="item"
      :class="{
        selected: i === currentIndex
      }"
    >
      {{item}}
    </li>
    <li
      class="item close"
      v-html="$texts.close"
      v-if="filteredItems.length > 0"
    >
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
  target?: any;
  currentIndex = 0;
  keyboards: Keyboards = new Keyboards();
  searcher?: FuzzySearch<string>;
  height = "unset";
  mounted() {
    this.$components.complement = this;
    this.keyboards.down(["ArrowUp"], () => {
      if (!this.target) return;
      this.moveSelectionRelative(-1);
    });
    this.keyboards.down(["ArrowDown"], () => {
      if (!this.target) return;
      this.moveSelectionRelative(1);
    });
    this.keyboards.down(["Tab"], () => {
      if (!this.target) return;
      this.moveSelectionRelative(Keyboards.pressedOR("ShiftLeft", "ShiftRight") ? -1 : 1);
    });
    this.keyboards.down(["Enter"], () => {
      if (!this.target) return;
      const item = this.filteredItems[this.currentIndex];
      if (item) {
        this.select(item);
      }
    });
    this.keyboards.down(["Escape"], () => {
      this.$nextTick(() => {
        this.blur();
      });
    });
    setInterval(() => {
      if (this.show) {
        this.updatePosition();
      }
    }, 50);
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
    // this.normalizeIndex();
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
  open(input: any, items: string[]): void {
    if (input === this.target && this.show) {
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
    this.updatePosition();
  }
  updateItems(items: string[]) {
    this.items = items;
    this.searcher = new FuzzySearch(items, undefined, {
      sort: true
    });
    this.input();
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
    if (this.target && this.target.$el) {
      const inputRect = (this.target.$el as HTMLElement).getBoundingClientRect();
      this.position.x = inputRect.x;
      this.position.y = inputRect.y + inputRect.height;
      this.height = "unset";
      const rect = this.complement.getBoundingClientRect();
      if (this.position.x + rect.width > document.body.clientWidth - 9) {
        this.position.x = document.body.clientWidth - rect.width - 8;
      }
      if (this.position.y + rect.height > document.body.clientHeight - 9) {
        // this.position.y = document.body.clientHeight - rect.height;
        this.height = `${document.body.clientHeight - this.position.y - 8}px`;
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.complement-root {
  position: fixed;
  background-color: var(--color-main);
  padding: 0px;
  margin: 0px;
  box-shadow: 1px 1px 5px rgba(0, 0, 0, 0.5);
  color: var(--color-font);
  border-radius: var(--rounded);
  overflow-y: auto;
  overflow-x: hidden;
  >.item {
    word-break: break-word;
    list-style-type: none;
    min-width: 128px;
    width: 256px;
    padding: 4px 24px;
    // padding-left: 24px;
    font-size: var(--size-1);
    cursor: pointer;
    &.selected, &.close:hover {
      background-color: var(--color-hover);
    }
    &.close {
      text-align: center;
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