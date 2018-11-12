"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs-extra");
const os = require("os");
const path = require("path");
const config_1 = require("./config");
const github_1 = require("./github");
const request_1 = require("./request");
const validate_1 = require("./validate");
const log_1 = require("./log");
process.on("unhandledRejection", (err) => {
    throw err;
});
let Running = true;
const ShutDown = () => {
    Running = false;
};
process.on("SIGHUP", ShutDown);
process.on("SIGTERM", ShutDown);
process.on("SIGINT", ShutDown);
const Sleep = (delay) => {
    return new Promise((resolve) => {
        setTimeout(resolve, delay);
    });
};
const Main = async () => {
    const home = os.homedir();
    const file = path.resolve(home, "mirror-engine-config.json");
    let logs = path.resolve(home, "mirror-engine-logs");
    await fs.mkdirp(logs);
    logs = path.resolve(logs, Date.now() + ".txt");
    log_1.LogSetFile(logs);
    const config = await config_1.ConfigLoad(file);
    const manifest = config.Manifest;
    const requester = new request_1.RequestEngine();
    requester.SetExtraHeader(request_1.RequestHeadersExtra.UserAgent, config.User);
    const github = new github_1.GitHub(config.User, config.Secret);
    let i = 0;
    while (Running) {
        if (i == manifest.length)
            i = 0;
        const entry = manifest[i];
        const link = entry.Links[0];
        const data = await requester.Get(link);
        if (typeof data === "string" && validate_1.ValidateFile(data)) {
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
        i++;
        let sec = 15 * 60;
        while (Running && sec-- > 0)
            await Sleep(1000);
    }
};
Main();
