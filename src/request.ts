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

"use strict";

// --------------------------------------------------------------------------------------------- //

import http = require("http");
import https = require("https");
import url = require("url");

// --------------------------------------------------------------------------------------------- //

interface RequestResponse {
    res: http.ServerResponse,
    data: string,
}

// --------------------------------------------------------------------------------------------- //

export class RequestEngine {

    private GetOne(link: string): Promise<RequestResponse> {
        return new Promise((resolve, reject) => {

            const opt = url.parse(link);
            if (opt.protocol !== "https")
                reject(new Error("Insecure connection not allowed"));

            const req = https.request(opt);

            req.on("response", (res: http.ServerResponse) => {
                //
            });

        });
    }

    public async Get(link: string): Promise<null | string> {
        let redirect = 5;

        while (redirect > 0) {
            let result;

            try {
                result = await this.GetOne(link);
            } catch (err) {

            }
        }
    }

}

// --------------------------------------------------------------------------------------------- //
