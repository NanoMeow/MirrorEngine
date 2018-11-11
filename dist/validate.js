"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const log_1 = require("./log");
const ValidatePureAlphanumeric = /^[a-zA-Z0-9]*$/;
const ValidateRuleWhitelist = new Set([]);
exports.ValidateFilter = (data) => {
    data = data.trim();
    if (data.startsWith("<")) {
        log_1.LogError("Integrity Guard: A filter should not begin with '<'");
        return false;
    }
    for (let f of data.split("\n")) {
        f = f.trim();
        if (f.length === 0)
            continue;
        if (f.length < 4 && ValidatePureAlphanumeric.test(f) && !ValidateRuleWhitelist.has(f)) {
            log_1.LogError("Integrity Guard: Rule '" + f + "' is flagged for manual review");
            return false;
        }
    }
    return true;
};
