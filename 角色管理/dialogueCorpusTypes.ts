export interface DialogueSourceMeta {
  id: string;
  tag: string;
  relativePath: string;
  fileName: string;
}

export interface DialogueSource extends DialogueSourceMeta {
  content: string;
}

export interface DialogueCharacterIndex {
  character: string;
  characterCode?: string;
  folder: string;
  /** 靜態檔檔名（相對於 dialogue-corpus/）。開發用 API 不一定有。 */
  file?: string;
  sources: DialogueSourceMeta[];
}

export interface DialogueCharacterCorpus {
  character: string;
  characterCode?: string;
  folder: string;
  sources: DialogueSource[];
}
