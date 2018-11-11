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

// Network request utility

// --------------------------------------------------------------------------------------------- //

"use strict";

// --------------------------------------------------------------------------------------------- //

import * as http from "http";
import * as https from "https";
import * as stream from "stream";
import * as url from "url";
import * as zlib from "zlib";

import { LogMessage, LogError } from "./log";

// --------------------------------------------------------------------------------------------- //

interface RequestHeaders {
    [key: string]: string,
}

enum RequestMethod {
    GET = "GET",
    POST = "POST",
    PUT = "PUT",
}

// --------------------------------------------------------------------------------------------- //

const RequestHeadersDefault: RequestHeaders = {
    "Cache-Control": "no-cache",
    "Accept": "text/plain, text/*, */*;q=0.9",
    "Accept-Encoding": "deflate, gzip, identity",
    "User-Agent": "NanoMeow",
};

const RequestRedirectStatusCode: Set<number> = new Set<number>([
    301,
    302,
    307,
]);

const RequestRedirectSafeAbsoluteLink: RegExp = /^https:\/\/(?:\w+\.)+\w+\//;
const RequestRedirectSafeRelativeLink: RegExp = /^\/\w/;

// --------------------------------------------------------------------------------------------- //

export class RequestEngine {

    // ----------------------------------------------------------------------------------------- //

    private Busy: boolean = false;

    // ----------------------------------------------------------------------------------------- //

    private StreamToHeader(
        res: http.IncomingMessage,
        key: string,
        def: string = "",
    ): string {
        const header: undefined | string | string[] = res.headers[key];

        if (typeof header === "undefined")
            return def;

        if (Array.isArray(header))
            return header.join(",");
        else
            return header;
    }

    // ----------------------------------------------------------------------------------------- //

    private StreamToText(res: http.IncomingMessage): Promise<string> {
        return new Promise((
            resolve: (txt: string) => void,
            reject: (err: Error) => void,
        ): void => {

            let s: stream.Readable;
            const encoding: string = this.StreamToHeader(res, "content-encoding", "identity");

            switch (encoding) {
                case "identity":
                    s = res;
                    break;

                case "gzip":
                    s = res.pipe(zlib.createGunzip());
                    break;

                case "deflate":
                    s = res.pipe(zlib.createInflate());
                    break;

                default:
                    reject(new Error("Unrecognized encoding '" + encoding + "'"));
                    return;
            }

            let aborted: boolean = false;
            let data: string = "";

            // TODO: Properly handle encoding
            s.setEncoding("utf8");
            s.on("data", (c: string): void => {
                if (aborted)
                    return;

                data += c;
                if (data.length > 10 * 1024 * 1024) {
                    aborted = true;
                    reject(new Error("Payload too large"));
                }
            });
            s.on("end", (): void => {
                if (aborted)
                    return;

                resolve(data);
            });
            s.on("error", (err: Error): void => {
                if (aborted)
                    return;

                aborted = true;
                reject(err);
            });

        });
    }

    private LinkToStream(
        link: string,
        method: RequestMethod,
        payload?: string | Buffer,
    ): Promise<http.IncomingMessage> {
        return new Promise((
            resolve: (res: http.IncomingMessage) => void,
            reject: (err: Error) => void,
        ): void => {

            LogMessage(method + " - " + link);

            const opt: http.RequestOptions = url.parse(link);
            opt.headers = RequestHeadersDefault;
            opt.method = method;

            if (opt.protocol !== "https:")
                return void reject(new Error("Unrecognized protocol '" + opt.protocol + "'"));

            const req: http.ClientRequest = https.request(opt);
            req.on("response", resolve);
            req.on("error", reject);

            if (typeof payload !== "undefined")
                req.end(payload);
            else
                req.end();

        });
    }

    // ----------------------------------------------------------------------------------------- //

    private async LinkToText(
        link: string,
        method: RequestMethod = RequestMethod.GET,
        payload?: string | Buffer
    ): Promise<null | string> {

        let redirect: number = 5;

        while (redirect-- > 0) {
            let res: http.IncomingMessage;
            try {
                res = await this.LinkToStream(link, method, payload);
            } catch (err) {
                LogError((<Error>err).message);
                return null;
            }

            if (RequestRedirectStatusCode.has(<number>res.statusCode)) {
                const location: string = this.StreamToHeader(res, "location");

                if (RequestRedirectSafeAbsoluteLink.test(location)) {
                    res.resume();
                    link = location;
                    continue;
                } else if (RequestRedirectSafeRelativeLink.test(location)) {
                    res.resume();
                    link = "https://" + url.parse(link).hostname + location;
                    continue;
                } else {
                    LogError("Invalid redirect link '" + location + "'");
                    return null;
                }
            }

            let txt: string;
            try {
                txt = await this.StreamToText(res);
            } catch (err) {
                LogError((<Error>err).message);
                return null;
            }

            return txt;
        }

        LogError("Too Many Redirects");
        return null;

    }

    // ----------------------------------------------------------------------------------------- //

    public async Get(link: string): Promise<null | string> {
        if (this.Busy) {
            LogError("Request Engine Busy");
            return null;
        }

        this.Busy = true;
        const result: null | string = await this.LinkToText(link);
        this.Busy = false;

        return result;
    }

    // ----------------------------------------------------------------------------------------- //

}

// --------------------------------------------------------------------------------------------- //
