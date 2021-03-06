// --------------------------------------------------------------------------------------------- //

// MIT License
//
// Copyright (c) 2018 Hugo Xu
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
// IN THE SOFTWARE.

// --------------------------------------------------------------------------------------------- //

// Logging utility

// --------------------------------------------------------------------------------------------- //

"use strict";

// --------------------------------------------------------------------------------------------- //

import * as fs from "fs-extra";

// --------------------------------------------------------------------------------------------- //

let LogStream: fs.WriteStream | undefined;

export const LogSetFile = (file: string): void => {
    if (typeof LogStream !== "undefined")
        LogStream.end();

    LogStream = fs.createWriteStream(file, { flags: "a", encoding: "utf8" });
};

// --------------------------------------------------------------------------------------------- //

const StringToIterable = function* (str: string, prefix?: string): Iterable<string> {
    if (str.length === 0)
        return;

    const now: string = (new Date()).toUTCString();
    const lines: string[] = str.split("\n");

    for (let line of lines) {
        line = "[" + now + "] " + line;

        if (typeof prefix === "string")
            yield prefix + " " + line;
        else
            yield line;
    }
};

const LogAny = (message: string, prefix: string): void => {
    for (const line of StringToIterable(message, prefix)) {
        console.log(line);

        if (typeof LogStream !== "undefined")
            LogStream.write(line + "\n");
    }
};

// --------------------------------------------------------------------------------------------- //

export const LogDebug = (message: string): void => {
    LogAny(message, "DBG");
};

export const LogMessage = (message: string): void => {
    LogAny(message, "MSG");
};

export const LogWarning = (message: string): void => {
    LogAny(message, "WRN");
};

export const LogError = (message: string): void => {
    LogAny(message, "ERR");
};

// --------------------------------------------------------------------------------------------- //
