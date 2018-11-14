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

// Resource parsing utility test

// --------------------------------------------------------------------------------------------- //

"use strict";

// --------------------------------------------------------------------------------------------- //

const assert = require("assert");

const { ParserIncludeResolver } = require("../dist/parser");

// --------------------------------------------------------------------------------------------- //

process.on("unhandledRejection", (err) => {
    throw err;
});

// --------------------------------------------------------------------------------------------- //

const Log = (msg) => {
    console.log(msg);
};

// --------------------------------------------------------------------------------------------- //

const TestMain = () => {

    // ----------------------------------------------------------------------------------------- //

    const manifest = [
        { // 0
            Name: "filter-0.txt",
            Link: "https://0.0.0.0/",
            IsSubfilter: false,
        },
        { // 1
            Name: "filter-1.txt",
            Link: "https://0.0.0.0/",
            IsSubfilter: false,
        },
        { // 2
            Name: "subfilter-0.txt",
            Link: "https://0.0.0.0/",
            IsSubfilter: true,
            Parent: "filter-0.txt",
            Original: "filter-0-subfilter.txt",
        },
        { // 3
            Name: "subfilter-1.txt",
            Link: "https://0.0.0.0/",
            IsSubfilter: true,
            Parent: "filter-1.txt",
            Original: "filter-1-subfilter-0.txt",
        },
        { // 4
            Name: "subfilter-2.txt",
            Link: "https://0.0.0.0/",
            IsSubfilter: true,
            Parent: "filter-1.txt",
            Original: "filter-1-subfilter-1.txt",
        },
    ];

    const resolver = new ParserIncludeResolver(manifest);

    // ----------------------------------------------------------------------------------------- //

    Log("Test 0: Resolving subfilter");
    {
        const data = [
            "text0",
            "text1",
            "text2",
        ].join("\n");
        assert(data === resolver.Resolve(manifest[2], data));
    }
    Log("Test 0: Passed");

    Log("");

    // ----------------------------------------------------------------------------------------- //

};

TestMain();

// --------------------------------------------------------------------------------------------- //
