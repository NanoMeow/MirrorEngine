"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const https = require("https");
const url = require("url");
const zlib = require("zlib");
const log_1 = require("./log");
const RESPONSE_MAX_SIZE = 16 * 1024 * 1024;
var RequestHeadersCustomizable;
(function (RequestHeadersCustomizable) {
    RequestHeadersCustomizable["Accept"] = "Accept";
    RequestHeadersCustomizable["Authorization"] = "Authorization";
    RequestHeadersCustomizable["UserAgent"] = "User-Agent";
})(RequestHeadersCustomizable = exports.RequestHeadersCustomizable || (exports.RequestHeadersCustomizable = {}));
var RequestMethods;
(function (RequestMethods) {
    RequestMethods["GET"] = "GET";
    RequestMethods["POST"] = "POST";
    RequestMethods["PUT"] = "PUT";
})(RequestMethods || (RequestMethods = {}));
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
const RequestRedirectSafeAbsoluteLink = /^https:\/\/(?:\w+\.)+\w+\//;
const RequestRedirectSafeRelativeLink = /^\/\w/;
class RequestEngine {
    constructor() {
        this.PendingRequestsCount = 0;
        this.HeadersCustom = {};
    }
    PendingRequestsCountGet() {
        return this.PendingRequestsCount;
    }
    HeadersCustomSet(key, val) {
        this.HeadersCustom[key] = val;
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
            const encoding = RequestEngine.StreamToHeader(res, "content-encoding", "identity");
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
                if (data.length > RESPONSE_MAX_SIZE) {
                    aborted = true;
                    data = "";
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
                data = "";
                reject(err);
            });
        });
    }
    LinkToStream(link, method, opt) {
        return new Promise((resolve, reject) => {
            log_1.LogMessage(method + " - " + link);
            const headers = Object.keys(this.HeadersCustom);
            if (headers.length > 0)
                log_1.LogDebug("Sending custom headers: '" + headers.join("', '") + "'");
            const option = url.parse(link);
            option.headers = Object.assign({}, RequestHeadersDefault, this.HeadersCustom);
            option.method = method;
            if (option.protocol !== "https:") {
                return void reject(new Error("Request Error: Unknown protocol '" + option.protocol + "'"));
            }
            const req = https.request(option);
            req.on("response", resolve);
            req.on("error", reject);
            if (typeof opt.Payload !== "undefined")
                req.end(opt.Payload);
            else
                req.end();
        });
    }
    async LinkToResponse(link, method, opt) {
        if (typeof opt === "undefined")
            opt = {};
        const log = (msg) => {
            if (opt.ErrorSuppress)
                log_1.LogDebug(msg);
            else
                log_1.LogError(msg);
        };
        let res;
        let redirect = 5;
        while (redirect-- > 0) {
            try {
                res = await this.LinkToStream(link, method, opt);
            }
            catch (err) {
                log(err.message);
                return {};
            }
            if (RequestRedirectStatusCode.has(res.statusCode)) {
                const location = RequestEngine.StreamToHeader(res, "location");
                if (RequestRedirectSafeAbsoluteLink.test(location)) {
                    res.resume();
                    link = location;
                    continue;
                }
                if (RequestRedirectSafeRelativeLink.test(location)) {
                    res.resume();
                    link = "https://" + url.parse(link).hostname + location;
                    continue;
                }
                log("Request Error: Invalid redirect link '" + location + "'");
                return {
                    RedirectRefused: true,
                    Stream: res,
                };
            }
            if (!opt.Stubborn && (res.statusCode < 200 || res.statusCode > 299)) {
                log("Request Error: Unexpected status code '" + res.statusCode + "'");
                return { Stream: res };
            }
            let txt;
            try {
                txt = await RequestEngine.StreamToText(res);
            }
            catch (err) {
                log(err.message);
                return { Stream: res };
            }
            return {
                Stream: res,
                Text: txt,
            };
        }
        log("Request Error: Too many redirects");
        return {
            RedirectRefused: true,
            Stream: res,
        };
    }
    async Get(link, opt) {
        this.PendingRequestsCount++;
        const result = await this.LinkToResponse(link, RequestMethods.GET, opt);
        this.PendingRequestsCount--;
        return result;
    }
    static BindPayload(payload, opt) {
        if (typeof payload !== "string")
            payload = JSON.stringify(payload);
        if (typeof opt === "undefined")
            opt = {};
        assert(typeof opt.Payload === "undefined");
        opt.Payload = payload;
        return opt;
    }
    async Post(link, payload, opt) {
        opt = RequestEngine.BindPayload(payload, opt);
        this.PendingRequestsCount++;
        const result = await this.LinkToResponse(link, RequestMethods.POST, opt);
        this.PendingRequestsCount--;
        return result;
    }
    async Put(link, payload, opt) {
        opt = RequestEngine.BindPayload(payload, opt);
        this.PendingRequestsCount++;
        const result = await this.LinkToResponse(link, RequestMethods.PUT, opt);
        this.PendingRequestsCount--;
        return result;
    }
}
exports.RequestEngine = RequestEngine;
