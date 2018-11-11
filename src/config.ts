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

// Configuration utility

// --------------------------------------------------------------------------------------------- //

"use strict";

// --------------------------------------------------------------------------------------------- //

import * as fs from "fs-extra";
import * as os from "os";
import * as path from "path";

import { LogWarning } from "./log";
import { RequestEngine } from "./request";

// --------------------------------------------------------------------------------------------- //

export interface ConfigManifestEntry {
    Name: string,
    Links: string[],
}

export interface ConfigData {
    User: string,
    Repo: string,

    Secret: string, // Base 64 encoded "user:pass" or "user:token"
    Data: string, // Link to "assets.json"

    Manifest: ConfigManifestEntry[], // Filled at runtime
}

// --------------------------------------------------------------------------------------------- //

const ConfigManifestNameOverride: Map<string, string> = new Map<string, string>([
    ["public_suffix_list.dat", "public-suffix-list.txt"],
    ["awrl-0", "adblock-warning-removal-list.txt"],
    ["spam404-0", "spam404.txt"],
    ["fanboy-thirdparty_social", "fanboy-thirdparty-social.txt"],

    ["ara-0", "ARA-0.txt"],
    ["spa-0", "SPA-0.txt"],
    ["spa-1", "SPA-1.txt"],
]);

// --------------------------------------------------------------------------------------------- //

const ConfigParse = (data: string): ConfigData => {
    const parsed: any = JSON.parse(data);

    if (parsed instanceof Object === false)
        throw new Error("Invalid Configuration File: Object expected");

    if (
        typeof parsed.User !== "string" ||
        typeof parsed.Repo !== "string" ||
        typeof parsed.Secret !== "string" ||
        typeof parsed.Data !== "string"
    ) {
        throw new Error("Invalid Configuration File: Invalid or missing fields");
    }

    return {
        User: parsed.User,
        Repo: parsed.Repo,
        Secret: parsed.Secret,
        Data: parsed.Data,
        Manifest: [],
    };
};

// --------------------------------------------------------------------------------------------- //

const ConfigManifestNormalizeName = (key: string): string => {
    if (ConfigManifestNameOverride.has(key))
        return <string>ConfigManifestNameOverride.get(key);

    if (key.includes("."))
        return key;

    return key + ".txt";
};

const ConfigManifestNormalizeLinks = (links: any): string[] => {
    if (typeof links === "string")
        links = [links];

    if (!Array.isArray(links))
        throw new Error("Invalid Manifest: String or array expected for 'contentURL'");

    return links.filter((l: string): boolean => l.startsWith("https://"));
};

const ConfigManifestParse = (data: null | string): ConfigManifestEntry[] => {
    if (data === null)
        throw new Error("Failed to Load Manifest");

    const parsed: any = JSON.parse(data);

    if (parsed instanceof Object === false)
        throw new Error("Invalid Manifest: Object expected");

    let out: ConfigManifestEntry[] = [];

    for (const key in parsed) {
        const entry: any = parsed[key];

        if (entry instanceof Object === false)
            throw new Error("Invalid manifest: Object expected for key '" + key + "'");

        const normalized: ConfigManifestEntry = {
            Name: ConfigManifestNormalizeName(key),
            Links: ConfigManifestNormalizeLinks(entry.contentURL),
        };

        if (normalized.Links.length === 0)
            LogWarning("No Valid Links Found for '" + normalized.Name + "'");
        else
            out.push(normalized);
    }

    return out;
};

// --------------------------------------------------------------------------------------------- //

export const ConfigLoad = async (): Promise<ConfigData> => {
    const home: string = os.homedir();
    const file: string = path.resolve(home, "mirror-engine-config.json");

    const config: ConfigData = ConfigParse(await fs.readFile(file, "utf8"));

    const requester = new RequestEngine();
    config.Manifest = ConfigManifestParse(await requester.Get(config.Data));

    return config;
};

// --------------------------------------------------------------------------------------------- //
