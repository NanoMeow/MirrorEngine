"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs-extra");
const log_1 = require("./log");
const request_1 = require("./request");
const IsObject = (data) => {
    return typeof data === "object" && data !== null;
};
exports.ConfigTextToIterable = function* (str) {
    const lines = str.split("\n");
    for (let line of lines) {
        line = line.trim();
        if (line.length === 0 || line.startsWith("# "))
            continue;
        yield line;
    }
};
const ConfigStringNonEmpty = (data) => {
    if (typeof data !== "string")
        return false;
    if (data.length === 0)
        return false;
    return true;
};
const ConfigLinkValid = (data) => {
    if (!ConfigStringNonEmpty(data))
        return false;
    if (!data.startsWith("https://"))
        return false;
    return true;
};
const ConfigParse = (data) => {
    const parsed = JSON.parse(data);
    if (!IsObject(parsed))
        throw new Error("Configuration Error: Object expected");
    if (!ConfigStringNonEmpty(parsed.User) ||
        !ConfigStringNonEmpty(parsed.Repo) ||
        !ConfigStringNonEmpty(parsed.Secret) ||
        !ConfigLinkValid(parsed.BaseManifest) ||
        !ConfigLinkValid(parsed.IncludeManifest) ||
        !ConfigLinkValid(parsed.Lockfile) ||
        !ConfigLinkValid(parsed.NameOverride) ||
        !ConfigLinkValid(parsed.LinkBlacklist)) {
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
const ConfigRemoteRequest = async (requester, link) => {
    const res = await requester.Get(link);
    if (typeof res.Text === "undefined")
        throw new Error("Configuration Error: Could not load '" + link + "'");
    return res.Text;
};
const ConfigRemoteRequestAll = async (data) => {
    const requester = new request_1.RequestEngine();
    return {
        BaseManifest: await ConfigRemoteRequest(requester, data.BaseManifest),
        IncludeManifest: await ConfigRemoteRequest(requester, data.IncludeManifest),
        NameOverride: await ConfigRemoteRequest(requester, data.NameOverride),
        LinkBlacklist: await ConfigRemoteRequest(requester, data.LinkBlacklist),
    };
};
const ConfigRemoteResolveNameOverride = (data) => {
    const out = new Map();
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed))
        throw new Error("Configuration Error: Array expected");
    for (const elem of parsed) {
        const a = elem[0];
        const b = elem[1];
        if (typeof a !== "string" || typeof b !== "string")
            throw new Error("Configuration Error: String array of length 2 expected");
        out.set(a, b);
    }
    return out;
};
const ConfigRemoteResolveLinkBlacklist = (data) => {
    const out = new Set();
    for (const line of exports.ConfigTextToIterable(data))
        out.add(line);
    return out;
};
const ConfigRemoteResolveAll = (data) => {
    return {
        NameOverride: ConfigRemoteResolveNameOverride(data.NameOverride),
        LinkBlacklist: ConfigRemoteResolveLinkBlacklist(data.LinkBlacklist),
    };
};
const ConfigManifestResolveName = (key, config) => {
    if (config.NameOverride.has(key))
        return config.NameOverride.get(key);
    if (key.includes("."))
        return key;
    else
        return key + ".txt";
};
const ConfigManifestResolveLinks = (links, config) => {
    if (typeof links === "string")
        links = [links];
    if (!Array.isArray(links))
        throw new Error("Manifest Error: String or string array expected");
    return links.filter((link) => {
        if (typeof link !== "string")
            return false;
        if (!link.startsWith("https://"))
            return false;
        if (config.LinkBlacklist.has(link))
            return false;
        return true;
    });
};
const ConfigManifestParseBase = function* (data, config) {
    const parsed = JSON.parse(data);
    if (!IsObject(parsed))
        throw new Error("Manifest Error: Object expected");
    for (const key in parsed) {
        const name = ConfigManifestResolveName(key, config);
        const links = ConfigManifestResolveLinks(parsed[key].contentURL, config);
        if (links.length > 0) {
            yield {
                Name: name,
                Link: links[0],
                IsSubfilter: false,
            };
        }
        else {
            log_1.LogWarning("No valid link found for '" + name + "'");
        }
    }
};
const ConfigManifestParseInclude = function* (data) {
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed))
        throw new Error("Manifest Error: Array expected");
    for (const elem of parsed) {
        if (!ConfigStringNonEmpty(elem.Name) ||
            !ConfigLinkValid(elem.Link) ||
            !ConfigStringNonEmpty(elem.Parent) ||
            !ConfigStringNonEmpty(elem.Original)) {
            throw new Error("Manifest Error: Invalid manifest");
        }
        yield {
            Name: elem.Name,
            Link: elem.Link,
            IsSubfilter: true,
            Parent: elem.Parent,
            Original: elem.Original,
        };
    }
};
const ConfigManifestResolve = (data, config) => {
    const out = [];
    for (const elem of ConfigManifestParseBase(data.BaseManifest, config))
        out.push(elem);
    for (const elem of ConfigManifestParseInclude(data.IncludeManifest))
        out.push(elem);
    return out;
};
exports.ConfigLoad = async (file) => {
    const config = ConfigParse(await fs.readFile(file, "utf8"));
    const remote = await ConfigRemoteRequestAll(config);
    const resolved = ConfigRemoteResolveAll(remote);
    config.Manifest = ConfigManifestResolve(remote, resolved);
    return config;
};
