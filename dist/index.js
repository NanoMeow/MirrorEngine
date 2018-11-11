"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const request_1 = require("./request");
const main = async () => {
    const requester = new request_1.RequestEngine();
    console.log(requester.Get("https://example.com/"));
};
main();
