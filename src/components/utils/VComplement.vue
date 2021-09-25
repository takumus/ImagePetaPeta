<template>
  <ul v-show="this.show" class="complement-root" ref="complement" :style="{ top: position.y + 'px', left: position.x + 'px' }">
    <li v-for="item, i in filteredItems" :key="item" @mousedown="select(item)" class="item" :class="{ selected: i == currentIndex }">
      {{item}}
    </li>
  </ul>
</template>

<style lang="scss" scoped>
.complement-root {
  position: fixed;
  z-index: 5;
  background-color: #333333;
  padding: 0px;
  margin: 0px;
  box-shadow: 2px 2px 5px rgba($color: #000000, $alpha: 0.5);
  .item {
    white-space: nowrap;
    color: #ffffff;
    list-style-type: none;
    min-width: 128px;
    padding: 4px 24px;
    // padding-left: 24px;
    font-size: 1em;
    cursor: pointer;
    &:hover, &.selected {
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
// Vue
import { Options, Vue } from "vue-class-component";
import { Prop, Ref } from "vue-property-decorator";
// Others
import { Vec2 } from "@/utils";
@Options({
  components: {
  }
})
export default class VComplement extends Vue {
  @Ref("complement")
  complement!: HTMLElement;
  items: string[] = [];
  filteredItems: string[] = [];
  position = new Vec2(0, 0);
  show = false;
  target?: HTMLInputElement;
  currentIndex = 0;
  mounted() {
    this.$globals.complement = this;
    window.addEventListener("mousedown", (event) => {
      if ((event.target as HTMLElement).parentElement != this.complement) {
        this.select();
        return;
      }
    });
    window.addEventListener("keydown", (event: KeyboardEvent) => {
      if (!this.show || !this.target) return;
      if (event.key == "ArrowUp") {
        this.currentIndex--;
        this.moveSelection();
      } else if (event.key == "ArrowDown") {
        this.currentIndex++;
        this.moveSelection();
      } else if (event.key == "Enter") {
        this.select(this.filteredItems[this.currentIndex]);
      }
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
    this.$nextTick(() => {
      if (this.target) {
         const range = document.createRange();
        range.selectNodeContents(this.target);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    });
  }
  open(input: HTMLElement, items: string[]): void {
    if (input == this.target && this.show) {
      return;
    }
    this.target = input as HTMLInputElement;
    this.filteredItems = [];
    if (this.show) {
      this.select();
    }
    const rect = input.getBoundingClientRect();
    this.position.x = rect.x;
    this.position.y = rect.y + rect.height;
    this.items = items;
    this.show = true;
    input.addEventListener("blur", this.blur);
    input.addEventListener("input", this.input);
    this.input();
  }
  blur() {
    this.show = false;
    if (this.target) {
      this.target.removeEventListener("blur", this.blur);
      this.target.removeEventListener("input", this.input);
    }
  }
  input() {
    if (!this.show || !this.target) {
      return;
    }
    this.currentIndex = -1;
    const value = this.target.innerText.toLowerCase().trim();
    if (value == "") {
      this.filteredItems = [];
      return;
    }
    this.filteredItems = this.items.filter((item) => {
      item = item.toLowerCase();
      return item.indexOf(value) >= 0 && item != value;
    }).sort((a, b) => {
      const ai = a.toLowerCase().indexOf(value);
      const bi = b.toLowerCase().indexOf(value);
      if (ai == bi) {
        return a.length - b.length;
      }
      return ai - bi;
    });
  }
  select(item?: string) {
    if (this.show && item && this.target) {
      this.target.innerText = item;
      this.target.dispatchEvent(new Event('input'));
    }
  }
}
</script>
