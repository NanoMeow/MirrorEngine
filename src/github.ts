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
import { RequestHeadersCustomizable, RequestResponse, RequestEngine } from "./request";

// --------------------------------------------------------------------------------------------- //

export interface GitHubFindShaRequest {
    Repo: string,
    Path: string, // No leading "/"
}

export interface GitHubFindShaResponse {
    Sha?: string,
}

// --------------------------------------------------------------------------------------------- //

export interface GitHubUpdateFileRequest {
    Repo: string,
    Path: string, // No leading "/"
    Content: string,
    Message: string, // Commit message
}

export interface GitHubUpdateFileResponse {
    Success: boolean,
}

// --------------------------------------------------------------------------------------------- //

interface GitHubApiUpdateFilePayload {
    path: string,
    message: string,
    content: string,
    sha: string,
}

// --------------------------------------------------------------------------------------------- //

const GitHubBase64Encode = (data: string): string => {
    const buf: Buffer = Buffer.from(data);
    return buf.toString("base64");
};

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
        this.Requester.SetHeadersCustom(
            RequestHeadersCustomizable.Authorization,
            "Basic " + this.Secret,
        );
        this.Requester.SetHeadersCustom(RequestHeadersCustomizable.UserAgent, this.User);
    }

    // ----------------------------------------------------------------------------------------- //

    public async FindSha(opt: GitHubFindShaRequest): Promise<GitHubFindShaResponse> {
        const payload: string = [
            "{",
            '  repository(owner: "' + this.User + '", name: "' + opt.Repo + '") {',
            '    object(expression: "master:' + opt.Path + '") {',
            "      ... on Blob {",
            "        oid",
            "      }",
            "    }",
            "  }",
            "}"
        ].join("\n");

        const res: RequestResponse = await this.Requester.Post(
            "https://https://api.github.com/graphql",
            {
                query: payload,
            },
            {
                Stubborn: true,
            },
        );

        if (typeof res.Text === "undefined")
            return {};

        try {
            const parsed: any = JSON.parse(res.Text);
            const oid: any = parsed.data.repository.object.oid;
            if (typeof oid === "string" && oid.length > 0)
                return { Sha: oid };
        } catch (err) {
            LogError((<Error>err).message);
        }

        return {};
    }

    // ----------------------------------------------------------------------------------------- //

    public async UpdateFile(opt: GitHubUpdateFileRequest): Promise<GitHubUpdateFileResponse> {

        // ------------------------------------------------------------------------------------- //

        const current: GitHubContentResponse = await GitHubContent({
            User: this.User,
            Repo: opt.Repo,
            Path: opt.Path,
        });

        if (typeof current.Sha === "string") {
            if (opt.Content === current.Response.Text) {
                LogMessage("File not changed");
                return { Success: true };
            }
        } else {
            current.Sha = "";
        }

        // ------------------------------------------------------------------------------------- //

        const payload: GitHubApiUpdateFilePayload = {
            path: opt.Path,
            message: opt.Message,
            content: GitHubBase64Encode(opt.Content),
            sha: current.Sha,
        };

        const res: RequestResponse = await this.Requester.Put(
            "https://api.github.com/repos/" + this.User + "/" + opt.Repo + "/contents" + opt.Path,
            payload,
            {
                Stubborn: true,
            },
        );

        if (typeof res.Text !== "string")
            return { Success: false };

        try {
            const parsed: any = JSON.parse(res.Text);

            if (
                typeof parsed === "object" &&
                typeof parsed.commit === "object" &&
                typeof parsed.commit.sha === "string" &&
                parsed.commit.sha.length > 0
            ) {
                return { Success: true };
            } else {
                LogDebug("GitHub API returned unexpected response:");
                LogDebug(JSON.stringify(parsed, null, 4));
                return { Success: false };
            }
        } catch (err) {
            LogError((<Error>err).message);
            return { Success: false };
        }

        // ------------------------------------------------------------------------------------- //

    }

    // ----------------------------------------------------------------------------------------- //

}

// --------------------------------------------------------------------------------------------- //
