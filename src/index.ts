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

import * as fs from "fs-extra";
import * as os from "os";
import * as path from "path";

import { ConfigManifestEntry, ConfigData, ConfigLoad } from "./config";
import { GitHubUpdateFileRequest, GitHubUpdateFileResult, GitHub } from "./github";
import { LogSetFile, LogMessage, LogError, LogWarning } from "./log";
import { RequestHeadersExtra, RequestEngine } from "./request";
import { ValidateRaw } from "./validate";

// --------------------------------------------------------------------------------------------- //

const CONFIG_FILE_NAME: string = "mirror-engine-config.json";
const LOG_DIRECTORY_NAME: string = "mirror-engine-logs";

// --------------------------------------------------------------------------------------------- //

process.on("uncaughtException", (err: Error): void => {
    const file = path.resolve(os.homedir(), LOG_DIRECTORY_NAME, "crash-" + Date.now() + ".txt");

    const content: string[] = [
        "Node version: " + process.version,
    ];
    for (const arg of process.argv)
        content.push("Argument: " + arg);
    content.push("Error:");
    content.push(<string>err.stack);

    const data = content.join("\n");
    console.log(data);
    fs.appendFileSync(file, data, "utf8");

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

const Sleep = (milliseconds: number): Promise<void> => {
    return new Promise((resolve) => {
        setTimeout(resolve, milliseconds);
    });
};

const SleepWhileRunning = async (seconds: number): Promise<void> => {
    seconds *= 2;

    while (Running && seconds-- > 0)
        await Sleep(500);
};

// --------------------------------------------------------------------------------------------- //

const StringToIterable = function* (str: string): Iterable<string> {
    const lines = str.split("\n");

    for (let line of lines) {
        line = line.trim();
        if (line.length === 0)
            continue;

        yield line;
    }
};

const LockfileParse = (data: string): Set<string> => {
    const out: Set<string> = new Set();

    data = data.trim();
    if (data.length === 0)
        return out;

    for (const line of StringToIterable(data))
        out.add(line);

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

    // ----------------------------------------------------------------------------------------- //

    const requester: RequestEngine = new RequestEngine();
    requester.SetExtraHeader(RequestHeadersExtra.UserAgent, config.User);

    const github = new GitHub(config.User, config.Secret);

    // ----------------------------------------------------------------------------------------- //

    let i: number = 0;

    while (Running) {

        // ------------------------------------------------------------------------------------- //

        if (i == manifest.length)
            i = 0;

        // ------------------------------------------------------------------------------------- //

        const lockfile: string | null = await requester.Get(config.Lock);

        if (lockfile === null) {
            LogError("Lockfile Error: Network error");
            await SleepWhileRunning(30 * 60);
            continue;
        }

        const lock: Set<string> = LockfileParse(lockfile);

        // ------------------------------------------------------------------------------------- //

        const entry: ConfigManifestEntry = manifest[i];
        const link = entry.Links[0];

        // ------------------------------------------------------------------------------------- //

        if (lock.has(entry.Name)) {

            LogWarning("Update Skipped: File locked");

            i++;
            await SleepWhileRunning(5 * 60);
            continue;

        } else {

            const data: string | null = await requester.Get(link);

            if (typeof data === "string" && ValidateRaw(data)) {

                const payload: GitHubUpdateFileRequest = {
                    Repo: config.Repo,
                    Path: "/raw/" + entry.Name,
                    Content: data,
                    Message: "Automatic mirror update",
                };
                const response: GitHubUpdateFileResult = await github.UpdateFile(payload);
                if (response.success)
                    LogMessage("Updated '" + entry.Name + "' successfully");
                else
                    LogError("Update Error: Could not update '" + entry.Name + "'");

            }

        }

        // ------------------------------------------------------------------------------------- //

        i++;
        await SleepWhileRunning(15 * 60);

        // ------------------------------------------------------------------------------------- //

    }

    // ----------------------------------------------------------------------------------------- //

};

Main();

// --------------------------------------------------------------------------------------------- //
