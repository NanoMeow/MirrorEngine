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
    Link: string,

    // Only for subfilters
    IsSubfilter: boolean,
    Parent?: string,
    Original?: string,
}

// --------------------------------------------------------------------------------------------- //

interface ConfigFile {
    User: string,
    Repo: string,
    Secret: string, // Base 64 encoded "user:token"

    BaseManifest: string,
    IncludeManifest: string,

    Lockfile: string,
    NameOverride: string,
    LinkBlacklist: string,
}

export interface ConfigData extends ConfigFile {
    Manifest: ConfigManifestEntry[],
}

// --------------------------------------------------------------------------------------------- //

interface ConfigFileRemote {
    BaseManifest: string,
    IncludeManifest: string,
    NameOverride: string,
    LinkBlacklist: string,
}

interface ConfigFileRemoteResolved {
    NameOverride: Map<string, string>,
    LinkBlacklist: Set<string>,
}

// --------------------------------------------------------------------------------------------- //

const IsObject = (data: any): boolean => {
    return typeof data === "object" && data !== null;
};

// --------------------------------------------------------------------------------------------- //

export const ConfigTextToIterable = function* (str: string): Iterable<string> {
    const lines: string[] = str.split("\n");

    for (let line of lines) {
        line = line.trim();

        if (line.length === 0 || line.startsWith("# "))
            continue

        yield line;
    }
};

// --------------------------------------------------------------------------------------------- //

const ConfigNonEmptyString = (data: any): boolean => {
    if (typeof data !== "string")
        return false;

    if (data.length === 0)
        return false;

    return true;
};

const ConfigValidLink = (data: any): boolean => {
    if (!ConfigNonEmptyString(data))
        return false;

    if (!data.startsWith("https://"))
        return false;

    return true;
};

// --------------------------------------------------------------------------------------------- //

const ConfigParse = (data: string): ConfigData => {
    const parsed: any = JSON.parse(data);

    if (!IsObject(parsed))
        throw new Error("Configuration Error: Object expected");

    if (
        !ConfigNonEmptyString(parsed.User) ||
        !ConfigNonEmptyString(parsed.Repo) ||
        !ConfigNonEmptyString(parsed.Secret) ||
        !ConfigValidLink(parsed.BaseManifest) ||
        !ConfigValidLink(parsed.IncludeManifest) ||
        !ConfigValidLink(parsed.Lockfile) ||
        !ConfigValidLink(parsed.NameOverride) ||
        !ConfigValidLink(parsed.LinkBlacklist)
    ) {
        throw new Error("Configuration Error: Invalid configuration file");
    }

    return {
        User: parsed.User,
        Repo: parsed.Repo,
        Secret: parsed.Secret,
        BaseManifest: parsed.BaseManifest,
        IncludeManifest: parsed.IncludeManifest,
        Lockfile: parsed.Lockfile,
        NameOverride: parsed.NameOverride,
        LinkBlacklist: parsed.LinkBlacklist,
        Manifest: [],
    };
};

// --------------------------------------------------------------------------------------------- //

const ConfigRemoteRequest = async (requester: RequestEngine, link: string): Promise<string> => {
    const res: RequestResponse = await requester.Get(link);

    if (typeof res.Text === "undefined")
        throw new Error("Configuration Error: Could not load '" + link + "'");

    return res.Text;
}

const ConfigRemoteRequestAll = async (data: ConfigData): Promise<ConfigFileRemote> => {
    const requester = new RequestEngine();

    return {
        BaseManifest: await ConfigRemoteRequest(requester, data.BaseManifest),
        IncludeManifest: await ConfigRemoteRequest(requester, data.IncludeManifest),
        NameOverride: await ConfigRemoteRequest(requester, data.NameOverride),
        LinkBlacklist: await ConfigRemoteRequest(requester, data.LinkBlacklist),
    };
};

// --------------------------------------------------------------------------------------------- //

const ConfigRemoteResolveNameOverride = (data: string): Map<string, string> => {
    const out = new Map<string, string>();
    const parsed = JSON.parse(data);

    if (!Array.isArray(parsed))
        throw new Error("Configuration Error: Array expected");

    for (const elem of parsed) {
        const a: any = elem[0];
        const b: any = elem[1];

        if (typeof a !== "string" || typeof b !== "string")
            throw new Error("Configuration Error: String array of length 2 expected");

        out.set(a, b);
    }

    return out;
};

const ConfigRemoteResolveLinkBlacklist = (data: string): Set<string> => {
    const out = new Set<string>();

    for (const line of ConfigTextToIterable(data))
        out.add(line);

    return out;
};

const ConfigRemoteResolveAll = (data: ConfigFileRemote): ConfigFileRemoteResolved => {
    return {
        NameOverride: ConfigRemoteResolveNameOverride(data.NameOverride),
        LinkBlacklist: ConfigRemoteResolveLinkBlacklist(data.LinkBlacklist),
    };
};

// --------------------------------------------------------------------------------------------- //

const ConfigManifestResolveName = (key: string, config: ConfigFileRemoteResolved): string => {
    if (config.NameOverride.has(key))
        return <string>config.NameOverride.get(key);

    if (key.includes("."))
        return key;
    else
        return key + ".txt";
};

const ConfigManifestResolveLinks = (links: any, config: ConfigFileRemoteResolved): string[] => {
    if (typeof links === "string")
        links = [links];

    if (!Array.isArray(links))
        throw new Error("Manifest Error: String or string array expected");

    return links.filter((link: any): boolean => {
        if (typeof link !== "string")
            return false;

        if (!link.startsWith("https://"))
            return false;

        if (config.LinkBlacklist.has(link))
            return false;

        return true;
    });
};

// --------------------------------------------------------------------------------------------- //

const ConfigManifestParseBase = function* (
    data: string,
    config: ConfigFileRemoteResolved,
): Iterable<ConfigManifestEntry> {

    const parsed = JSON.parse(data);

    if (!IsObject(parsed))
        throw new Error("Manifest Error: Object expected");

    for (const key in parsed) {
        const name: string = ConfigManifestResolveName(key, config);
        const links: string[] = ConfigManifestResolveLinks(parsed[key].contentURL, config);

        if (links.length > 0) {
            yield {
                Name: name,
                Link: links[0],

                IsSubfilter: false,
            }
        } else {
            LogWarning("No valid link found for '" + name + "'");
        }
    }

};

const ConfigManifestParseInclude = function* (data: string): Iterable<ConfigManifestEntry> {

    const parsed = JSON.parse(data);

    if (!Array.isArray(parsed))
        throw new Error("Manifest Error: Array expected");

    for (const elem of parsed) {
        if (
            !ConfigNonEmptyString(elem.Name) ||
            !ConfigValidLink(elem.Link) ||
            !ConfigNonEmptyString(elem.Parent) ||
            !ConfigNonEmptyString(elem.Original)
        ) {
            throw new Error("Manifest Error: Invalid manifest");
        }

        yield {
            Name: elem.Name,
            Link: elem.Link,

            IsSubfilter: true,
            Parent: elem.Parent,
            Original: elem.Original,
        }
    }

};

// --------------------------------------------------------------------------------------------- //

const ConfigManifestResolve = (
    data: ConfigFileRemote,
    config: ConfigFileRemoteResolved,
): ConfigManifestEntry[] => {

    const out: ConfigManifestEntry[] = [];

    for (const elem of ConfigManifestParseBase(data.BaseManifest, config))
        out.push(elem);

    for (const elem of ConfigManifestParseInclude(data.IncludeManifest))
        out.push(elem);

    return out;

};

// --------------------------------------------------------------------------------------------- //

export const ConfigLoad = async (file: string): Promise<ConfigData> => {
    const config: ConfigData = ConfigParse(await fs.readFile(file, "utf8"));
    const remote: ConfigFileRemote = await ConfigRemoteRequestAll(config);
    const resolved: ConfigFileRemoteResolved = ConfigRemoteResolveAll(remote);
    config.Manifest = ConfigManifestResolve(remote, resolved);
    return config;
};

// --------------------------------------------------------------------------------------------- //
