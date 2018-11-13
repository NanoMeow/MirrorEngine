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

import { LogWarning } from "./log";
import { RequestResponse, RequestEngine } from "./request";

// --------------------------------------------------------------------------------------------- //

export interface ConfigManifestEntry {
    Name: string,
    Links: string[],
}

const ConfigManifestNameOverride: Map<string, string> = new Map<string, string>([
    ["public_suffix_list.dat", "public-suffix-list.txt"],
    ["awrl-0", "adblock-warning-removal-list.txt"],
    ["spam404-0", "spam404.txt"],
    ["fanboy-thirdparty_social", "fanboy-thirdparty-social.txt"],

    ["ara-0", "ARA-0.txt"],
    ["spa-0", "SPA-0.txt"],
    ["spa-1", "SPA-1.txt"],
]);

const ConfigManifestLinkBlacklist: Set<string> = new Set<string>([

    "https://gitcdn.xyz/repo/NanoMeow/MDLMirror/master/hosts.txt",
    "https://raw.githubusercontent.com/NanoMeow/MDLMirror/master/hosts.txt",
    "https://gitcdn.xyz/repo/NanoMeow/MDLMirror/master/filter.txt",
    "https://raw.githubusercontent.com/NanoMeow/MDLMirror/master/filter.txt",

    "https://road.adblock.ro/lista.txt",

]);

// --------------------------------------------------------------------------------------------- //

interface ConfigFile {
    User: string,
    Repo: string,

    Secret: string, // Base 64 encoded "user:token"

    Data: string, // Link to "assets.json"
    Lock: string, // Link to "lockfile"
}

export interface ConfigData extends ConfigFile {
    Manifest: ConfigManifestEntry[],
}

// --------------------------------------------------------------------------------------------- //

const ConfigParse = (data: string): ConfigData => {
    const parsed: any = JSON.parse(data);

    if (parsed instanceof Object === false)
        throw new Error("Configuration File Error: Object expected at root level");

    if (
        typeof parsed.User !== "string" ||
        typeof parsed.Repo !== "string" ||
        typeof parsed.Secret !== "string" ||
        typeof parsed.Data !== "string" ||
        !parsed.Data.startsWith("https://") ||
        typeof parsed.Lock !== "string" ||
        !parsed.Lock.startsWith("https://")
    ) {
        throw new Error("Configuration File Error: Invalid or missing fields");
    }

    return {
        User: parsed.User,
        Repo: parsed.Repo,
        Secret: parsed.Secret,
        Data: parsed.Data,
        Lock: parsed.Lock,
        Manifest: [],
    };
};

// --------------------------------------------------------------------------------------------- //

const ConfigManifestNormalizeName = (key: string): string => {
    if (ConfigManifestNameOverride.has(key))
        return <string>ConfigManifestNameOverride.get(key);

    if (key.includes("."))
        return key;
    else
        return key + ".txt";
};

const ConfigManifestNormalizeLinks = (links: any): string[] => {
    if (typeof links === "string")
        links = [links];

    if (!Array.isArray(links))
        throw new Error("Manifest Error: String or string array expected for 'contentURL'");

    return links.filter((l: any): boolean => {
        if (typeof l !== "string")
            return false;

        if (!l.startsWith("https://"))
            return false;

        if (ConfigManifestLinkBlacklist.has(l))
            return false;

        return true;
    });
};

const ConfigManifestParse = (data: string | undefined): ConfigManifestEntry[] => {
    if (typeof data === "undefined")
        throw new Error("Manifest Error: Network error");

    const parsed: any = JSON.parse(data);
    if (parsed instanceof Object === false)
        throw new Error("Manifest Error: Object expected at root level");

    let out: ConfigManifestEntry[] = [];

    for (const key in parsed) {
        const entry: any = parsed[key];

        if (entry instanceof Object === false)
            throw new Error("Manifest Error: Object expected for '" + key + "'");

        const normalized: ConfigManifestEntry = {
            Name: ConfigManifestNormalizeName(key),
            Links: ConfigManifestNormalizeLinks(entry.contentURL),
        };

        if (normalized.Links.length === 0)
            LogWarning("Manifest Warning: No valid links found for '" + normalized.Name + "'");
        else
            out.push(normalized);
    }

    return out;
};

// --------------------------------------------------------------------------------------------- //

export const ConfigLoad = async (file: string): Promise<ConfigData> => {
    const config: ConfigData = ConfigParse(await fs.readFile(file, "utf8"));

    const requester: RequestEngine = new RequestEngine();
    const response: RequestResponse = await requester.Get(config.Data)
    config.Manifest = ConfigManifestParse(response.Text);

    return config;
};

// --------------------------------------------------------------------------------------------- //
