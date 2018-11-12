# Mirror Engine

Mirror everything

## Installation

Clone this repository and run `npm install`. You need Node.js 10.

## Configuration

Create `~/mirror-engine-config.json` according to interface below.

```TypeScript
interface ConfigFile {
    User: string,   // GitHub username
    Repo: string,   // GitHub repository name

    Secret: string, // Base 64 encoded "user:token"

    Data: string,   // Link to "assets.json"
    Lock: string,   // Link to "lockfile"
}
```

## `assets.json`

```TypeScript
interface AssetsManifestEntry {
    contentURL: string | string[],
}

interface AssetsManifest {
    [key: string]: AssetsManifestEntry,
}
```

## `lockfile`

One file name per line, locked file will be skipped when updating.

## Running

Run `node dist`.
