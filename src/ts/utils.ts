export function unpackPromise<T>(): [
	Promise<T>,
	(val: T) => void,
	(err: unknown) => void,
] {
	let resolve!: (val: T) => void;
	let reject!: (err: unknown) => void;

	const promise = new Promise<T>((rs, rj) => {
		resolve = rs;
		reject = rj;
	});

	return [promise, resolve, reject];
}

export class MutByteBuffer {
	#chunks: Buffer[] = [];
	#size = 0;

	addChunk(chunk: Buffer) {
		this.#chunks.push(chunk);
		this.#size += chunk.byteLength;
	}

	get size() {
		return this.#size;
	}

	get realSize() {
		return Buffer.concat(this.#chunks).byteLength;
	}

	clear() {
		this.#chunks.splice(0);
		this.#size = 0;
	}

	get(length = -1) {
		if (length < 0 || length >= this.size) {
			this.#size = 0;
			return Buffer.concat(this.#chunks.splice(0));
		}

		const chunksToConcate = [];
		let chunksSize = 0;

		while (chunksSize < length) {
			const [nextChunk] = this.#chunks.splice(0, 1);
			this.#size -= nextChunk.byteLength;
			if (chunksSize + nextChunk.byteLength > length) {
				const remainder = length - chunksSize;
				chunksSize += remainder;
				chunksToConcate.push(nextChunk.subarray(0, remainder));
				this.#chunks.splice(0, 0, nextChunk.subarray(remainder));
				this.#size += nextChunk.byteLength - remainder;
			} else {
				chunksToConcate.push(nextChunk);
				chunksSize += nextChunk.byteLength;
			}
		}

		return Buffer.concat(chunksToConcate);
	}
}

export class MutStrBuffer {
	#chunks: string[] = [];
	#size = 0;

	addChunk(chunk: string) {
		this.#chunks.push(chunk);
		this.#size += chunk.length;

		if (this.#chunks.length > 1000) {
			const firstChunks = this.#chunks.splice(0, 1000);
			this.#chunks.splice(0, 0, firstChunks.join(""));
		}
	}

	get size() {
		return this.#size;
	}

	clear() {
		this.#chunks.splice(0);
		this.#size = 0;
	}

	peek(length = -1) {
		const nextChunk = this.get(length);
		this.#chunks.splice(0, 0, nextChunk);
		this.#size += nextChunk.length;
		return nextChunk;
	}

	get(length = -1) {
		if (length < 0 || length >= this.size) {
			const value = this.#chunks.join("");
			this.clear();
			return value;
		}

		const chunksToConcate = [];
		let chunksSize = 0;

		while (chunksSize < length) {
			const [nextChunk] = this.#chunks.splice(0, 1);
			this.#size -= nextChunk.length;
			if (chunksSize + nextChunk.length > length) {
				const remainder = length - chunksSize;
				chunksSize += remainder;
				chunksToConcate.push(nextChunk.slice(0, remainder));
				this.#chunks.splice(0, 0, nextChunk.slice(remainder));
				this.#size += nextChunk.length - remainder;
			} else {
				chunksToConcate.push(nextChunk);
				chunksSize += nextChunk.length;
			}
		}

		return chunksToConcate.join("");
	}
}
