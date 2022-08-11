import BrowserIndex from "@/rendererProcess/windows/browser.vue";
import { create } from "@/rendererProcess/windows/@create";
import { WindowType } from "@/commons/datas/windowType";
create(BrowserIndex, WindowType.BROWSER);