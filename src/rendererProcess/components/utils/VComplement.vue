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
    <li
      v-for="item, i in filteredItems"
      :key="item"
      @mousedown="select(item)"
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
      this.currentIndex--;
      this.moveSelection();
    });
    this.keyboards.down(["arrowdown"], () => {
      if (!this.target) return;
      this.currentIndex++;
      this.moveSelection();
    });
    this.keyboards.down(["tab"], () => {
      if (!this.target) return;
      this.currentIndex += Keyboards.pressed("shift") ? -1 : 1;
      this.moveSelection();
    });
    this.keyboards.down(["enter"], () => {
      if (!this.target) return;
      this.select(this.filteredItems[this.currentIndex]);
    });
    this.keyboards.down(["escape"], () => {
      this.blur();
    });
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
  moveSelection() {
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
    this.searcher = new FuzzySearch(items, undefined, {
      sort: true
    });
    this.target = input;
    this.filteredItems = [];
    this.items = items;
    input.labelInput.addEventListener("blur", this.blur);
    input.labelInput.addEventListener("input", this.input);
    this.show = true;
    this.input();
    this.keyboards.enabled = true;
  }
  updateItems(items: string[]) {
    this.items = items;
  }
  blur() {
    this.show = false;
    this.keyboards.enabled = false;
    this.keyboards.unlock();
    if (this.target) {
      this.target.labelInput.removeEventListener("blur", this.blur);
      this.target.labelInput.removeEventListener("input", this.input);
    }
  }
  input() {
    if (!this.show || !this.target) {
      return;
    }
    this.currentIndex = -1;
    const value = this.target.tempText.trim();
    if (value == "") {
      this.filteredItems = [];
      this.keyboards.unlock();
      return;
    }
    // -Fuzzy
    if (this.searcher) {
      this.filteredItems = this.searcher?.search(value);
    }
    // -Takumu
    // this.filteredItems = this.items.filter((item) => {
    //   item = item.toLowerCase();
    //   return item.indexOf(value) >= 0 && item != value;
    // }).sort((a, b) => {
    //   const ai = a.toLowerCase().indexOf(value);
    //   const bi = b.toLowerCase().indexOf(value);
    //   if (ai == bi) {
    //     return a.length - b.length;
    //   }
    //   return ai - bi;
    // });
    if (this.filteredItems.length == 0) {
      this.keyboards.unlock();
    } else {
      this.keyboards.lock();
      const rect = this.target.$el.getBoundingClientRect();
      this.position.x = rect.x;
      this.position.y = rect.y + rect.height;
    }
  }
  select(item?: string) {
    setTimeout(() => {
      if (this.target) {
        this.target.tempText = item || this.target.tempText;
        this.blur();
        this.target.labelInput.blur();
      }
    }, 1);
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
    &:hover, &.selected {
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