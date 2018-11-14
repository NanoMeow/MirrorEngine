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

// Resource parsing utility

// --------------------------------------------------------------------------------------------- //

"use strict";

// --------------------------------------------------------------------------------------------- //

import * as assert from "assert";

import { ConfigManifestEntry } from "./config";
import { LogWarning } from "./log";

// --------------------------------------------------------------------------------------------- //

const INCLUDE_DIRECTIVE: string = "!#include ";

// --------------------------------------------------------------------------------------------- //

type StrToStr = Map<string, string>;

// --------------------------------------------------------------------------------------------- //

const StringToIterable = function* (str: string): Iterable<string> {
    const lines: string[] = str.split(/\r?\n/);

    for (let line of lines)
        yield line;
};

// --------------------------------------------------------------------------------------------- //

export class ParserIncludeResolver {

    // ----------------------------------------------------------------------------------------- //

    // Parent to a map, then child original name to override name
    private ParentToChildMap: Map<string, StrToStr>;

    // ----------------------------------------------------------------------------------------- //

    private static ValidateManifestEntry(entry: ConfigManifestEntry): void {
        if (entry.IsSubfilter)
            assert(typeof entry.Parent === "string" || typeof entry.Original === "string");
    }

    // ----------------------------------------------------------------------------------------- //

    constructor(manifest: ConfigManifestEntry[]) {
        this.ParentToChildMap = new Map<string, StrToStr>();

        for (const entry of manifest) {
            if (!entry.IsSubfilter)
                continue;

            ParserIncludeResolver.ValidateManifestEntry(entry);

            if (!this.ParentToChildMap.has(<string>entry.Parent))
                this.ParentToChildMap.set(<string>entry.Parent, new Map<string, string>());

            const map: StrToStr = <StrToStr>this.ParentToChildMap.get(<string>entry.Parent);
            map.set(<string>entry.Original, entry.Name);
        }
    }

    // ----------------------------------------------------------------------------------------- //

    public Resolve(entry: ConfigManifestEntry, data: string): string {
        ParserIncludeResolver.ValidateManifestEntry(entry);

        let map: StrToStr | undefined = <StrToStr>this.ParentToChildMap.get(<string>entry.Name);
        if (typeof map === "undefined")
            map = new Map<string, string>();

        const out: string[] = [];

        for (const line of StringToIterable(data)) {
            if (!line.startsWith(INCLUDE_DIRECTIVE)) {
                out.push(line);
                continue;
            }

            const original: string = line.substring(INCLUDE_DIRECTIVE.length).trim();

            if (!map.has(original)) {
                LogWarning("Could not process include directive '" + line + "'");
                // Do not push the line, all include directives must be explicitly whitelisted
                continue;
            }

            out.push(INCLUDE_DIRECTIVE + map.get(original));
        }

        if (out.length === 0 || out[out.length - 1].length > 0)
            out.push(""); // Ensure file ends with new line

        return out.join("\n");
    }

    // ----------------------------------------------------------------------------------------- //

};

// --------------------------------------------------------------------------------------------- //
