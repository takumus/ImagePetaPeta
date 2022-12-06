import { EventMap } from "typed-emitter";

import { PFileObjectContent } from "@/renderer/utils/pFileObject/pFileObjectContent";

export abstract class PPlayableFileObjectContent<
  T extends EventMap | unknown,
> extends PFileObjectContent<
  T & {
    play: () => void;
    pause: () => void;
    time: () => void;
  }
> {
  abstract play(): void;
  abstract pause(): void;
  abstract getPaused(): boolean;
  abstract getDuration(): number;
  abstract getCurrentTime(): number;
  abstract getSeekable(): boolean;
  abstract setCurrentTime(currentTime: number): void;
}
