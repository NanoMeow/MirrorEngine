"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const StringToIterable = (str) => {
    if (str.trim().length === 0)
        return [];
    return str.split("\n");
};
exports.LogMessage = (message) => {
    for (const line of StringToIterable(message))
        console.log(line);
};
exports.LogWarning = (message) => {
    for (const line of StringToIterable(message))
        console.warn(line);
};
exports.LogError = (message) => {
    for (const line of StringToIterable(message))
        console.error(line);
};
