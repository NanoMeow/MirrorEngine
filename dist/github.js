"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const log_1 = require("./log");
const request_1 = require("./request");
class GitHub {
    constructor(user, secret) {
        this.User = user;
        this.Secret = secret;
        this.Requester = new request_1.RequestEngine();
        this.Requester.SetExtraHeader(request_1.RequestHeadersExtra.Authorization, "Basic " + this.Secret);
        this.Requester.SetExtraHeader(request_1.RequestHeadersExtra.UserAgent, this.User);
    }
    static Base64Encode(data) {
        if (typeof data === "string")
            data = Buffer.from(data);
        return data.toString("base64");
    }
    async UpdateFile(opt) {
        opt.Content = GitHub.Base64Encode(opt.Content);
        const link = "https://api.github.com/repos/" + this.User + "/" + opt.Repo + "/contents" + opt.Path;
        let response = await this.Requester.Get(link, true);
        if (response === null)
            return { success: false };
        let old;
        let sha;
        let parsed;
        try {
            parsed = JSON.parse(response);
            old = parsed.content;
            if (typeof old !== "string")
                old = "";
            sha = parsed.sha;
            if (typeof sha !== "string")
                sha = "";
        }
        catch (err) {
            log_1.LogError(err.message);
            return { success: false };
        }
        if (old === "" || sha === "") {
            log_1.LogDebug("GitHub API returned unexpected response:");
            log_1.LogDebug(JSON.stringify(parsed, null, 4));
        }
        if (opt.Content === old.replace(/\n/g, "")) {
            log_1.LogMessage("File not changed");
            return { success: true };
        }
        const payload = {
            path: opt.Path,
            message: opt.Message,
            content: opt.Content,
            sha: sha,
        };
        let res = await this.Requester.Put(link, payload, true);
        if (res === null)
            return { success: false };
        try {
            const parsed = JSON.parse(res);
            if (parsed instanceof Object &&
                parsed.commit instanceof Object &&
                typeof parsed.commit.sha === "string" &&
                parsed.commit.sha.length > 0) {
                return { success: true };
            }
            else {
                log_1.LogDebug("GitHub API returned unexpected response:");
                log_1.LogDebug(JSON.stringify(parsed, null, 4));
                return { success: false };
            }
        }
        catch (err) {
            log_1.LogError(err.message);
            return { success: false };
        }
    }
}
exports.GitHub = GitHub;
