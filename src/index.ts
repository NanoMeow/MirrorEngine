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

import { ConfigManifestEntry, ConfigData, ConfigLoad } from "./config";
import { RequestEngine } from "./request";
import { ValidateFilter } from "./validate";

// --------------------------------------------------------------------------------------------- //

let Running: boolean = true;
let Sleeping: boolean = false;

const ShutDown = (): void => {
    Running = false;

    if (Sleeping)
        process.exit(0);
};

process.on("unhandledRejection", (err: Error): void => {
    throw err;
});

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
    const config: ConfigData = await ConfigLoad();
    const manifest: ConfigManifestEntry[] = config.Manifest;
    const requester: RequestEngine = new RequestEngine();

    let i: number = 0;

    while (Running) {
        if (i == manifest.length)
            i = 0;

        const entry: ConfigManifestEntry = manifest[i];
        const link = entry.Links[0];

        const data: string | null = await requester.Get(link);
        if (typeof data === "string" && ValidateFilter(data)) {

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

// --------------------------------------------------------------------------------------------- //
