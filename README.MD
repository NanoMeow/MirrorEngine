# Mirror Engine

Mirror everything

## Installation

Clone this repository and run `npm install`. You need Node.js 10.

## Configuration

```TypeScript
interface ConfigFile {
    User: string,
    Repo: string,

    Secret: string, // Base 64 encoded "user:token"
    Data: string, // Link to "assets.json"
}
```
