"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const log_1 = require("./log");
const INCLUDE_DIRECTIVE = "!#include ";
const StringToIterable = function* (str) {
    const lines = str.split("\n");
    for (let line of lines)
        yield line.trim();
};
class ParserIncludeResolver {
    static ValidateManifestEntry(entry) {
        if (entry.IsSubfilter)
            assert(typeof entry.Parent === "string" || typeof entry.Original === "string");
    }
    constructor(manifest) {
        this.ParentToChildMap = new Map();
        for (const entry of manifest) {
            if (!entry.IsSubfilter)
                continue;
            ParserIncludeResolver.ValidateManifestEntry(entry);
            if (!this.ParentToChildMap.has(entry.Parent))
                this.ParentToChildMap.set(entry.Parent, new Map());
            const map = this.ParentToChildMap.get(entry.Parent);
            map.set(entry.Original, entry.Name);
        }
    }
    Resolve(entry, data) {
        ParserIncludeResolver.ValidateManifestEntry(entry);
        const map = this.ParentToChildMap.get(entry.Name);
        const out = [];
        for (const line of StringToIterable(data)) {
            if (!line.startsWith(INCLUDE_DIRECTIVE)) {
                out.push(line);
                continue;
            }
            const original = line.substring(INCLUDE_DIRECTIVE.length).trim();
            if (!map.has(original)) {
                log_1.LogWarning("Could not process include directive '" + line + "'");
                continue;
            }
            out.push(INCLUDE_DIRECTIVE + map.get(original));
        }
        if (out.length === 0 || out[out.length - 1].length !== 0)
            out.push("");
        return out.join("\n");
    }
}
exports.ParserIncludeResolver = ParserIncludeResolver;
;
