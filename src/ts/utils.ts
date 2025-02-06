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

export function toSql(array: number[] | Float32Array) {
	return `[${array.join(",")}]`;
}
