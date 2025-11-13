/**
 * @fileoverview Main entry point for the project.
 * @author Nicholas C. Zakas
 */

/* @ts-self-types="./index.d.ts" */

/**
 * Counts all of the data rows in a CSV file (excludes header row).
 * Trailing newline characters must not count as rows.
 * @param {ReadableStream<Uint8Array>} stream - The readable stream containing CSV data
 * @returns {Promise<number>} The count of data rows
 */
export async function countDataRows(stream) {
	const reader = stream.getReader();
	const decoder = new TextDecoder();
	let buffer = "";
	let rowCount = 0;
	let isFirstRow = true;

	try {
		while (true) {
			const { done, value } = await reader.read();

			if (done) {
				// Process any remaining data in the buffer
				if (buffer.length > 0 && buffer.trim() !== "") {
					if (!isFirstRow) {
						rowCount++;
					}
				}

				break;
			}

			buffer += decoder.decode(value, { stream: true });

			// Process complete lines
			let newlineIndex;

			while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
				const line = buffer.substring(0, newlineIndex);

				buffer = buffer.substring(newlineIndex + 1);

				// Skip empty lines and count non-header rows
				if (line.trim() !== "") {
					if (isFirstRow) {
						isFirstRow = false;
					} else {
						rowCount++;
					}
				}
			}
		}
	} finally {
		reader.releaseLock();
	}

	return rowCount;
}

/**
 * A generator function that yields strings of mini CSV files.
 * Each chunk is a string containing the header row followed by chunkSize data rows.
 * @param {ReadableStream<Uint8Array>} stream - The readable stream containing CSV data
 * @param {Object} options - Options for chunking
 * @param {number} [options.chunkSize=100] - Number of data rows per chunk
 * @returns {AsyncGenerator<string>} Generator yielding CSV chunks
 */
export async function* chunk(stream, options = {}) {
	const { chunkSize = 100 } = options;
	const reader = stream.getReader();
	const decoder = new TextDecoder();
	let buffer = "";
	let header = null;
	let currentChunk = [];

	try {
		while (true) {
			const { done, value } = await reader.read();

			if (done) {
				// Process any remaining data in the buffer
				if (buffer.length > 0 && buffer.trim() !== "") {
					if (header === null) {
						header = buffer.trim();
					} else {
						currentChunk.push(buffer.trim());
					}
				}

				// Yield any remaining rows
				if (currentChunk.length > 0 && header !== null) {
					yield header + "\n" + currentChunk.join("\n");
				}

				break;
			}

			buffer += decoder.decode(value, { stream: true });

			// Process complete lines
			let newlineIndex;

			while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
				const line = buffer.substring(0, newlineIndex);

				buffer = buffer.substring(newlineIndex + 1);

				// Skip empty lines
				if (line.trim() === "") {
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
	} finally {
		reader.releaseLock();
	}
}
