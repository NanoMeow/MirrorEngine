"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const log_1 = require("./log");
const request_1 = require("./request");
const GitHubBase64Encode = (data) => {
    const buf = Buffer.from(data);
    return buf.toString("base64");
};
class GitHub {
    constructor(user, secret) {
        this.User = user;
        this.Secret = secret;
        this.Requester = new request_1.RequestEngine();
        this.Requester.SetHeadersCustom(request_1.RequestHeadersCustomizable.UserAgent, this.User);
        this.Requester.SetHeadersCustom(request_1.RequestHeadersCustomizable.Authorization, "Basic " + this.Secret);
    }
    async FindSha(opt) {
        const payload = [
            "{",
            '  repository(owner: "' + this.User + '", name: "' + opt.Repo + '") {',
            '    object(expression: "master:' + opt.Path + '") {',
            "      ... on Blob {",
            "        oid",
            "      }",
            "    }",
            "  }",
            "}"
        ].join("\n");
        const res = await this.Requester.Post("https://api.github.com/graphql", {
            query: payload,
        }, {
            Stubborn: true,
        });
        if (typeof res.Text === "undefined")
            return {};
        try {
            const parsed = JSON.parse(res.Text);
            if (typeof parsed === "object" &&
                typeof parsed.data === "object" &&
                typeof parsed.data.repository === "object" &&
                typeof parsed.data.repository.object === "object" &&
                typeof parsed.data.repository.object.oid === "string" &&
                parsed.data.repository.object.oid.length > 0) {
                return { Sha: parsed.data.repository.object.oid };
            }
            else {
                log_1.LogDebug("GitHub API returned unexpected response:");
                log_1.LogDebug(JSON.stringify(parsed, null, 2));
                return {};
            }
        }
        catch (err) {
            log_1.LogError(err.message);
            return {};
        }
    }
    async UpdateFile(opt) {
        const sha = (await this.FindSha(opt)).Sha || "";
        const payload = {
            path: opt.Path,
            message: opt.Message,
            content: GitHubBase64Encode(opt.Content),
            sha: sha,
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
