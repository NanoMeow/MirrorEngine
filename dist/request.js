"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const https = require("https");
const url = require("url");
const zlib = require("zlib");
const log_1 = require("./log");
var RequestMethod;
(function (RequestMethod) {
    RequestMethod["GET"] = "GET";
    RequestMethod["POST"] = "POST";
    RequestMethod["PUT"] = "PUT";
})(RequestMethod || (RequestMethod = {}));
const RequestHeadersDefault = {
    "Cache-Control": "no-cache",
    "Accept": "text/plain, text/*, */*;q=0.9",
    "Accept-Encoding": "deflate, gzip, identity",
};
const RequestRedirectStatusCode = new Set([
    301,
    302,
    307,
]);
exports.RequestSetUserAgent = (str) => {
    RequestHeadersDefault["User-Agent"] = str;
};
const RequestRedirectSafeAbsoluteLink = /^https:\/\/(?:\w+\.)+\w+\//;
const RequestRedirectSafeRelativeLink = /^\/\w/;
class RequestEngine {
    constructor() {
        this.Busy = false;
    }
    StreamToHeader(res, key, def = "") {
        const header = res.headers[key];
        if (typeof header === "undefined")
            return def;
        if (Array.isArray(header))
            return header.join(",");
        else
            return header;
    }
    StreamToText(res) {
        return new Promise((resolve, reject) => {
            let s;
            const encoding = this.StreamToHeader(res, "content-encoding", "identity");
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
            let aborted = false;
            let data = "";
            s.setEncoding("utf8");
            s.on("data", (c) => {
                if (aborted)
                    return;
                data += c;
                if (data.length > 10 * 1024 * 1024) {
                    aborted = true;
                    reject(new Error("Payload too large"));
                }
            });
            s.on("end", () => {
                if (aborted)
                    return;
                resolve(data);
            });
            s.on("error", (err) => {
                if (aborted)
                    return;
                aborted = true;
                reject(err);
            });
        });
    }
    LinkToStream(link, method, payload) {
        return new Promise((resolve, reject) => {
            log_1.LogMessage(method + " - " + link);
            const opt = url.parse(link);
            opt.headers = RequestHeadersDefault;
            opt.method = method;
            if (opt.protocol !== "https:")
                return void reject(new Error("Unrecognized protocol '" + opt.protocol + "'"));
            const req = https.request(opt);
            req.on("response", resolve);
            req.on("error", reject);
            if (typeof payload !== "undefined")
                req.end(payload);
            else
                req.end();
        });
    }
    async LinkToText(link, method = RequestMethod.GET, payload) {
        let redirect = 5;
        while (redirect-- > 0) {
            let res;
            try {
                res = await this.LinkToStream(link, method, payload);
            }
            catch (err) {
                log_1.LogError(err.message);
                return null;
            }
            if (RequestRedirectStatusCode.has(res.statusCode)) {
                const location = this.StreamToHeader(res, "location");
                if (RequestRedirectSafeAbsoluteLink.test(location)) {
                    res.resume();
                    link = location;
                    continue;
                }
                else if (RequestRedirectSafeRelativeLink.test(location)) {
                    res.resume();
                    link = "https://" + url.parse(link).hostname + location;
                    continue;
                }
                else {
                    log_1.LogError("Invalid redirect link '" + location + "'");
                    return null;
                }
            }
            if (res.statusCode < 200 || res.statusCode > 299) {
                log_1.LogError("Unexpected Status Code '" + res.statusCode + "'");
                return null;
            }
            let txt;
            try {
                txt = await this.StreamToText(res);
            }
            catch (err) {
                log_1.LogError(err.message);
                return null;
            }
            return txt;
        }
        log_1.LogError("Too Many Redirects");
        return null;
    }
    async Get(link) {
        if (this.Busy) {
            log_1.LogError("Request Engine Busy");
            return null;
        }
        this.Busy = true;
        const result = await this.LinkToText(link);
        this.Busy = false;
        return result;
    }
}
exports.RequestEngine = RequestEngine;
