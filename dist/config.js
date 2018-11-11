"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs-extra");
const log_1 = require("./log");
const request_1 = require("./request");
const ConfigManifestNameOverride = new Map([
    ["public_suffix_list.dat", "public-suffix-list.txt"],
    ["awrl-0", "adblock-warning-removal-list.txt"],
    ["spam404-0", "spam404.txt"],
    ["fanboy-thirdparty_social", "fanboy-thirdparty-social.txt"],
    ["ara-0", "ARA-0.txt"],
    ["spa-0", "SPA-0.txt"],
    ["spa-1", "SPA-1.txt"],
]);
const ConfigParse = (data) => {
    const parsed = JSON.parse(data);
    if (parsed instanceof Object === false)
        throw new Error("Configuration File Error: Object expected at root level");
    if (typeof parsed.User !== "string" ||
        typeof parsed.Repo !== "string" ||
        typeof parsed.Secret !== "string" ||
        typeof parsed.Data !== "string" ||
        !parsed.Data.startsWith("https://")) {
        throw new Error("Configuration File Error: Invalid or missing fields");
    }
    return {
        User: parsed.User,
        Repo: parsed.Repo,
        Secret: parsed.Secret,
        Data: parsed.Data,
        Manifest: [],
    };
};
const ConfigManifestNormalizeName = (key) => {
    if (ConfigManifestNameOverride.has(key))
        return ConfigManifestNameOverride.get(key);
    if (key.includes("."))
        return key;
    else
        return key + ".txt";
};
const ConfigManifestNormalizeLinks = (links) => {
    if (typeof links === "string")
        links = [links];
    if (!Array.isArray(links))
        throw new Error("Manifest Error: String or string array expected for 'contentURL'");
    return links.filter((l) => typeof l === "string" && l.startsWith("https://"));
};
const ConfigManifestParse = (data) => {
    if (data === null)
        throw new Error("Manifest Error: Network error");
    const parsed = JSON.parse(data);
    if (parsed instanceof Object === false)
        throw new Error("Manifest Error: Object expected at root level");
    let out = [];
    for (const key in parsed) {
        const entry = parsed[key];
        if (entry instanceof Object === false)
            throw new Error("Manifest Error: Object expected for '" + key + "'");
        const normalized = {
            Name: ConfigManifestNormalizeName(key),
            Links: ConfigManifestNormalizeLinks(entry.contentURL),
        };
        if (normalized.Links.length === 0)
            log_1.LogWarning("Manifest Warning: No valid links found for '" + normalized.Name + "'");
        else
            out.push(normalized);
    }
    return out;
};
exports.ConfigLoad = async (file) => {
    const config = ConfigParse(await fs.readFile(file, "utf8"));
    const requester = new request_1.RequestEngine();
    config.Manifest = ConfigManifestParse(await requester.Get(config.Data));
    return config;
};
