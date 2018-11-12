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
import { RequestHeadersExtra, RequestEngine } from "./request";
import { ValidateFile } from "./validate";
import { LogSetFile, LogMessage, LogError } from "./log";

// --------------------------------------------------------------------------------------------- //

process.on("unhandledRejection", (err: Error): void => {
    throw err;
});

// --------------------------------------------------------------------------------------------- //

let Running: boolean = true;

const ShutDown = (): void => {
    Running = false;
};

process.on("SIGHUP", ShutDown);
process.on("SIGTERM", ShutDown);
process.on("SIGINT", ShutDown);

// --------------------------------------------------------------------------------------------- //

const Sleep = (delay: number): Promise<void> => {
    return new Promise((resolve) => {
        setTimeout(resolve, delay);
    });
};

// --------------------------------------------------------------------------------------------- //

const Main = async (): Promise<void> => {
    const home: string = os.homedir();
    const file: string = path.resolve(home, "mirror-engine-config.json");

    let logs: string = path.resolve(home, "mirror-engine-logs");
    await fs.mkdirp(logs);
    logs = path.resolve(logs, Date.now() + ".txt");
    LogSetFile(logs);
    LogMessage("Logging to '" + logs + "'");

    const config: ConfigData = await ConfigLoad(file);
    const manifest: ConfigManifestEntry[] = config.Manifest;

    const requester: RequestEngine = new RequestEngine();
    requester.SetExtraHeader(RequestHeadersExtra.UserAgent, config.User);

    const github = new GitHub(config.User, config.Secret);

    let i: number = 0;

    while (Running) {
        if (i == manifest.length)
            i = 0;

        const entry: ConfigManifestEntry = manifest[i];
        const link = entry.Links[0];

        const data: string | null = await requester.Get(link);
        if (typeof data === "string" && ValidateFile(data)) {
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

        i++;

        // TODO: Make this more pretty
        let sec: number = 15 * 60;
        while (Running && sec-- > 0)
            await Sleep(1000);
    }
};

Main();

// --------------------------------------------------------------------------------------------- //
