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

import { ComparatorSimple } from "./comparator";
import { ConfigManifestEntry } from "./config";
import { LogWarning, LogError } from "./log";

// --------------------------------------------------------------------------------------------- //

const INCLUDE_DIRECTIVE: string = "!#include ";

// --------------------------------------------------------------------------------------------- //

type StrToStr = Map<string, string>;

// --------------------------------------------------------------------------------------------- //

const StringToIterable = function* (str: string): Iterable<string> {
    const lines: string[] = str.split(/\r?\n/);

    for (const line of lines)
        yield line;
};

// --------------------------------------------------------------------------------------------- //

export const ParserValidateRaw = (data: string): boolean => {
    data = data.trim();

    if (data.startsWith("<")) {
        LogError("Validation Error: A filter should not begin with '<'");
        return false;
    }

    return true;
};

// --------------------------------------------------------------------------------------------- //

export class ParserComparatorRaw implements ComparatorSimple<string> {

    private static Normalize(data: string): string {
        const out: string[] = [];

        for (let line of StringToIterable(data)) {
            line = line.trim();

            if (line.length === 0)
                continue;

            if (
                /^(?:!|# )[\t ]*Title[\t ]*:/i.test(line) ||
                /^(?:!|# )[\t ]*Expires[\t ]*:/i.test(line) ||
                line.startsWith("!#")
            ) {
                out.push(line);
                continue;
            }

            if (line.startsWith("!"))
                continue;

            if (line === "#" || line.startsWith("# "))
                continue;

            out.push(line);
        }

        return out.join("\n");
    }

    public AreEqual(a: string, b: string): boolean {
        return ParserComparatorRaw.Normalize(a) === ParserComparatorRaw.Normalize(b);
    }

}

// --------------------------------------------------------------------------------------------- //

export class ParserResolveInclude {

    // ----------------------------------------------------------------------------------------- //

    // Parent to a map, then child original name to override name
    private ParentToChild: Map<string, StrToStr> = new Map<string, StrToStr>();

    // ----------------------------------------------------------------------------------------- //

    private static ValidateManifestEntry(entry: ConfigManifestEntry): void {
        if (entry.IsSubfilter)
            assert(typeof entry.Parent === "string" || typeof entry.Original === "string");
    }

    // ----------------------------------------------------------------------------------------- //

    constructor(manifest: ConfigManifestEntry[]) {
        for (const entry of manifest) {
            if (!entry.IsSubfilter)
                continue;

            ParserResolveInclude.ValidateManifestEntry(entry);

            if (!this.ParentToChild.has(<string>entry.Parent))
                this.ParentToChild.set(<string>entry.Parent, new Map<string, string>());

            const map: StrToStr = <StrToStr>this.ParentToChild.get(<string>entry.Parent);
            map.set(<string>entry.Original, entry.Name);
        }
    }

    // ----------------------------------------------------------------------------------------- //

    public Resolve(entry: ConfigManifestEntry, data: string): string {
        ParserResolveInclude.ValidateManifestEntry(entry);

        let map: StrToStr | undefined = <StrToStr>this.ParentToChild.get(<string>entry.Name);
        if (typeof map === "undefined")
            map = new Map<string, string>();

        const out: string[] = [];
        const matched: Set<string> = new Set<string>();

        for (const line of StringToIterable(data)) {
            if (!line.startsWith(INCLUDE_DIRECTIVE)) {
                out.push(line);
                continue;
            }

            const original: string = line.substring(INCLUDE_DIRECTIVE.length).trim();

            if (!map.has(original)) {
                // Do not push the line, all include directives must be explicitly whitelisted
                LogWarning(
                    "Subresource '" + original + "' of '" + entry.Name + "' is not in the " +
                    "manifest",
                );
                continue;
            }

            out.push(INCLUDE_DIRECTIVE + map.get(original));
            matched.add(original);
        }

        // TODO: Is it good to push a new line when the output would be an empty string?
        if (out.length === 0 || out[out.length - 1].length > 0)
            out.push(""); // Ensure file ends with new line

        for (const [key] of map) {
            if (!matched.has(key)) {
                LogWarning(
                    "Subresource '" + key + "' of '" + entry.Name + "' is not in the source " +
                    "filter",
                );
            }
        }

        return out.join("\n");
    }

    // ----------------------------------------------------------------------------------------- //

};

// --------------------------------------------------------------------------------------------- //
