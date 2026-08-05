import { createSensitiveWordFilter, SensitiveWordFilter } from "./sensitive-word-filter";

describe("SensitiveWordFilter (batch)", () => {
    it("replaces all occurrences of configured words", () => {
        const filter = createSensitiveWordFilter({
            enabled: true,
            words: ["敏感词", "机密"],
            replacement: "***",
        });
        expect(filter.filterText("这是敏感词和机密内容")).toBe("这是***和***内容");
    });

    it("replaces multiple occurrences of the same word", () => {
        const filter = createSensitiveWordFilter({
            enabled: true,
            words: ["敏感词"],
        });
        expect(filter.filterText("敏感词一敏感词二")).toBe("***一***二");
    });

    it("matches ASCII Latin case-insensitively", () => {
        const filter = createSensitiveWordFilter({
            enabled: true,
            words: ["apikey"],
        });
        expect(filter.filterText("Your APIKEY is here and apiKey too")).toBe(
            "Your *** is here and *** too",
        );
    });

    it("prefers the longest match for overlapping words", () => {
        const filter = createSensitiveWordFilter({
            enabled: true,
            words: ["abc", "abcd"],
        });
        // "abcdabc" = longest "abcd" + separate "abc"; both are sensitive words.
        expect(filter.filterText("abcdabc")).toBe("******");
        // A clear non-overlap case: "abcd-abc" → both replaced.
        expect(filter.filterText("abcd-abc")).toBe("***-***");
    });

    it("handles overlapping words starting at the same position", () => {
        const filter = createSensitiveWordFilter({
            enabled: true,
            words: ["敏感", "敏感词"],
        });
        expect(filter.filterText("敏感词")).toBe("***");
    });

    it("does not split surrogate pairs (emoji)", () => {
        const filter = createSensitiveWordFilter({
            enabled: true,
            words: ["词"],
        });
        const input = "😀敏感词🎉";
        const output = filter.filterText(input);
        expect(output).toBe("😀敏感***🎉");
        // Emoji must remain intact (no replacement of lone surrogates).
        expect([...output]).toContain("😀");
        expect([...output]).toContain("🎉");
    });

    it("passes text through unchanged when disabled or no words", () => {
        expect(createSensitiveWordFilter(null).filterText("敏感词")).toBe("敏感词");
        expect(createSensitiveWordFilter({ enabled: true, words: [] }).filterText("敏感词")).toBe(
            "敏感词",
        );
        expect(
            createSensitiveWordFilter({ enabled: false, words: ["敏感词"] }).filterText("敏感词"),
        ).toBe("敏感词");
    });

    it("uses custom replacement string", () => {
        const filter = createSensitiveWordFilter({
            enabled: true,
            words: ["敏感词"],
            replacement: "【已屏蔽】",
        });
        expect(filter.filterText("这是敏感词")).toBe("这是【已屏蔽】");
    });

    it("does not match substrings inside a longer word", () => {
        const filter = createSensitiveWordFilter({
            enabled: true,
            words: ["敏感"],
        });
        // "敏感词" contains "敏感" so it IS matched; but "敏 感" with a space is not.
        expect(filter.filterText("敏感词")).toBe("***词");
        expect(filter.filterText("敏 感")).toBe("敏 感");
    });
});

describe("SensitiveWordFilter (streaming)", () => {
    it("replaces a word split across deltas", () => {
        const filter = new SensitiveWordFilter({
            enabled: true,
            words: ["敏感词"],
        });
        const stream = filter.createStream();
        // "这是敏": "这" is safe (no word starts there); "是敏" stays held back.
        expect(stream.push("这是敏")).toEqual(["这"]);
        expect(stream.push("感")).toEqual(["是"]);
        const out = stream.push("词和后面");
        expect(out.join("")).toBe("***和");
        expect(stream.flush()).toEqual(["后面"]);
    });

    it("streaming result equals batch result for the same corpus", () => {
        const words = ["敏感词", "机密", "apikey", "密码"];
        const corpus = [
            "今天天气不错。",
            "这段内容包含敏感词和机密信息。",
            "APIKEY 配置如下，请勿泄露。",
            "用户密码已经重置。",
            "短词也 ok。",
            "最后一段话。",
        ];
        const filter = new SensitiveWordFilter({ enabled: true, words });
        const batch = filter.filterText(corpus.join(""));

        const stream = filter.createStream();
        const chunks: string[] = [];
        for (const piece of corpus) {
            for (let i = 0; i < piece.length; i += 2) {
                chunks.push(...stream.push(piece.slice(i, i + 2)));
            }
        }
        chunks.push(...stream.flush());
        expect(chunks.join("")).toBe(batch);
    });

    it("handles single-character words with holdback", () => {
        const filter = new SensitiveWordFilter({ enabled: true, words: ["密"] });
        const stream = filter.createStream();
        const out = stream.push("密码");
        // With maxWordLen === 1 there is no holdback: everything emits immediately.
        expect(out.join("")).toBe("***码");
        expect(stream.flush()).toEqual([]);
    });

    it("flush emits trailing buffered text", () => {
        const filter = new SensitiveWordFilter({ enabled: true, words: ["敏感词"] });
        const stream = filter.createStream();
        expect(stream.push("尾")).toEqual([]);
        // "尾巴敏": "尾" is safe (no word starts with it); "巴敏" stays held back.
        expect(stream.push("巴敏")).toEqual(["尾"]);
        expect(stream.flush()).toEqual(["巴敏"]);
    });

    it("a word crossing the safe prefix boundary is fully held back", () => {
        const filter = new SensitiveWordFilter({ enabled: true, words: ["敏感词"] });
        const stream = filter.createStream();
        expect(stream.push("前敏")).toEqual([]);
        // "前敏" + "感": "前" is safe, "敏感" is held back (prefix of 敏感词).
        expect(stream.push("感")).toEqual(["前"]);
        // "敏感" + "词后": word 敏感词 now ends inside the holdback → nothing emits.
        expect(stream.push("词后")).toEqual([]);
        // "敏感词后" + "面": word is fully inside the flushed prefix → replaced.
        expect(stream.push("面").join("")).toBe("***");
        expect(stream.flush()).toEqual(["后面"]);
        // Streaming result equals the batch result for the whole corpus.
        expect(filter.filterText("前敏感词后面")).toBe("前***后面");
    });

    it("disabled stream passes everything through", () => {
        const stream = createSensitiveWordFilter(null).createStream();
        expect(stream.push("敏感词")).toEqual(["敏感词"]);
        expect(stream.flush()).toEqual([]);
    });
});
