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

// Entry point

// --------------------------------------------------------------------------------------------- //

"use strict";

// --------------------------------------------------------------------------------------------- //

import * as assert from "assert";
import * as fs from "fs-extra";
import * as os from "os";
import * as path from "path";

import {
    ConfigManifestEntry,
    ConfigData,
    ConfigTextToIterable,
    ConfigLoad,
    ConfigManifestShuffle,
} from "./config";
import { GitHubFileUpdateRequest, GitHubFileUpdateResponse, GitHub } from "./github";
import { LogSetFile, LogDebug, LogMessage, LogError, LogWarning } from "./log";
import { ParserValidateRaw, ParserComparatorRaw, ParserResolveInclude } from "./parser";
import { RequestHeadersCustomizable, RequestResponse, RequestEngine } from "./request";
import { ComparatorSimple } from "./comparator";

// --------------------------------------------------------------------------------------------- //

const VERSION: string = "1.0.3";

const CONFIG_FILE_NAME: string = "mirror-engine-config.json";
const LOG_DIRECTORY_NAME: string = "mirror-engine-logs";

const SLEEP_RESOLUTION: number = 4; // Running check per second

// --------------------------------------------------------------------------------------------- //

process.on("uncaughtException", (err: Error): void => {
    const file = path.resolve(os.homedir(), LOG_DIRECTORY_NAME, "crash-" + Date.now() + ".txt");

    const content: string[] = [];
    content.push("Node version: " + process.version);

    for (const arg of process.argv)
        content.push("Argument: " + arg);

    content.push(<string>err.stack);
    content.push("");

    fs.appendFileSync(file, content.join("\n"), "utf8");

    throw err;
});

process.on("unhandledRejection", (err: Error): void => {
    throw err;
});

// --------------------------------------------------------------------------------------------- //

let Running: boolean = true;

const Shutdown = (): void => {
    if (!Running)
        return;

    Running = false;
    LogMessage("Shutdown initiated");
};

process.on("SIGHUP", Shutdown);
process.on("SIGTERM", Shutdown);
process.on("SIGINT", Shutdown);

// --------------------------------------------------------------------------------------------- //

// TODO: How about attaching an event handler for shutdown, and when the event is dispatched,
// clear timeout then resolve early?

const Sleep = (milliseconds: number): Promise<void> => {
    return new Promise<void>((resolve) => {
        setTimeout(resolve, milliseconds);
    });
};

const SleepWhileRunning = async (seconds: number): Promise<void> => {
    assert(typeof seconds === "number");
    assert(!isNaN(seconds) && isFinite(seconds));
    assert(seconds === Math.round(seconds) && 64 < seconds && seconds < 65536);

    seconds *= SLEEP_RESOLUTION;

    while (Running && seconds-- > 0)
        await Sleep(Math.ceil(1000 / SLEEP_RESOLUTION));
};

// --------------------------------------------------------------------------------------------- //

const LockfileParse = (data: string): Set<string> => {
    const out: Set<string> = new Set();

    for (const line of ConfigTextToIterable(data)) {
        out.add(line);
        LogDebug("File locked: '" + line + "'");
    }

    return out;
};

// --------------------------------------------------------------------------------------------- //

const Main = async (): Promise<void> => {

    // ----------------------------------------------------------------------------------------- //

    const home: string = os.homedir();
    const file: string = path.resolve(home, CONFIG_FILE_NAME);

    // ----------------------------------------------------------------------------------------- //

    let logs: string = path.resolve(home, LOG_DIRECTORY_NAME);
    await fs.mkdirp(logs);

    logs = path.resolve(logs, Date.now() + ".txt");
    LogSetFile(logs);

    LogMessage("Logging to '" + logs + "'");

    // ----------------------------------------------------------------------------------------- //

    const config: ConfigData = await ConfigLoad(file);
    const manifest: ConfigManifestEntry[] = config.Manifest;

    LogDebug("Configuration data:");
    LogDebug(JSON.stringify(config, null, 2).replace(config.Secret, "<redacted>"));

    if (manifest.length === 0)
        throw new Error("Manifest Error: No entry found");

    // ----------------------------------------------------------------------------------------- //

    const requester: RequestEngine = new RequestEngine();
    requester.SetHeadersCustom(RequestHeadersCustomizable.UserAgent, config.User);

    const comparator: ComparatorSimple<string> = new ParserComparatorRaw();
    const resolver: ParserResolveInclude = new ParserResolveInclude(manifest);

    const github: GitHub = new GitHub(config.User, config.Secret, comparator);

    // ----------------------------------------------------------------------------------------- //

    let i: number = manifest.length;

    while (Running) {

        // ------------------------------------------------------------------------------------- //

        if (i == manifest.length) {
            i = 0;

            ConfigManifestShuffle(manifest);
            LogDebug("Manifest shuffled:");
            LogDebug(JSON.stringify(manifest, null, 2));
        }

        // ------------------------------------------------------------------------------------- //

        const lockfile: RequestResponse = await requester.Get(config.Lockfile);

        if (typeof lockfile.Text === "undefined") {
            LogError("Lockfile Error: Network error");
            await SleepWhileRunning(60 * 60 * config.TimerScale);
            continue;
        }

        const lock: Set<string> = LockfileParse(lockfile.Text);

        // ------------------------------------------------------------------------------------- //

        const entry: ConfigManifestEntry = manifest[i];

        // ------------------------------------------------------------------------------------- //

        if (lock.has(entry.Name)) {

            LogWarning("Update Skipped: File locked");

            i++;
            await SleepWhileRunning(5 * 60 * config.TimerScale);
            continue;

        } else {

            const data: RequestResponse = await requester.Get(entry.Link);

            if (typeof data.Text === "string" && ParserValidateRaw(data.Text)) {

                const payload: GitHubFileUpdateRequest = {
                    Repo: config.Repo,
                    Path: "raw/" + entry.Name,
                    Content: resolver.Resolve(entry, data.Text),
                    Message: "Automatic mirror update - Mirror Engine v" + VERSION,
                };

                const response: GitHubFileUpdateResponse = await github.FileUpdate(payload);

                if (response.Success)
                    LogMessage("Updated '" + entry.Name + "' successfully");
                else
                    LogError("Update Error: Could not update '" + entry.Name + "'");

            } else {

                LogError("Update Error: Could not download '" + entry.Name + "'");

            }

        }

        // ------------------------------------------------------------------------------------- //

        i++;
        await SleepWhileRunning(15 * 60 * config.TimerScale);

        // ------------------------------------------------------------------------------------- //

    }

    // ----------------------------------------------------------------------------------------- //

};

Main();

// --------------------------------------------------------------------------------------------- //
