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

const assert = require("assert");

const { RequestEngine } = require("../dist/request");

// --------------------------------------------------------------------------------------------- //

process.on("unhandledRejection", (err) => {
    throw err;
});

const Log = (msg) => {
    console.log(msg);
};

// --------------------------------------------------------------------------------------------- //

const TestMain = async () => {
    const requestEngine = new RequestEngine();

    Log("Test 0: GET https://httpbin.org/get");
    {
        const data = await requestEngine.Get("https://httpbin.org/get");
        assert(typeof data === "string" && data.length > 200 && data.startsWith("{"));
    }
    Log("Test 0: Passed");

    Log("Test 1: GET https://httpbin.org/absolute-redirect/2");
    {
        const data = await requestEngine.Get("https://httpbin.org/absolute-redirect/2");
        assert(typeof data === "string" && data.length > 200 && data.startsWith("{"));
    }
    Log("Test 1: Passed");

    Log("Test 2: GET https://httpbin.org/relative-redirect/2");
    {
        const data = await requestEngine.Get("https://httpbin.org/relative-redirect/2");
        assert(typeof data === "string" && data.length > 200 && data.startsWith("{"));
    }
    Log("Test 2: Passed");

    Log("Test 3: GET https://httpbin.org/absolute-redirect/10");
    {
        const data = await requestEngine.Get("https://httpbin.org/absolute-redirect/10");
        assert(data === null);
    }
    Log("Test 3: Passed");
};

TestMain();

// --------------------------------------------------------------------------------------------- //
