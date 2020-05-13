"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParserResolveInclude = exports.ParserComparatorRaw = exports.ParserValidateRaw = void 0;
const assert = require("assert");
const log_1 = require("./log");
const INCLUDE_DIRECTIVE = "!#include ";
const StringToIterable = function* (str) {
    const lines = str.split(/\r?\n/);
    for (const line of lines)
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
class ParserComparatorRaw {
    static Normalize(data) {
        const out = [];
        for (let line of StringToIterable(data)) {
            line = line.trim();
            if (line.length === 0)
                continue;
            if (/^(?:!|# )[\t ]*Title[\t ]*:/i.test(line) ||
                /^(?:!|# )[\t ]*Expires[\t ]*:/i.test(line) ||
                line.startsWith("!#")) {
                out.push(line);
                continue;
            }
            if (line.startsWith("!"))
                continue;
            if (line === "#" || line.startsWith("# "))
                continue;
            out.push(line);
        }
        return out.join("\n");
    }
    AreEqual(a, b) {
        return ParserComparatorRaw.Normalize(a) === ParserComparatorRaw.Normalize(b);
    }
}
exports.ParserComparatorRaw = ParserComparatorRaw;
class ParserResolveInclude {
    constructor(manifest) {
        this.ParentToChild = new Map();
        for (const entry of manifest) {
            if (!entry.IsSubfilter)
                continue;
            ParserResolveInclude.ValidateManifestEntry(entry);
            if (!this.ParentToChild.has(entry.Parent))
                this.ParentToChild.set(entry.Parent, new Map());
            const map = this.ParentToChild.get(entry.Parent);
            map.set(entry.Original, entry.Name);
        }
    }
    static ValidateManifestEntry(entry) {
        if (entry.IsSubfilter)
            assert(typeof entry.Parent === "string" || typeof entry.Original === "string");
    }
    Resolve(entry, data) {
        ParserResolveInclude.ValidateManifestEntry(entry);
        let map = this.ParentToChild.get(entry.Name);
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
                log_1.LogWarning("Subresource '" + original + "' of '" + entry.Name + "' is not in the " +
                    "manifest");
                continue;
            }
            out.push(INCLUDE_DIRECTIVE + map.get(original));
            matched.add(original);
        }
        if (out.length === 0 || out[out.length - 1].length > 0)
            out.push("");
        for (const [key] of map) {
            if (!matched.has(key)) {
                log_1.LogWarning("Subresource '" + key + "' of '" + entry.Name + "' is not in the source " +
                    "filter");
            }
        }
        return out.join("\n");
    }
}
exports.ParserResolveInclude = ParserResolveInclude;
;
