import CaptureIndex from "@/renderer/components/VWCapture.vue";

import { WindowType } from "@/commons/datas/windowType";

import { create } from "@/renderer/windows/@base";

create(CaptureIndex, WindowType.CAPTURE);
