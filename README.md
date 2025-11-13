# CSV Tools

by [Nicholas C. Zakas](https://humanwhocodes.com)

If you find this useful, please consider supporting my work with a [donation](https://humanwhocodes.com/donate).

## Description

A collection of tools for processing CSV files using streams. This package provides functions to count data rows and split CSV data into smaller chunks while preserving headers.

## Installation

### npm

```shell
npm install @humanwhocodes/csv-tools
```

### JSR

```shell
npx jsr add @humanwhocodes/csv-tools
```

### Deno

```shell
deno add jsr:@humanwhocodes/csv-tools
```

## Usage

This package exports two main functions for working with CSV data via `ReadableStream` objects:

### `countDataRows(stream)`

Counts all of the data rows in a CSV file, excluding the header row. Trailing newline characters and empty lines are not counted as rows.

```javascript
import { countDataRows } from "@humanwhocodes/csv-tools";

// From a file in Node.js
import { createReadStream } from "node:fs";
import { ReadableStream } from "node:stream/web";

const fileStream = createReadStream("data.csv");
const webStream = ReadableStream.from(fileStream);
const count = await countDataRows(webStream);
console.log(`Found ${count} data rows`);
```

**Parameters:**

- `stream` (`ReadableStream<Uint8Array>`) - A readable stream containing CSV data

**Returns:** `Promise<number>` - The count of data rows in the CSV file

### `chunk(stream, options)`

An async generator function that yields strings of mini CSV files. Each chunk contains the header row followed by up to `chunkSize` data rows.

```javascript
import { chunk } from "@humanwhocodes/csv-tools";

// From a file in Node.js
import { createReadStream } from "node:fs";
import { ReadableStream } from "node:stream/web";

const fileStream = createReadStream("data.csv");
const webStream = ReadableStream.from(fileStream);

// Process CSV in chunks of 50 rows
for await (const csvChunk of chunk(webStream, { chunkSize: 50 })) {
	// Each csvChunk is a string with header + up to 50 data rows
	console.log("Processing chunk:");
	console.log(csvChunk);
	// Process the chunk...
}
```

**Parameters:**

- `stream` (`ReadableStream<Uint8Array>`) - A readable stream containing CSV data
- `options` (`Object`) - Configuration options
    - `chunkSize` (`number`, optional) - Number of data rows per chunk. Default: 100

**Returns:** `AsyncGenerator<string>` - An async generator yielding CSV chunks as strings

### Example: Browser Usage

```javascript
import { countDataRows, chunk } from "@humanwhocodes/csv-tools";

// Fetch CSV from URL
const response = await fetch("https://example.com/data.csv");
const stream = response.body;

// Count rows
const rowCount = await countDataRows(stream);
console.log(`Total rows: ${rowCount}`);

// Or process in chunks
const response2 = await fetch("https://example.com/data.csv");
for await (const csvChunk of chunk(response2.body, { chunkSize: 100 })) {
	// Process each chunk
	await processData(csvChunk);
}
```

## Features

- **Stream-based processing** - Memory efficient handling of large CSV files
- **Preserves headers** - Each chunk includes the CSV header row
- **Handles edge cases** - Properly skips empty lines and ignores trailing newlines
- **TypeScript support** - Full type definitions included
- **Cross-platform** - Works in Node.js, Deno, and browsers

## License

Copyright 2025 Nicholas C. Zakas

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
