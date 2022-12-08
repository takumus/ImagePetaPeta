import { EventMap } from "typed-emitter";

import { PFileObjectContent } from "@/renderer/utils/pFileObject/pFileObjectContent";

export abstract class PPlayableFileObjectContent<
  T extends EventMap | unknown,
> extends PFileObjectContent<
  T & {
    paused: (paused: boolean) => void;
    time: () => void;
    speed: () => void;
  }
> {
  abstract getPaused(): boolean;
  abstract setPaused(paused: boolean): Promise<void>;
  abstract getDuration(): number;
  abstract getSeekable(): boolean;

  abstract getCurrentTime(): number;
  abstract setCurrentTime(currentTime: number): void;

  abstract getSpeed(): number;
  abstract setSpeed(speed: number): void;
}
