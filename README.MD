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
element of `contentURL`. Both can be overridden if needed.

```TypeScript
interface AssetsJsonEntry {
    contentURL: string | string[],
}

interface AssetsJson {
    [key: string]: AssetsManifestEntry,
}
```

### `include.json`

Similar to `assets.json`, but for subfilters. All subfilters to mirror must be
explicitly listed, and `!#include` directive will not be honored. This is
designed this way to avoid surprises.

```TypeScript
interface IncludeJson {
    Parent: string,   // Name of parent filter, including file extension
    Original: string, // Original name of this subfilter
    Name: string,     // New name of this subfilter, should be prefixed with
                      // "include/"
    Link: string,     // Link of this subfilter
}
```

### `lockfile.txt`

Locked file will be skipped when updating.

One `Name` per line, including file extension. Empty lines and lines starting
with `# ` (hashtag space) are ignored.

### `name-override.json`

If the default `Name` from `assets.json` is not good, they can be overriden.

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
The next valid element of `contentURL` will be taken as `Link`.

List one link per line. Empty lines and lines starting with `# ` (hashtag
space) are ignored.

## Running

Run `node dist`.

## Other Details

Logs will be written to `~/mirror-engine-logs/` directory.

All requests are capped at `25 MiB`.
