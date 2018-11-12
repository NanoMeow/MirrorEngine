"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const log_1 = require("./log");
exports.ValidateFile = (data) => {
    data = data.trim();
    if (data.startsWith("<")) {
        log_1.LogError("Validation Error: A filter should not begin with '<'");
        return false;
    }
    return true;
};
