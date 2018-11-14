"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs-extra");
let LogStream;
exports.LogSetFile = (file) => {
    if (typeof LogStream !== "undefined")
        LogStream.end();
    LogStream = fs.createWriteStream(file, { flags: "a", encoding: "utf8" });
};
const StringToIterable = function* (str, prefix) {
    if (str.length === 0)
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
const LogAny = (message, prefix) => {
    for (const line of StringToIterable(message, prefix)) {
        console.log(line);
        if (typeof LogStream !== "undefined")
            LogStream.write(line + "\n");
    }
};
exports.LogDebug = (message) => {
    LogAny(message, "DBG");
};
exports.LogMessage = (message) => {
    LogAny(message, "MSG");
};
exports.LogWarning = (message) => {
    LogAny(message, "WRN");
};
exports.LogError = (message) => {
    LogAny(message, "ERR");
};
