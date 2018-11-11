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
exports.LogMessage = (message) => {
    for (const line of StringToIterable(message, "MSG")) {
        if (LogStream === null)
            console.log(line);
        else
            LogStream.write(line + "\n");
    }
};
exports.LogWarning = (message) => {
    for (const line of StringToIterable(message, "WRN")) {
        if (LogStream === null)
            console.warn(line);
        else
            LogStream.write(line + "\n");
    }
};
exports.LogError = (message) => {
    for (const line of StringToIterable(message, "ERR")) {
        if (LogStream === null)
            console.error(line);
        else
            LogStream.write(line + "\n");
    }
};
