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

// GitHub API utility

// --------------------------------------------------------------------------------------------- //

"use strict";

// --------------------------------------------------------------------------------------------- //

import { LogDebug, LogMessage, LogError } from "./log";
import { RequestHeadersExtra, RequestEngine } from "./request";

// --------------------------------------------------------------------------------------------- //

interface GitHubUpdateFilePayload {
    path: string,
    message: string,
    content: string,
    sha: string,
}

export interface GitHubUpdateFileRequest {
    Repo: string,
    Path: string, // Including leading "/"

    Content: string | Buffer,
    Message: string, // Commit message
}

export interface GitHubUpdateFileResult {
    success: boolean,
}

// --------------------------------------------------------------------------------------------- //

export class GitHub {

    // ----------------------------------------------------------------------------------------- //

    private User: string;
    private Secret: string;

    private Requester: RequestEngine;

    // ----------------------------------------------------------------------------------------- //

    constructor(user: string, secret: string) {
        this.User = user;
        this.Secret = secret;

        this.Requester = new RequestEngine();
        this.Requester.SetExtraHeader(RequestHeadersExtra.Authorization, "Basic " + this.Secret);
        this.Requester.SetExtraHeader(RequestHeadersExtra.UserAgent, this.User);
    }

    // ----------------------------------------------------------------------------------------- //

    private static Base64Encode(data: string | Buffer): string {
        if (typeof data === "string")
            data = Buffer.from(data);

        return data.toString("base64");
    }

    // ----------------------------------------------------------------------------------------- //

    public async UpdateFile(opt: GitHubUpdateFileRequest): Promise<GitHubUpdateFileResult> {

        // ------------------------------------------------------------------------------------- //

        opt.Content = GitHub.Base64Encode(opt.Content);

        const link =
            "https://api.github.com/repos/" + this.User + "/" + opt.Repo + "/contents" + opt.Path;

        // ------------------------------------------------------------------------------------- //

        let response: null | string = await this.Requester.Get(link, true);
        if (response === null)
            return { success: false };

        let old: string;
        let sha: string;
        let parsed: any;

        try {
            parsed = JSON.parse(response);

            old = parsed.content;
            if (typeof old !== "string")
                old = "";

            sha = parsed.sha;
            if (typeof sha !== "string")
                sha = "";
        } catch (err) {
            LogError((<Error>err).message);
            return { success: false };
        }

        if (old === "" || sha === "") {
            LogDebug("GitHub API response:");
            LogDebug(JSON.stringify(parsed, null, 4));
        }

        if (opt.Content === old.replace(/\n/g, "")) {
            LogMessage("File not changed");
            return { success: true };
        }

        // ------------------------------------------------------------------------------------- //

        const payload: GitHubUpdateFilePayload = {
            path: opt.Path,
            message: opt.Message,
            content: opt.Content,
            sha: sha,
        };
        let res: null | string = await this.Requester.Put(link, payload, true);
        if (res === null)
            return { success: false };

        try {
            const parsed: any = JSON.parse(res);

            if (
                parsed instanceof Object &&
                parsed.commit instanceof Object &&
                typeof parsed.commit.sha === "string" &&
                parsed.commit.sha.length > 0
            ) {
                return { success: true };
            } else {
                LogDebug("GitHub API response:");
                LogDebug(JSON.stringify(parsed, null, 4));
                return { success: false };
            }
        } catch (err) {
            LogError((<Error>err).message);
            return { success: false };
        }

        // ------------------------------------------------------------------------------------- //

    }

    // ----------------------------------------------------------------------------------------- //

}

// --------------------------------------------------------------------------------------------- //
