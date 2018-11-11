"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("./config");
const request_1 = require("./request");
const validate_1 = require("./validate");
let Running = true;
let Sleeping = false;
const ShutDown = () => {
    Running = false;
    if (Sleeping)
        process.exit(0);
};
process.on("unhandledRejection", (err) => {
    throw err;
});
process.on("SIGHUP", ShutDown);
process.on("SIGTERM", ShutDown);
process.on("SIGINT", ShutDown);
const Sleep = (delay) => {
    return new Promise((resolve) => {
        setTimeout(resolve, delay);
    });
};
const Main = async () => {
    const config = await config_1.ConfigLoad();
    const manifest = config.Manifest;
    const requester = new request_1.RequestEngine();
    let i = 0;
    while (Running) {
        if (i == manifest.length)
            i = 0;
        const entry = manifest[i];
        const link = entry.Links[0];
        const data = await requester.Get(link);
        if (typeof data === "string" && validate_1.ValidateFilter(data)) {
        }
        i++;
        if (Running) {
            Sleeping = true;
            await Sleep(15 * 60 * 1000);
            Sleeping = false;
        }
    }
};
Main();
