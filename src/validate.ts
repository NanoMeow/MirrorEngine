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

// Content validation utility

// --------------------------------------------------------------------------------------------- //

"use strict";

// --------------------------------------------------------------------------------------------- //

import { LogError } from "./log";

// --------------------------------------------------------------------------------------------- //

const ValidateAlphanumeric: RegExp = /^[a-zA-Z0-9]*$/;

const ValidateWhitelist: Set<string> = new Set<string>([
]);

// --------------------------------------------------------------------------------------------- //

const StringToIterable = function* (str: string): Iterable<string> {
    const lines: string[] = str.split("\n");

    for (let line of lines) {
        line = line.trim();

        if (line.length > 0)
            yield line;
    }
};

// --------------------------------------------------------------------------------------------- //

export const ValidateFilter = (data: string): boolean => {

    // ----------------------------------------------------------------------------------------- //

    data = data.trim();

    // ----------------------------------------------------------------------------------------- //

    if (data.startsWith("<")) {
        LogError("Validation Error: A filter should not begin with '<'");
        return false;
    }

    // ----------------------------------------------------------------------------------------- //

    let passed: boolean = true;

    for (let f of StringToIterable(data)) {
        if (f.length < 4 && ValidateAlphanumeric.test(f) && !ValidateWhitelist.has(f)) {
            LogError("Validation Error: Rule '" + f + "' was flagged for manual review");
            passed = false;
        }
    }

    return passed;

    // ----------------------------------------------------------------------------------------- //

};

// --------------------------------------------------------------------------------------------- //
