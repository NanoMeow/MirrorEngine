"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const https = require("https");
const url = require("url");
const zlib = require("zlib");
const log_1 = require("./log");
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
                if (data.length > 25 * 1024 * 1024) {
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
            if (typeof opt.Payload !== "undefined")
                req.end(opt.Payload);
            else
                req.end();
        });
    }
    async LinkToResponse(link, method, opt) {
        if (typeof opt === "undefined")
            opt = {};
        let res;
        let redirect = 5;
        while (redirect-- > 0) {
            res = undefined;
            try {
                res = await this.LinkToStream(link, method, opt);
            }
            catch (err) {
                log_1.LogError(err.message);
                return {};
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
                    return {
                        RedirectRefused: true,
                        Stream: res,
                    };
                }
            }
            if (!opt.Stubborn && (res.statusCode < 200 || res.statusCode > 299)) {
                log_1.LogError("Request Error: Unexpected status code '" + res.statusCode + "'");
                return { Stream: res };
            }
            let txt;
            try {
                txt = await RequestEngine.StreamToText(res);
            }
            catch (err) {
                log_1.LogError(err.message);
                return { Stream: res };
            }
            return {
                Stream: res,
                Text: txt,
            };
        }
        log_1.LogError("Request Error: Too many redirects");
        return {
            RedirectRefused: true,
            Stream: res,
        };
    }
    async Get(link, opt) {
        this.Pending++;
        const result = await this.LinkToResponse(link, RequestMethods.GET, opt);
        this.Pending--;
        return result;
    }
    async Put(link, payload, opt) {
        if (typeof payload === "object")
            payload = JSON.stringify(payload);
        if (typeof opt === "undefined")
            opt = {};
        opt.Payload = payload;
        this.Pending++;
        const result = await this.LinkToResponse(link, RequestMethods.PUT, opt);
        this.Pending--;
        return result;
    }
}
exports.RequestEngine = RequestEngine;
