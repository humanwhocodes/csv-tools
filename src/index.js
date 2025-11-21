/**
 * @fileoverview Main entry point for the project.
 * @author Nicholas C. Zakas
 */

/* @ts-self-types="./index.d.ts" */

/**
 * Helper function to make a ReadableStreamDefaultReader async iterable
 * @param {ReadableStreamDefaultReader<Uint8Array>} reader - The reader to make iterable
 * @returns {AsyncGenerator<Uint8Array>} An async generator that yields values from the reader
 */
async function* makeReaderIterable(reader) {
	while (true) {
		const { done, value } = await reader.read();

		if (done) {
			break;
		}

		yield value;
	}
}

/**
 * Counts rows in a CSV file with configurable options.
 * @param {ReadableStreamDefaultReader<Uint8Array>} reader - The readable stream reader containing CSV data
 * @param {Object} options - Options for counting
 * @param {boolean} [options.countHeaderRow=false] - Whether to count the header row
 * @param {boolean} [options.countEmptyRows=false] - Whether to count empty rows
 * @returns {Promise<number>} The count of rows
 */
export async function countRows(reader, options = {}) {
	const { countHeaderRow = false, countEmptyRows = false } = options;
	const decoder = new TextDecoder();
	let buffer = "";
	let rowCount = 0;
	let isFirstRow = true;

	for await (const value of makeReaderIterable(reader)) {
		buffer += decoder.decode(value, { stream: true });

		// Process complete lines
		let newlineIndex;

		while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
			const line = buffer.substring(0, newlineIndex);

			buffer = buffer.substring(newlineIndex + 1);

			const isEmpty = line.trim() === "";

			// Count based on options
			if (!isEmpty || countEmptyRows) {
				if (isFirstRow) {
					if (countHeaderRow) {
						rowCount++;
					}

					isFirstRow = false;
				} else {
					rowCount++;
				}
			}
		}
	}

	// Process any remaining data in the buffer
	if (buffer.length > 0) {
		const isEmpty = buffer.trim() === "";

		if (!isEmpty || countEmptyRows) {
			if (!isFirstRow || countHeaderRow) {
				rowCount++;
			}
		}
	}

	return rowCount;
}

/**
 * A generator function that yields strings of mini CSV files.
 * Each chunk is a string containing the header row followed by chunkSize data rows.
 * @param {ReadableStreamDefaultReader<Uint8Array>} reader - The readable stream reader containing CSV data
 * @param {Object} options - Options for chunking
 * @param {number} [options.chunkSize=100] - Number of data rows per chunk
 * @param {boolean} [options.includeEmptyRows=false] - Whether to include empty rows
 * @returns {AsyncGenerator<string>} Generator yielding CSV chunks
 */
export async function* chunk(reader, options = {}) {
	const { chunkSize = 100, includeEmptyRows = false } = options;
	const decoder = new TextDecoder();
	let buffer = "";
	let header = null;
	let currentChunk = [];

	for await (const value of makeReaderIterable(reader)) {
		buffer += decoder.decode(value, { stream: true });

		// Process complete lines
		let newlineIndex;

		while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
			const line = buffer.substring(0, newlineIndex);

			buffer = buffer.substring(newlineIndex + 1);

			const isEmpty = line.trim() === "";

			// Skip empty lines unless includeEmptyRows is true
			if (isEmpty && !includeEmptyRows) {
				continue;
			}

			// First non-empty line is the header
			if (header === null) {
				header = line.trim();
			} else {
				currentChunk.push(line.trim());

				// Yield chunk when it reaches the specified size
				if (currentChunk.length === chunkSize) {
					yield header + "\n" + currentChunk.join("\n");
					currentChunk = [];
				}
			}
		}
	}

	// Process any remaining data in the buffer
	if (buffer.length > 0) {
		const isEmpty = buffer.trim() === "";

		if (header === null) {
			if (!isEmpty || includeEmptyRows) {
				header = buffer.trim();
			}
		} else {
			if (!isEmpty || includeEmptyRows) {
				currentChunk.push(buffer.trim());
			}
		}
	}

	// Yield any remaining rows
	if (currentChunk.length > 0 && header !== null) {
		yield header + "\n" + currentChunk.join("\n");
	}
}
