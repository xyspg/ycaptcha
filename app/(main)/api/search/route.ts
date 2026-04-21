import { createTokenizer as createJapaneseTokenizer } from "@orama/tokenizers/japanese";
import { createTokenizer as createMandarinTokenizer } from "@orama/tokenizers/mandarin";
import { createFromSource } from "fumadocs-core/search/server";
import { source } from "@/lib/source";

export const { GET } = createFromSource(source, {
  localeMap: {
    en: "english",
    "zh-CN": { components: { tokenizer: createMandarinTokenizer() } },
    ja: { components: { tokenizer: createJapaneseTokenizer() } },
  },
});
