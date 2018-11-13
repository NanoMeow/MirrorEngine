"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs-extra");
let LogStream = null;
exports.LogSetFile = (file) => {
    LogStream = fs.createWriteStream(file, { flags: "a", encoding: "utf8" });
};
const StringToIterable = function* (str, prefix) {
    if (str.trim().length === 0)
        return;
    const now = (new Date()).toUTCString();
    const lines = str.split("\n");
    for (let line of lines) {
        line = "[" + now + "] " + line;
        if (typeof prefix === "string")
            yield prefix + " " + line;
        else
            yield line;
    }
};
exports.LogDebug = (message) => {
    for (const line of StringToIterable(message, "DBG")) {
        console.log(line);
        if (LogStream !== null)
            LogStream.write(line + "\n");
    }
};
exports.LogMessage = (message) => {
    for (const line of StringToIterable(message, "MSG")) {
        console.log(line);
        if (LogStream !== null)
            LogStream.write(line + "\n");
    }
};
exports.LogWarning = (message) => {
    for (const line of StringToIterable(message, "WRN")) {
        console.warn(line);
        if (LogStream !== null)
            LogStream.write(line + "\n");
    }
};
exports.LogError = (message) => {
    for (const line of StringToIterable(message, "ERR")) {
        console.error(line);
        if (LogStream !== null)
            LogStream.write(line + "\n");
    }
};
