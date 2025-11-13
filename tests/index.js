/**
 * @fileoverview Tests for CSV tools
 * @author Nicholas C. Zakas
 */

import assert from "node:assert";
import { countDataRows, chunk } from "../dist/index.js";

/**
 * Helper function to create a ReadableStream from a string
 * @param {string} text - The text to convert to a stream
 * @returns {ReadableStream<Uint8Array>} A readable stream
 */
function createStreamFromString(text) {
	const encoder = new TextEncoder();
	const data = encoder.encode(text);

	return new ReadableStream({
		start(controller) {
			controller.enqueue(data);
			controller.close();
		},
	});
}

describe("countDataRows", () => {
	it("should count data rows excluding header", async () => {
		const csv = "name,age\nAlice,30\nBob,25\nCharlie,35";
		const stream = createStreamFromString(csv);
		const count = await countDataRows(stream);

		assert.strictEqual(count, 3);
	});

	it("should return 0 for CSV with only header", async () => {
		const csv = "name,age";
		const stream = createStreamFromString(csv);
		const count = await countDataRows(stream);

		assert.strictEqual(count, 0);
	});

	it("should return 0 for empty CSV", async () => {
		const csv = "";
		const stream = createStreamFromString(csv);
		const count = await countDataRows(stream);

		assert.strictEqual(count, 0);
	});

	it("should not count trailing newline as a row", async () => {
		const csv = "name,age\nAlice,30\nBob,25\n";
		const stream = createStreamFromString(csv);
		const count = await countDataRows(stream);

		assert.strictEqual(count, 2);
	});

	it("should not count multiple trailing newlines as rows", async () => {
		const csv = "name,age\nAlice,30\nBob,25\n\n\n";
		const stream = createStreamFromString(csv);
		const count = await countDataRows(stream);

		assert.strictEqual(count, 2);
	});

	it("should handle CSV with single data row", async () => {
		const csv = "name,age\nAlice,30";
		const stream = createStreamFromString(csv);
		const count = await countDataRows(stream);

		assert.strictEqual(count, 1);
	});

	it("should skip empty lines in the middle", async () => {
		const csv = "name,age\nAlice,30\n\nBob,25\nCharlie,35";
		const stream = createStreamFromString(csv);
		const count = await countDataRows(stream);

		assert.strictEqual(count, 3);
	});

	it("should handle large CSV file", async () => {
		let csv = "name,age\n";

		for (let i = 0; i < 1000; i++) {
			csv += `Person${i},${20 + i}\n`;
		}

		const stream = createStreamFromString(csv);
		const count = await countDataRows(stream);

		assert.strictEqual(count, 1000);
	});
});

describe("chunk", () => {
	it("should yield chunks with default chunkSize of 100", async () => {
		let csv = "name,age\n";

		for (let i = 0; i < 250; i++) {
			csv += `Person${i},${20 + i}\n`;
		}

		const stream = createStreamFromString(csv);
		const chunks = [];

		for await (const chunkData of chunk(stream)) {
			chunks.push(chunkData);
		}

		assert.strictEqual(chunks.length, 3);

		// First chunk should have header + 100 rows
		const firstChunkLines = chunks[0].split("\n");

		assert.strictEqual(firstChunkLines[0], "name,age");
		assert.strictEqual(firstChunkLines.length, 101);

		// Second chunk should have header + 100 rows
		const secondChunkLines = chunks[1].split("\n");

		assert.strictEqual(secondChunkLines[0], "name,age");
		assert.strictEqual(secondChunkLines.length, 101);

		// Third chunk should have header + 50 rows
		const thirdChunkLines = chunks[2].split("\n");

		assert.strictEqual(thirdChunkLines[0], "name,age");
		assert.strictEqual(thirdChunkLines.length, 51);
	});

	it("should yield chunks with custom chunkSize", async () => {
		const csv = "name,age\nAlice,30\nBob,25\nCharlie,35\nDavid,40\nEve,28";
		const stream = createStreamFromString(csv);
		const chunks = [];

		for await (const chunkData of chunk(stream, { chunkSize: 2 })) {
			chunks.push(chunkData);
		}

		assert.strictEqual(chunks.length, 3);

		// First chunk: header + 2 rows
		assert.strictEqual(chunks[0], "name,age\nAlice,30\nBob,25");

		// Second chunk: header + 2 rows
		assert.strictEqual(chunks[1], "name,age\nCharlie,35\nDavid,40");

		// Third chunk: header + 1 row
		assert.strictEqual(chunks[2], "name,age\nEve,28");
	});

	it("should handle CSV with only header", async () => {
		const csv = "name,age";
		const stream = createStreamFromString(csv);
		const chunks = [];

		for await (const chunkData of chunk(stream)) {
			chunks.push(chunkData);
		}

		assert.strictEqual(chunks.length, 0);
	});

	it("should handle empty CSV", async () => {
		const csv = "";
		const stream = createStreamFromString(csv);
		const chunks = [];

		for await (const chunkData of chunk(stream)) {
			chunks.push(chunkData);
		}

		assert.strictEqual(chunks.length, 0);
	});

	it("should handle CSV with single data row", async () => {
		const csv = "name,age\nAlice,30";
		const stream = createStreamFromString(csv);
		const chunks = [];

		for await (const chunkData of chunk(stream)) {
			chunks.push(chunkData);
		}

		assert.strictEqual(chunks.length, 1);
		assert.strictEqual(chunks[0], "name,age\nAlice,30");
	});

	it("should skip empty lines", async () => {
		const csv = "name,age\nAlice,30\n\nBob,25\n\n\nCharlie,35";
		const stream = createStreamFromString(csv);
		const chunks = [];

		for await (const chunkData of chunk(stream, { chunkSize: 2 })) {
			chunks.push(chunkData);
		}

		assert.strictEqual(chunks.length, 2);
		assert.strictEqual(chunks[0], "name,age\nAlice,30\nBob,25");
		assert.strictEqual(chunks[1], "name,age\nCharlie,35");
	});

	it("should not include trailing newlines in chunks", async () => {
		const csv = "name,age\nAlice,30\nBob,25\n";
		const stream = createStreamFromString(csv);
		const chunks = [];

		for await (const chunkData of chunk(stream, { chunkSize: 2 })) {
			chunks.push(chunkData);
		}

		assert.strictEqual(chunks.length, 1);
		assert.strictEqual(chunks[0], "name,age\nAlice,30\nBob,25");
	});

	it("should handle exact multiple of chunkSize", async () => {
		const csv = "name,age\nAlice,30\nBob,25\nCharlie,35\nDavid,40";
		const stream = createStreamFromString(csv);
		const chunks = [];

		for await (const chunkData of chunk(stream, { chunkSize: 2 })) {
			chunks.push(chunkData);
		}

		assert.strictEqual(chunks.length, 2);
		assert.strictEqual(chunks[0], "name,age\nAlice,30\nBob,25");
		assert.strictEqual(chunks[1], "name,age\nCharlie,35\nDavid,40");
	});

	it("should preserve header in each chunk", async () => {
		const csv =
			"id,name,email\n1,Alice,alice@example.com\n2,Bob,bob@example.com\n3,Charlie,charlie@example.com";
		const stream = createStreamFromString(csv);
		const chunks = [];

		for await (const chunkData of chunk(stream, { chunkSize: 1 })) {
			chunks.push(chunkData);
		}

		assert.strictEqual(chunks.length, 3);

		for (const chunkData of chunks) {
			const lines = chunkData.split("\n");

			assert.strictEqual(lines[0], "id,name,email");
		}
	});
});
