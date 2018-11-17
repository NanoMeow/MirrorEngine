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

import * as assert from "assert";

import { ComparatorSimple } from "./comparator";
import { LogDebug, LogMessage, LogError } from "./log";
import { RequestHeadersCustomizable, RequestResponse, RequestEngine } from "./request";

// --------------------------------------------------------------------------------------------- //

export interface GitHubBasicRequest {
    Repo: string,
    Path: string,
}

// --------------------------------------------------------------------------------------------- //

export interface GitHubFileContentRequest extends GitHubBasicRequest { }

export interface GitHubFileContentResponse {
    Text?: string,
}

// --------------------------------------------------------------------------------------------- //

export interface GitHubBlobShaRequest extends GitHubBasicRequest { }

export interface GitHubBlobShaResponse {
    Sha?: string,
}

// --------------------------------------------------------------------------------------------- //

export interface GitHubFileUpdateRequest extends GitHubBasicRequest {
    Content: string,
    Message: string, // Commit message
}

export interface GitHubFileUpdateResponse {
    Success: boolean,
}

// --------------------------------------------------------------------------------------------- //

interface GitHubApiFileUpdatePayload {
    path: string,
    message: string,
    content: string,
    sha: string,
}

// --------------------------------------------------------------------------------------------- //

const Base64Encode = (data: string): string => {
    const buf: Buffer = Buffer.from(data);
    return buf.toString("base64");
};

const IsObject = (data: any): boolean => {
    return typeof data === "object" && data !== null;
};

// --------------------------------------------------------------------------------------------- //

class GitHubComparatorDefault implements ComparatorSimple<string> {
    public AreEqual(a: string, b: string): boolean {
        return a === b;
    }
}

// --------------------------------------------------------------------------------------------- //

export class GitHub {

    // ----------------------------------------------------------------------------------------- //

    private User: string;
    private Secret: string;

    private Comparator: ComparatorSimple<string>;

    private Requester: RequestEngine;
    private RequesterAnonymous: RequestEngine;

    // ----------------------------------------------------------------------------------------- //

    constructor(user: string, secret: string, comparator?: ComparatorSimple<string>) {
        this.User = user;
        this.Secret = secret;

        if (typeof comparator === "undefined")
            this.Comparator = new GitHubComparatorDefault();
        else
            this.Comparator = comparator;

        this.Requester = new RequestEngine();
        this.Requester.SetHeadersCustom(RequestHeadersCustomizable.UserAgent, this.User);
        this.Requester.SetHeadersCustom(
            RequestHeadersCustomizable.Authorization,
            "Basic " + this.Secret,
        );

        this.RequesterAnonymous = new RequestEngine();
    }

    // ----------------------------------------------------------------------------------------- //

    private static ValidateOptions(opt: GitHubBasicRequest): void {
        assert(!opt.Path.startsWith("/"));
    }

    // ----------------------------------------------------------------------------------------- //

    public async FileContent(opt: GitHubFileContentRequest): Promise<GitHubFileContentResponse> {
        GitHub.ValidateOptions(opt);
        const response: RequestResponse = await this.RequesterAnonymous.Get(
            "https://gitcdn.xyz/repo/" + this.User + "/" + opt.Repo + "/master/" + opt.Path,
        );
        return { Text: response.Text };
    }

    // ----------------------------------------------------------------------------------------- //

    public async BlobSha(opt: GitHubBlobShaRequest): Promise<GitHubBlobShaResponse> {

        // ------------------------------------------------------------------------------------- //

        GitHub.ValidateOptions(opt);

        // ------------------------------------------------------------------------------------- //

        const payload: string = [
            "{",
            '  repository(owner: "' + this.User + '", name: "' + opt.Repo + '") {',
            '    object(expression: "master:' + opt.Path + '") {',
            "      ... on Blob {",
            "        oid",
            "      }",
            "    }",
            "  }",
            "}",
        ].join("\n");

        // ------------------------------------------------------------------------------------- //

        const res: RequestResponse = await this.Requester.Post(
            "https://api.github.com/graphql",
            {
                query: payload,
            },
            {
                Stubborn: true,
            },
        );

        // ------------------------------------------------------------------------------------- //

        if (typeof res.Text === "undefined")
            return {};

        try {
            const parsed: any = JSON.parse(res.Text);

            if (
                IsObject(parsed) &&
                IsObject(parsed.data) &&
                IsObject(parsed.data.repository) &&
                IsObject(parsed.data.repository.object) &&
                typeof parsed.data.repository.object.oid === "string" &&
                parsed.data.repository.object.oid.length > 0
            ) {
                return { Sha: parsed.data.repository.object.oid };
            } else {
                LogDebug("GitHub API returned unexpected response:");
                LogDebug(JSON.stringify(parsed, null, 2));
                return {};
            }
        } catch (err) {
            LogError((<Error>err).message);
            return {};
        }

        // ------------------------------------------------------------------------------------- //

    }

    // ----------------------------------------------------------------------------------------- //

    public async FileUpdate(opt: GitHubFileUpdateRequest): Promise<GitHubFileUpdateResponse> {

        // ------------------------------------------------------------------------------------- //

        GitHub.ValidateOptions(opt);

        // ------------------------------------------------------------------------------------- //

        const current: GitHubFileContentResponse = await this.FileContent({
            Repo: opt.Repo,
            Path: opt.Path,
        });

        if (
            typeof current.Text === "string" &&
            this.Comparator.AreEqual(opt.Content, current.Text)
        ) {
            LogMessage("File not changed");
            return { Success: true };
        }

        // ------------------------------------------------------------------------------------- //

        const sha: GitHubBlobShaResponse = await this.BlobSha({
            Repo: opt.Repo,
            Path: opt.Path,
        });

        if (typeof sha.Sha === "undefined")
            sha.Sha = "";

        // ------------------------------------------------------------------------------------- //

        const payload: GitHubApiFileUpdatePayload = {
            path: opt.Path,
            message: opt.Message,
            content: Base64Encode(opt.Content),
            sha: sha.Sha,
        };

        const res: RequestResponse = await this.Requester.Put(
            "https://api.github.com/repos/" + this.User + "/" + opt.Repo + "/contents/" + opt.Path,
            payload,
            {
                Stubborn: true,
            },
        );

        if (typeof res.Text === "undefined")
            return { Success: false };

        try {
            const parsed: any = JSON.parse(res.Text);

            if (
                IsObject(parsed) &&
                IsObject(parsed.commit) &&
                typeof parsed.commit.sha === "string" &&
                parsed.commit.sha.length > 0
            ) {
                return { Success: true };
            } else {
                LogDebug("GitHub API returned unexpected response:");
                LogDebug(JSON.stringify(parsed, null, 2));
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
