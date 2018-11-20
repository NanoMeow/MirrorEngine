# Mirror Engine

Mirror everything

## Installation

Clone this repository and run `npm install`. You need Node.js 10.

## Configuration

Create `~/mirror-engine-config.json` according to interface below.

```TypeScript
interface ConfigFile {
    User: string,            // GitHub username
    Repo: string,            // GitHub repository name
    Secret: string,          // Base 64 encoded "user:token"

    TimerScale?: number,     // Timer will be this many times longer
                             // Integer from 1 to 10, default 1

    BaseManifest: string,    // Link to "assets.json"
    IncludeManifest: string, // Link to "include.json"

    Lockfile: string,        // Link to "lockfile.txt"
    NameOverride: string,    // Link to "name-override.json"
    LinkBlacklist: string,   // Link to "link-blacklist.txt"
}
```

### `assets.json`

The `Name` of the resource entry will be the manifest key, plus `.txt`
extension if it doesn't already have one. The `Link` will be the first valid
`contentURL`. Both can be overridden if needed. Entry will be skipped if no
valid `Link` can be found.

```TypeScript
interface AssetsJsonEntry {
    contentURL: string | string[],
}

interface AssetsJson {
    [key: string]: AssetsJsonEntry,
}
```

### `include.json`

Similar to `assets.json`, but for subfilters. All subfilters to mirror must be
explicitly listed, `!#include` directive will not be honored. This is designed
this way to avoid surprises when a filter suddenly gets a lot of `!#include`
directives.

```TypeScript
interface IncludeJsonEntry {
    Name: string,     // Name of this subfilter, should be prefixed with
                      // "include/" and should have a file extension
    Link: string,     // Link of this subfilter

    Parent: string,   // Name of parent filter, including file extension
    Original: string, // Original name of this subfilter
}

interface IncludeJson {
    [index: number]: IncludeJsonEntry,
}
```

### `lockfile.txt`

Locked files will be skipped when updating.

One `Name` per line, including file extension. Empty lines and lines starting
with `# ` (hashtag space) are ignored.

### `name-override.json`

If the default `Name` from `assets.json` is not good, they can be overriden
here.

```TypeScript
interface NameOverrideEntry {
    0: string, // Key
    1: string, // Name
}

interface NameOverride {
    [index: number]: NameOverrideEntry,
}
```

### `link-blacklist.txt`

If the default `Link` from `assets.json` is not good, they can be blacklisted.
The next valid `contentURL` will be taken as `Link`.

One `Link` per line. Empty lines and lines starting with `# ` (hashtag space)
are ignored.

## Running

Run `node dist`.

## Other Details

- Logs will be written to `~/mirror-engine-logs/` directory.

- Manifest will be randomly shuffled on every cycle.

- `Link` must be properly encoded (URL and/or punycode).

- Incoming requests are capped at 16 MiB.

- One file will be mirrored every 15 minutes (with default timer scale).

- Locking files is intended to be a temporary measure, and will pause mirroring
  for 5 minutes (with default timer scale). This is designed this way to
  prevent too many network requests being sent when many files are locked.

- To prevent committing `0 changed files`, the current data will be checked with
  GitCDN, which caches the files for 2 hours. So the manifest should have at
  least 9 entries (with default timer scale) that are not locked.
