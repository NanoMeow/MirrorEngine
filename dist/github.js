"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = require("crypto");
const log_1 = require("./log");
const request_1 = require("./request");
const GitHubBase64Encode = (data) => {
    const buf = Buffer.from(data);
    return buf.toString("base64");
};
const GitHubSha = (data) => {
    const sha1 = crypto.createHash("sha1");
    sha1.update(data);
    return sha1.digest("hex");
};
const GitHubContentRequester = new request_1.RequestEngine();
exports.GitHubContent = async (opt) => {
    const res = await GitHubContentRequester.Get("https://raw.githubusercontent.com/" + opt.User + "/" + opt.Repo + "/master" + opt.Path);
    if (typeof res.Text === "string") {
        return {
            Response: res,
            Sha: GitHubSha(res.Text),
        };
    }
    else {
        return {
            Response: res,
        };
    }
};
class GitHub {
    constructor(user, secret) {
        this.User = user;
        this.Secret = secret;
        this.Requester = new request_1.RequestEngine();
        this.Requester.SetHeadersCustom(request_1.RequestHeadersCustomizable.Authorization, "Basic " + this.Secret);
        this.Requester.SetHeadersCustom(request_1.RequestHeadersCustomizable.UserAgent, this.User);
    }
    async UpdateFile(opt) {
        const current = await exports.GitHubContent({
            User: this.User,
            Repo: opt.Repo,
            Path: opt.Path,
        });
        if (typeof current.Sha === "string") {
            if (opt.Content === current.Response.Text) {
                log_1.LogMessage("File not changed");
                return { Success: true };
            }
        }
        else {
            current.Sha = "";
        }
        const payload = {
            path: opt.Path,
            message: opt.Message,
            content: GitHubBase64Encode(opt.Content),
            sha: current.Sha,
        };
        const res = await this.Requester.Put("https://api.github.com/repos/" + this.User + "/" + opt.Repo + "/contents" + opt.Path, payload, {
            Stubborn: true,
        });
        if (typeof res.Text !== "string")
            return { Success: false };
        try {
            const parsed = JSON.parse(res.Text);
            if (typeof parsed === "object" &&
                typeof parsed.commit === "object" &&
                typeof parsed.commit.sha === "string" &&
                parsed.commit.sha.length > 0) {
                return { Success: true };
            }
            else {
                log_1.LogDebug("GitHub API returned unexpected response:");
                log_1.LogDebug(JSON.stringify(parsed, null, 4));
                return { Success: false };
            }
        }
        catch (err) {
            log_1.LogError(err.message);
            return { Success: false };
        }
    }
}
exports.GitHub = GitHub;
