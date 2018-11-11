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
import * as url from "url";

import { LogMessage, LogWarning, LogError } from "./log";

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
};

const RequestRedirectStatusCode: Set<number> = new Set<number>([
    301,
    302,
    307,
]);

// --------------------------------------------------------------------------------------------- //

export class RequestEngine {

    // ----------------------------------------------------------------------------------------- //

    private StreamToText(res: http.ServerResponse): Promise<string> {

    }

    private LinkToStream(link: string, method: RequestMethod): Promise<http.ServerResponse> {
        return new Promise((
            resolve: (res: http.ServerResponse) => void,
            reject: (err: Error) => void,
        ): void => {

            LogMessage(method + " " + link);

            const opt: http.ClientRequestArgs = url.parse(link);
            opt.headers = RequestHeadersDefault;
            opt.method = method;

            if (opt.protocol !== "https")
                return void reject(new Error("Unrecognized protocol '" + opt.protocol + "'"));

            const req: http.ClientRequest = https.request(opt);
            req.on("response", resolve);
            req.on("error", reject);
            req.end();

        });
    }

    // ----------------------------------------------------------------------------------------- //

    public async Get(link: string): Promise<null | string> {
        let redirect = 5;

        while (redirect > 0) {
            let res: http.ServerResponse;
            try {
                res = await this.LinkToStream(link, RequestMethod.GET);
            } catch (err) {
                LogError((<Error>err).message);
                return null;
            }

            if (RequestRedirectStatusCode.has(res.statusCode)) {

            }



            let txt: string;
            try {
                txt = await this.StreamToText(res);
            } catch (err) {

            }
        }
    }

    // ----------------------------------------------------------------------------------------- //

}

// --------------------------------------------------------------------------------------------- //
