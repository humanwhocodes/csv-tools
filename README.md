# CSV Tools

by [Nicholas C. Zakas](https://humanwhocodes.com)

If you find this useful, please consider supporting my work with a [donation](https://humanwhocodes.com/donate).

## Description

A collection of tools for processing CSV files using streams. This package provides functions to count data rows and split CSV data into smaller chunks while preserving headers.

## Installation

```shell
npm install @humanwhocodes/csv-tools
```

## Usage

This package exports two main functions for working with CSV data via `ReadableStreamDefaultReader` objects:

### `countRows(reader, options)`

Counts rows in a CSV file with configurable options.

```javascript
import { countRows } from "@humanwhocodes/csv-tools";

// From a file in Node.js
import { createReadStream } from "node:fs";
import { ReadableStream } from "node:stream/web";

const fileStream = createReadStream("data.csv");
const webStream = ReadableStream.from(fileStream);
const reader = webStream.getReader();

// Count only data rows (exclude header)
const dataRowCount = await countRows(reader);
console.log(`Found ${dataRowCount} data rows`);

// Count all rows including header
const fileStream2 = createReadStream("data.csv");
const webStream2 = ReadableStream.from(fileStream2);
const reader2 = webStream2.getReader();
const totalRowCount = await countRows(reader2, { countHeaderRow: true });
console.log(`Found ${totalRowCount} total rows`);
```

**Parameters:**

- `reader` (`ReadableStreamDefaultReader<Uint8Array>`) - A readable stream reader containing CSV data
- `options` (`Object`, optional) - Configuration options
    - `countHeaderRow` (`boolean`, default: `false`) - Whether to count the header row
    - `countEmptyRows` (`boolean`, default: `false`) - Whether to count empty rows

**Returns:** `Promise<number>` - The count of rows in the CSV file

### `chunk(reader, options)`

An async generator function that yields strings of mini CSV files. Each chunk contains the header row followed by up to `chunkSize` data rows.

```javascript
import { chunk } from "@humanwhocodes/csv-tools";

// From a file in Node.js
import { createReadStream } from "node:fs";
import { ReadableStream } from "node:stream/web";

const fileStream = createReadStream("data.csv");
const webStream = ReadableStream.from(fileStream);
const reader = webStream.getReader();

// Process CSV in chunks of 50 rows
for await (const csvChunk of chunk(reader, { chunkSize: 50 })) {
	// Each csvChunk is a string with header + up to 50 data rows
	console.log("Processing chunk:");
	console.log(csvChunk);
	// Process the chunk...
}
```

**Parameters:**

- `reader` (`ReadableStreamDefaultReader<Uint8Array>`) - A readable stream reader containing CSV data
- `options` (`Object`) - Configuration options
    - `chunkSize` (`number`, optional) - Number of data rows per chunk. Default: 100
    - `includeEmptyRows` (`boolean`, optional) - Whether to include empty rows. Default: false

**Returns:** `AsyncGenerator<string>` - An async generator yielding CSV chunks as strings

### Example: Browser Usage

```javascript
import { countRows, chunk } from "@humanwhocodes/csv-tools";

// Fetch CSV from URL
const response = await fetch("https://example.com/data.csv");
const reader = response.body.getReader();

// Count rows
const rowCount = await countRows(reader);
console.log(`Total rows: ${rowCount}`);

// Or process in chunks
const response2 = await fetch("https://example.com/data.csv");
const reader2 = response2.body.getReader();
for await (const csvChunk of chunk(reader2, { chunkSize: 100 })) {
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
