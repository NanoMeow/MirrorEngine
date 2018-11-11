"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const StringToIterable = function* (str) {
    if (str.trim().length === 0)
        return;
    const now = (new Date()).toUTCString();
    const lines = str.split("\n");
    for (const line of lines)
        yield "[" + now + "] " + line;
};
exports.LogMessage = (message) => {
    for (const line of StringToIterable(message))
        console.log("MSG " + line);
};
exports.LogWarning = (message) => {
    for (const line of StringToIterable(message))
        console.warn("WRN " + line);
};
exports.LogError = (message) => {
    for (const line of StringToIterable(message))
        console.error("ERR " + line);
};
