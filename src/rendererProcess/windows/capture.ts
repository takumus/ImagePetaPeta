import CaptureIndex from "@/rendererProcess/components/VWCapture.vue";
import { create } from "@/rendererProcess/windows/@create";
import { WindowType } from "@/commons/datas/windowType";
create(CaptureIndex, WindowType.CAPTURE);
