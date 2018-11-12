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

const RequestHeadersDefault: RequestHeaders = {
    "Cache-Control": "no-cache",
    "Accept": "text/plain, text/*, */*;q=0.9",
    "Accept-Encoding": "deflate, gzip, identity",
};

export enum RequestHeadersExtra {
    Accept = "Accept",
    Authorization = "Authorization",
    UserAgent = "User-Agent",
}

// --------------------------------------------------------------------------------------------- //

enum RequestMethods {
    GET = "GET",
    POST = "POST",
    PUT = "PUT",
}

// --------------------------------------------------------------------------------------------- //

const RequestRedirectSafeAbsoluteLink: RegExp = /^https:\/\/(?:\w+\.)+\w+\//;
const RequestRedirectSafeRelativeLink: RegExp = /^\/\w/;

const RequestRedirectStatusCode: Set<number> = new Set<number>([
    301,
    302,
    307,
]);

// --------------------------------------------------------------------------------------------- //

interface RequestOptionalData {
    payload?: string | Buffer,
    stubborn?: boolean, // No abort even if response code is error
}

// --------------------------------------------------------------------------------------------- //

export class RequestEngine {

    // ----------------------------------------------------------------------------------------- //

    // TODO: Not used for now

    private Pending: number = 0;

    public GetPendingRequestsCount(): number {
        return this.Pending;
    }

    // ----------------------------------------------------------------------------------------- //

    private ExtraHeaders: RequestHeaders = {};

    public SetExtraHeader(key: RequestHeadersExtra, val: string): void {
        this.ExtraHeaders[key] = val;
    }

    // ----------------------------------------------------------------------------------------- //

    private static StreamToHeader(
        res: http.IncomingMessage,
        key: string,
        def: string = "",
    ): string {

        const header: undefined | string | string[] = res.headers[key];

        if (typeof header === "undefined")
            return def;

        if (Array.isArray(header))
            return header.join(", ");
        else
            return header;

    }

    private static StreamToText(res: http.IncomingMessage): Promise<string> {
        return new Promise((
            resolve: (txt: string) => void,
            reject: (err: Error) => void,
        ): void => {

            // --------------------------------------------------------------------------------- //

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
                    reject(new Error("Request Error: Unknown encoding '" + encoding + "'"));
                    return;
            }

            // --------------------------------------------------------------------------------- //

            let aborted: boolean = false;
            let data: string = "";

            // TODO: Properly handle text encoding
            s.setEncoding("utf8");

            s.on("data", (c: string): void => {
                if (aborted)
                    return;

                data += c;
                if (data.length > 10 * 1024 * 1024) {
                    aborted = true;
                    reject(new Error("Request Error: Response payload too large"));
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

            // --------------------------------------------------------------------------------- //

        });
    }

    // ----------------------------------------------------------------------------------------- //

    private LinkToStream(
        link: string,
        method: RequestMethods,
        opt: RequestOptionalData,
    ): Promise<http.IncomingMessage> {
        return new Promise((
            resolve: (res: http.IncomingMessage) => void,
            reject: (err: Error) => void,
        ): void => {

            // --------------------------------------------------------------------------------- //

            LogMessage(method + " - " + link);

            // --------------------------------------------------------------------------------- //

            const option: http.RequestOptions = url.parse(link);
            option.headers = Object.assign({}, RequestHeadersDefault, this.ExtraHeaders);
            option.method = method;

            if (option.protocol !== "https:") {
                return void reject(
                    new Error("Request Error: Unknown protocol '" + option.protocol + "'"),
                );
            }

            // --------------------------------------------------------------------------------- //

            const req: http.ClientRequest = https.request(option);
            req.on("response", resolve);
            req.on("error", reject);

            if (typeof opt.payload !== "undefined")
                req.end(opt.payload);
            else
                req.end();

            // --------------------------------------------------------------------------------- //

        });
    }

    private async LinkToText(
        link: string,
        method: RequestMethods = RequestMethods.GET,
        opt?: RequestOptionalData,
    ): Promise<null | string> {

        if (opt instanceof Object === false)
            opt = { stubborn: false };

        let redirect: number = 5;

        while (redirect-- > 0) {

            // --------------------------------------------------------------------------------- //

            let res: http.IncomingMessage;
            try {
                res = await this.LinkToStream(link, method, <RequestOptionalData>opt);
            } catch (err) {
                LogError((<Error>err).message);
                return null;
            }

            // --------------------------------------------------------------------------------- //

            if (RequestRedirectStatusCode.has(<number>res.statusCode)) {
                const location: string = RequestEngine.StreamToHeader(res, "location");

                if (RequestRedirectSafeAbsoluteLink.test(location)) {
                    res.resume();
                    link = location;
                    continue;
                } else if (RequestRedirectSafeRelativeLink.test(location)) {
                    res.resume();
                    link = "https://" + url.parse(link).hostname + location;
                    continue;
                } else {
                    LogError("Request Error: Invalid redirect link '" + location + "'");
                    return null;
                }
            }

            if (
                !(<RequestOptionalData>opt).stubborn &&
                (
                    <number>res.statusCode < 200 ||
                    <number>res.statusCode > 299
                )
            ) {
                LogError("Request Error: Unexpected status code '" + res.statusCode + "'");
                return null;
            }

            // --------------------------------------------------------------------------------- //

            let txt: string;
            try {
                txt = await RequestEngine.StreamToText(res);
            } catch (err) {
                LogError((<Error>err).message);
                return null;
            }

            return txt;

            // --------------------------------------------------------------------------------- //

        }

        LogError("Request Error: Too many redirects");
        return null;

    }

    // ----------------------------------------------------------------------------------------- //

    public async Get(link: string, stubborn: boolean = false): Promise<null | string> {
        this.Pending++;
        const result: null | string = await this.LinkToText(link, RequestMethods.GET, {
            stubborn: stubborn,
        });
        this.Pending--;

        return result;
    }

    public async Put(
        link: string,
        payload: string | Object,
        stubborn: boolean = false,
    ): Promise<null | string> {

        if (payload instanceof Object)
            payload = JSON.stringify(payload);

        this.Pending++;
        const result: null | string = await this.LinkToText(link, RequestMethods.PUT, {
            payload: <string>payload,
            stubborn: stubborn,
        });
        this.Pending--;

        return result;

    }

    // ----------------------------------------------------------------------------------------- //

}

// --------------------------------------------------------------------------------------------- //
