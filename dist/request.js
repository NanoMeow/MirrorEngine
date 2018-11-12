"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const https = require("https");
const url = require("url");
const zlib = require("zlib");
const log_1 = require("./log");
const RequestHeadersDefault = {
    "Cache-Control": "no-cache",
    "Accept": "text/plain, text/*, */*;q=0.9",
    "Accept-Encoding": "deflate, gzip, identity",
};
var RequestHeadersExtra;
(function (RequestHeadersExtra) {
    RequestHeadersExtra["Accept"] = "Accept";
    RequestHeadersExtra["Authorization"] = "Authorization";
    RequestHeadersExtra["UserAgent"] = "User-Agent";
})(RequestHeadersExtra = exports.RequestHeadersExtra || (exports.RequestHeadersExtra = {}));
var RequestMethods;
(function (RequestMethods) {
    RequestMethods["GET"] = "GET";
    RequestMethods["POST"] = "POST";
    RequestMethods["PUT"] = "PUT";
})(RequestMethods || (RequestMethods = {}));
const RequestRedirectSafeAbsoluteLink = /^https:\/\/(?:\w+\.)+\w+\//;
const RequestRedirectSafeRelativeLink = /^\/\w/;
const RequestRedirectStatusCode = new Set([
    301,
    302,
    307,
]);
class RequestEngine {
    constructor() {
        this.Pending = 0;
        this.ExtraHeaders = {};
    }
    GetPendingRequestsCount() {
        return this.Pending;
    }
    SetExtraHeader(key, val) {
        this.ExtraHeaders[key] = val;
    }
    static StreamToHeader(res, key, def = "") {
        const header = res.headers[key];
        if (typeof header === "undefined")
            return def;
        if (Array.isArray(header))
            return header.join(", ");
        else
            return header;
    }
    static StreamToText(res) {
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
                    reject(new Error("Request Error: Unknown encoding '" + encoding + "'"));
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
                    reject(new Error("Request Error: Response payload too large"));
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
    LinkToStream(link, method, opt) {
        return new Promise((resolve, reject) => {
            log_1.LogMessage(method + " - " + link);
            const option = url.parse(link);
            option.headers = Object.assign({}, RequestHeadersDefault, this.ExtraHeaders);
            option.method = method;
            if (option.protocol !== "https:") {
                return void reject(new Error("Request Error: Unknown protocol '" + option.protocol + "'"));
            }
            const req = https.request(option);
            req.on("response", resolve);
            req.on("error", reject);
            if (typeof opt.payload !== "undefined")
                req.end(opt.payload);
            else
                req.end();
        });
    }
    async LinkToText(link, method = RequestMethods.GET, opt) {
        if (opt instanceof Object === false)
            opt = { stubborn: false };
        let redirect = 5;
        while (redirect-- > 0) {
            let res;
            try {
                res = await this.LinkToStream(link, method, opt);
            }
            catch (err) {
                log_1.LogError(err.message);
                return null;
            }
            if (RequestRedirectStatusCode.has(res.statusCode)) {
                const location = RequestEngine.StreamToHeader(res, "location");
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
                    log_1.LogError("Request Error: Invalid redirect link '" + location + "'");
                    return null;
                }
            }
            if (!opt.stubborn &&
                (res.statusCode < 200 ||
                    res.statusCode > 299)) {
                log_1.LogError("Request Error: Unexpected status code '" + res.statusCode + "'");
                return null;
            }
            let txt;
            try {
                txt = await RequestEngine.StreamToText(res);
            }
            catch (err) {
                log_1.LogError(err.message);
                return null;
            }
            return txt;
        }
        log_1.LogError("Request Error: Too many redirects");
        return null;
    }
    async Get(link, stubborn = false) {
        this.Pending++;
        const result = await this.LinkToText(link, RequestMethods.GET, {
            stubborn: stubborn,
        });
        this.Pending--;
        return result;
    }
    async Put(link, payload, stubborn = false) {
        if (payload instanceof Object)
            payload = JSON.stringify(payload);
        this.Pending++;
        const result = await this.LinkToText(link, RequestMethods.PUT, {
            payload: payload,
            stubborn: stubborn,
        });
        this.Pending--;
        return result;
    }
}
exports.RequestEngine = RequestEngine;
