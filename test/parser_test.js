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

const { Assert, Log } = require("./common");
const { ParserValidateRaw, ParserComparatorRaw, ParserResolveInclude } = require("../dist/parser");

// --------------------------------------------------------------------------------------------- //

const TestMain = () => {

    // ----------------------------------------------------------------------------------------- //

    Log("Test validating basic text");
    Assert(ParserValidateRaw([
        "example.com",
        "www.example.com",
    ].join("\n")) === true);
    Log("Test passed");

    Log("");

    // ----------------------------------------------------------------------------------------- //

    Log("Test validating unexpected HTML");
    Assert(ParserValidateRaw("<!DOCTYPE>") === false);
    Log("Test passed");

    Log("");

    // ----------------------------------------------------------------------------------------- //

    const comparator = new ParserComparatorRaw();

    // ----------------------------------------------------------------------------------------- //

    Log("Test comparing filters with different line endings");
    {
        const a = [
            "example.com",
            "www.example.com",
        ].join("\n");
        const b = [
            "example.com",
            "",
            "www.example.com",
            "",
        ].join("\r\n");
        Assert(comparator.AreEqual(a, b) === true);
    }
    Log("Test passed");

    Log("");

    // ----------------------------------------------------------------------------------------- //

    Log("Test comparing filters with different comments");
    {
        const a = [
            "! Comment a1",
            "example.com",
            "#",
            "www.example.com",
            "# Comment a2",
        ].join("\n");
        const b = [
            "! Comment b1",
            "example.com",
            "www.example.com",
            "# Comment b2",
        ].join("\n");
        Assert(comparator.AreEqual(a, b) === true);
    }
    Log("Test passed");

    Log("");

    // ----------------------------------------------------------------------------------------- //

    Log("Test comparing filters with different network rules");
    {
        const a = [
            "example.com",
            "www1.example.com",
        ].join("\n");
        const b = [
            "example.com",
            "www2.example.com",
        ].join("\n");
        Assert(comparator.AreEqual(a, b) === false);
    }
    Log("Test passed");

    Log("");

    // ----------------------------------------------------------------------------------------- //

    Log("Test comparing filters with different cosmetic rules");
    {
        const a = [
            "##.rule1",
            "example.com",
            "www.example.com",
        ].join("\n");
        const b = [
            "##.rule2",
            "example.com",
            "www.example.com",
        ].join("\n");
        Assert(comparator.AreEqual(a, b) === false);
    }
    Log("Test passed");

    Log("");

    // ----------------------------------------------------------------------------------------- //

    Log("Test comparing filters with different title headers");
    {
        const a = [
            "! Title: Filter a",
            "example.com",
            "www.example.com",
        ].join("\n");
        const b = [
            "! Title: Filter b",
            "example.com",
            "www.example.com",
        ].join("\n");
        Assert(comparator.AreEqual(a, b) === false);
    }
    Log("Test passed");

    Log("");

    // ----------------------------------------------------------------------------------------- //

    Log("Test comparing filters with different expires headers");
    {
        const a = [
            "# EXPIRES: 3 days",
            "example.com",
            "www.example.com",
        ].join("\n");
        const b = [
            "# EXPIRES: 4 days",
            "example.com",
            "www.example.com",
        ].join("\n");
        Assert(comparator.AreEqual(a, b) === false);
    }
    Log("Test passed");

    Log("");

    // ----------------------------------------------------------------------------------------- //

    Log("Test comparing filters with different directives");
    {
        const a = [
            "!#include a.txt",
            "example.com",
            "www.example.com",
        ].join("\n");
        const b = [
            "!#include b.txt",
            "example.com",
            "www.example.com",
        ].join("\n");
        Assert(comparator.AreEqual(a, b) === false);
    }
    Log("Test passed");

    Log("");

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
            Name: "include/subfilter-0.txt",
            Link: "https://0.0.0.0/",
            IsSubfilter: true,
            Parent: "filter-0.txt",
            Original: "filter-0-subfilter.txt",
        },
        { // 3
            Name: "include/subfilter-1.txt",
            Link: "https://0.0.0.0/",
            IsSubfilter: true,
            Parent: "filter-1.txt",
            Original: "filter-1-subfilter-0.txt",
        },
        { // 4
            Name: "include/subfilter-2.txt",
            Link: "https://0.0.0.0/",
            IsSubfilter: true,
            Parent: "filter-1.txt",
            Original: "filter-1-subfilter-1.txt",
        },
    ];

    const resolver = new ParserResolveInclude(manifest);

    // ----------------------------------------------------------------------------------------- //

    Log("Test resolver normalizes line endings");
    {
        const arr = [
            "text0",
            "text1    ", // Space should be conserved
            "    text2",
        ];
        const data = resolver.Resolve(manifest[2], arr.join("\r\n"));

        arr.push(""); // Final new line added if the original text does not have one
        Assert(data === arr.join("\n")); // Line ending normalized
    }
    Log("Test passed");

    Log("");

    // ----------------------------------------------------------------------------------------- //

    Log("Test resolver resolves 1 subfilter");
    {
        const arr = [
            "text0",
            "text1",
            "!#include filter-0-subfilter.txt",
            "text2",
            "",
        ];
        const data = resolver.Resolve(manifest[0], arr.join("\n"));

        arr[2] = "!#include include/subfilter-0.txt";
        Assert(data === arr.join("\n"));
    }
    Log("Test passed");

    Log("");

    // ----------------------------------------------------------------------------------------- //

    Log("Test resolver resolves 2 subfilters");
    {
        const arr = [
            "text0",
            "!#include filter-1-subfilter-1.txt",
            "text1",
            "!#include filter-1-subfilter-0.txt",
            "text2",
            "",
        ];
        const data = resolver.Resolve(manifest[1], arr.join("\n"));

        arr[1] = "!#include include/subfilter-2.txt";
        arr[3] = "!#include include/subfilter-1.txt";
        Assert(data === arr.join("\n"));
    }
    Log("Test passed");

    Log("");

    // ----------------------------------------------------------------------------------------- //

    Log("Test resolver strips include directives of unknown subresource");
    {
        const arr = [
            "text0",
            "!#include unknown.txt",
            "text1",
            "text2",
            "",
        ];
        const data = resolver.Resolve(manifest[0], arr.join("\n"));

        arr.splice(1, 1);
        Assert(data === arr.join("\n"));
    }
    Log("Test passed, 2 warnings (unknown subresource and missing subresource) should be logged");

    // ----------------------------------------------------------------------------------------- //

};

TestMain();

// --------------------------------------------------------------------------------------------- //
