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

// Network request utility test

// --------------------------------------------------------------------------------------------- //

"use strict";

// --------------------------------------------------------------------------------------------- //

const { Assert, Log } = require("./common");
const { RequestEngine } = require("../dist/request");

// --------------------------------------------------------------------------------------------- //

const TestMain = async () => {

    // ----------------------------------------------------------------------------------------- //

    const requester = new RequestEngine();

    // ----------------------------------------------------------------------------------------- //

    Log("Test GET https://httpbin.org/get");
    {
        const data = await requester.Get("https://httpbin.org/get");
        Assert(
            typeof data.Text === "string" &&
            data.Text.length > 200 &&
            data.Text.startsWith("{")
        );
    }
    Log("Test passed");

    Log("");

    // ----------------------------------------------------------------------------------------- //

    // TODO: This is currently broken, the server redirects to an absolute HTTP link instead of
    // HTTPS

    /*
    Log("Test GET https://httpbin.org/absolute-redirect/2");
    {
        const data = await requester.Get("https://httpbin.org/absolute-redirect/2");
        Assert(
            typeof data.Text === "string" &&
            data.Text.length > 200 &&
            data.Text.startsWith("{")
        );
    }
    Log("Test passed");

    Log("");
    */

    // ----------------------------------------------------------------------------------------- //

    Log("Test GET https://httpbin.org/relative-redirect/2");
    {
        const data = await requester.Get("https://httpbin.org/relative-redirect/2");
        Assert(
            typeof data.Text === "string" &&
            data.Text.length > 200 &&
            data.Text.startsWith("{")
        );
    }
    Log("Test passed");

    Log("");

    // ----------------------------------------------------------------------------------------- //

    Log("Test GET https://httpbin.org/absolute-redirect/10");
    {
        const data = await requester.Get("https://httpbin.org/absolute-redirect/10");
        Assert(
            typeof data.RedirectRefused === "boolean" &&
            data.RedirectRefused === true &&
            typeof data.Text === "undefined"
        );
    }
    Log("Test passed");

    // ----------------------------------------------------------------------------------------- //

};

TestMain();

// --------------------------------------------------------------------------------------------- //
