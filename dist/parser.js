"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const log_1 = require("./log");
const INCLUDE_DIRECTIVE = "!#include ";
const StringToIterable = function* (str) {
    const lines = str.split(/\r?\n/);
    for (let line of lines)
        yield line;
};
exports.ParserValidateRaw = (data) => {
    data = data.trim();
    if (data.startsWith("<")) {
        log_1.LogError("Validation Error: A filter should not begin with '<'");
        return false;
    }
    return true;
};
class ParserResolveInclude {
    static ValidateManifestEntry(entry) {
        if (entry.IsSubfilter)
            assert(typeof entry.Parent === "string" || typeof entry.Original === "string");
    }
    constructor(manifest) {
        this.ParentToChildMap = new Map();
        for (const entry of manifest) {
            if (!entry.IsSubfilter)
                continue;
            ParserResolveInclude.ValidateManifestEntry(entry);
            if (!this.ParentToChildMap.has(entry.Parent))
                this.ParentToChildMap.set(entry.Parent, new Map());
            const map = this.ParentToChildMap.get(entry.Parent);
            map.set(entry.Original, entry.Name);
        }
    }
    Resolve(entry, data) {
        ParserResolveInclude.ValidateManifestEntry(entry);
        let map = this.ParentToChildMap.get(entry.Name);
        if (typeof map === "undefined")
            map = new Map();
        const out = [];
        const matched = new Set();
        for (const line of StringToIterable(data)) {
            if (!line.startsWith(INCLUDE_DIRECTIVE)) {
                out.push(line);
                continue;
            }
            const original = line.substring(INCLUDE_DIRECTIVE.length).trim();
            if (!map.has(original)) {
                log_1.LogWarning("Subresource '" + original + "' of '" + entry.Name + "' is not recognized");
                continue;
            }
            out.push(INCLUDE_DIRECTIVE + map.get(original));
            matched.add(original);
        }
        if (out.length === 0 || out[out.length - 1].length > 0)
            out.push("");
        for (const [key] of map) {
            if (!matched.has(key))
                log_1.LogWarning("Subresource '" + key + "' of '" + entry.Name + "' does not exist");
        }
        return out.join("\n");
    }
}
exports.ParserResolveInclude = ParserResolveInclude;
;