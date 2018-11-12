"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs-extra");
const os = require("os");
const path = require("path");
const config_1 = require("./config");
const github_1 = require("./github");
const log_1 = require("./log");
const request_1 = require("./request");
const validate_1 = require("./validate");
process.on("unhandledRejection", (err) => {
    throw err;
});
let Running = true;
const Shutdown = () => {
    if (!Running)
        return;
    Running = false;
    log_1.LogMessage("Shutdown initiated");
};
process.on("SIGHUP", Shutdown);
process.on("SIGTERM", Shutdown);
process.on("SIGINT", Shutdown);
const Sleep = (milliseconds) => {
    return new Promise((resolve) => {
        setTimeout(resolve, milliseconds);
    });
};
const SleepWhileRunning = async (seconds) => {
    seconds *= 2;
    while (Running && seconds-- > 0)
        await Sleep(500);
};
const StringToIterable = function* (str) {
    const lines = str.split("\n");
    for (let line of lines) {
        line = line.trim();
        if (line.length === 0)
            continue;
        yield line;
    }
};
const LockfileParse = (data) => {
    const out = new Set();
    data = data.trim();
    if (data.length === 0)
        return out;
    for (const line of StringToIterable(data))
        out.add(line);
    return out;
};
const Main = async () => {
    const home = os.homedir();
    const file = path.resolve(home, "mirror-engine-config.json");
    let logs = path.resolve(home, "mirror-engine-logs");
    await fs.mkdirp(logs);
    logs = path.resolve(logs, Date.now() + ".txt");
    log_1.LogSetFile(logs);
    log_1.LogMessage("Logging to '" + logs + "'");
    const config = await config_1.ConfigLoad(file);
    const manifest = config.Manifest;
    const requester = new request_1.RequestEngine();
    requester.SetExtraHeader(request_1.RequestHeadersExtra.UserAgent, config.User);
    const github = new github_1.GitHub(config.User, config.Secret);
    let i = 0;
    while (Running) {
        if (i == manifest.length)
            i = 0;
        const lockfile = await requester.Get(config.Lock);
        if (lockfile === null) {
            log_1.LogError("Lockfile Error: Network error");
            await SleepWhileRunning(30 * 60);
            continue;
        }
        const lock = LockfileParse(lockfile);
        const entry = manifest[i];
        const link = entry.Links[0];
        if (lock.has(entry.Name)) {
            log_1.LogWarning("Update Skipped: File locked");
            i++;
            continue;
        }
        else {
            const data = await requester.Get(link);
            if (typeof data === "string" && validate_1.ValidateRaw(data)) {
                const payload = {
                    Repo: config.Repo,
                    Path: "/raw/" + entry.Name,
                    Content: data,
                    Message: "Automatic mirror update",
                };
                const response = await github.UpdateFile(payload);
                if (response.success)
                    log_1.LogMessage("Updated '" + entry.Name + "' successfully");
                else
                    log_1.LogError("Update Error: Could not update '" + entry.Name + "'");
            }
        }
        i++;
        await SleepWhileRunning(15 * 60);
    }
};
Main();
