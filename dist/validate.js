"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const log_1 = require("./log");
const ValidateAlphanumeric = /^[a-zA-Z0-9]*$/;
const ValidateWhitelist = new Set([]);
const StringToIterable = function* (str) {
    const lines = str.split("\n");
    for (let line of lines) {
        line = line.trim();
        if (line.length > 0)
            yield line;
    }
};
exports.ValidateFilter = (data) => {
    data = data.trim();
    if (data.startsWith("<")) {
        log_1.LogError("Validation Error: A filter should not begin with '<'");
        return false;
    }
    let passed = true;
    for (let f of StringToIterable(data)) {
        if (f.length < 4 && ValidateAlphanumeric.test(f) && !ValidateWhitelist.has(f)) {
            log_1.LogError("Validation Error: Rule '" + f + "' was flagged for manual review");
            passed = false;
        }
    }
    return passed;
};
