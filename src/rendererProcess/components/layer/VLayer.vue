<template>
  <article
    class="layer-root"
    v-show="visible"
    :style=" {
      zIndex: zIndex
    }"
  >
    <section class="layer">
      <ul>
        <li v-for="petaPanel in petaPanels" :key="petaPanel.pPanel.id" @click="clickPetaPanel(petaPanel.pPanel)">
          <div class="icon">
            =
          </div>
          <div class="icon">
            👁
          </div>
          <div class="icon">
            <input type="checkbox" v-model="petaPanel.pPanel.selected">
          </div>
          <div class="icon">
            🔒
          </div>
          <div
            :style="{
              backgroundImage: `url(${petaPanel.src})`
            }"
            class="image"
          >
          </div>
        </li>
      </ul>
    </section>
  </article>
</template>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Prop, Ref, Watch } from "vue-property-decorator";
// Others
import { v4 as uuid } from "uuid";
import { Keyboards } from "@/rendererProcess/utils/keyboards";
import { PetaBoard } from "@/commons/datas/petaBoard";
import { ImageType } from "@/commons/datas/imageType";
import { getImageURL } from "@/rendererProcess/utils/imageURL";
import { PetaPanel } from "@/commons/datas/petaPanel";
import { PPanel } from "../board/ppanels/PPanel";
@Options({
  components: {
    //
  },
  emits: [
    //
  ]
})
export default class VLayer extends Vue {
  @Prop()
  visible = true;
  @Prop()
  zIndex = 0;
  @Prop()
  pPanelsArray!: PPanel[];
  keyboards = new Keyboards();
  async mounted() {
    this.keyboards.enabled = true;
    this.keyboards.down(["escape"], this.pressEscape);
  }
  unmounted() {
    this.keyboards.destroy();
  }
  pressEscape(pressed: boolean) {
    //
  }
  clickPetaPanel(pPanel: PPanel) {
    console.log(pPanel);
    pPanel.selected = true;
  }
  get petaPanels() {
    if (!this.pPanelsArray) {
      return [];
    }
    return this.pPanelsArray.map((pPanel) => {
      return {
        pPanel,
        src: getImageURL(pPanel.petaPanel._petaImage, ImageType.THUMBNAIL)
      }
    }).sort((a, b) => {
      return b.pPanel.petaPanel.index - a.pPanel.petaPanel.index;
    });
  }
}
</script>

<style lang="scss" scoped>
.layer-root {
  background-color: var(--bg-color);
  border-radius: var(--rounded);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: fixed;
  right: 0px;
  bottom: 0px;
  box-shadow: 0px 0px 3px 1px rgba(0, 0, 0, 0.4);
  margin: 16px;
  height: 50%;
  >.content {
    flex: 1;
    overflow: hidden;
  }
  >.layer{
    overflow-x: hidden;
    overflow-y: auto;
    >ul {
      margin: 0px;
      padding: 0px;
      >li {
        cursor: pointer;
        margin: 0px;
        padding: 8px;
        background-color: var(--button-bg-color);
        display: flex;
        align-items: center;
        &:hover {
          background-color: var(--button-hover-bg-color);
        }
        >.icon {
          padding: 0px 8px;
        }
        >.image {
          width: 32px;
          height: 32px;
          background: no-repeat;
          background-position: center center;
          background-size: contain;
        }
      }
    }
  }
}
</style>