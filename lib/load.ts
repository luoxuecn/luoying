import { cache } from "react";
import { getPlay, getVideo } from "./film";

export const loadVideo = cache((id: string) => getVideo(id));

export const loadPlay = cache((playId: string) => getPlay(new URLSearchParams({ playId })));
