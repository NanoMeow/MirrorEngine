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

// Configuration utility test

// --------------------------------------------------------------------------------------------- //

"use strict";

// --------------------------------------------------------------------------------------------- //

const assert = require("assert");

const { Log } = require("./common");
const { ConfigManifestShuffle } = require("../dist/config");

// --------------------------------------------------------------------------------------------- //

const TestMain = () => {

    // ----------------------------------------------------------------------------------------- //

    let m;

    // ----------------------------------------------------------------------------------------- //

    Log("Test shuffling manifest with 0 items");
    m = [];
    ConfigManifestShuffle(m);
    assert(m.length === 0);
    Log("Test passed");

    Log("");

    // ----------------------------------------------------------------------------------------- //

    Log("Test shuffling manifest with 1 item");
    m = [1];
    ConfigManifestShuffle(m);
    assert(m.length === 1 && m[0] === 1);
    Log("Test passed");

    Log("");

    // ----------------------------------------------------------------------------------------- //

    Log("Test shuffling manifest with 10 items 1000 times");
    {
        let i = 1000;
        while (i-- > 0) {
            m = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
            ConfigManifestShuffle(m);

            assert(m.length === 10);
            const s = new Set(m);
            for (let i = 0; i < 10; i++)
                assert(s.has(i));
        }
    }
    Log("Test passed");

    // ----------------------------------------------------------------------------------------- //

};

TestMain();

// --------------------------------------------------------------------------------------------- //
