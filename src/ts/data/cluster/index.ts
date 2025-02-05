import { type ChildProcess, spawn } from "node:child_process";
import type { ClusterOpts } from "./types.js";
import { unpackPromise } from "../../utils.js";

export class Clusterer {
	#process: ChildProcess;
	#dimensions: number;
	#nClusters: number;

	#resolves: ((clusters: Float32Array[]) => void)[] = [];
	#rejects: ((err: unknown) => void)[] = [];

	#stdErrPromiseAndHandles = unpackPromise<string>();
	#stdErrLog = new MutBuffer();
	#stdOutLog = new MutBuffer();

	constructor(opts: ClusterOpts) {
		this.#dimensions = opts.dimensions;
		this.#nClusters = opts.nClusters;
		this.#process = spawn(
			"python",
			[
				"-u",
				"./src/py/cluster.py",
				this.#dimensions.toString(),
				this.#nClusters.toString(),
			],
			{
				env: { ...process.env, PYKEOPS_VERBOSE: "0" },
				stdio: ["pipe", "pipe", "pipe"],
			},
		);

		this.#process.on("exit", (a, b) => this.#handleclose(a, b));
		this.#process.stdout?.on("data", (data) => this.#handleData(data));
		this.#process.stderr?.on("data", (data) => this.#handleStdErr(data));
		this.#process.stderr?.on("end", () =>
			this.#stdErrPromiseAndHandles[1](this.#stdErrLog.get().toString()),
		);
	}

	async generateClusters(vectors: Float32Array[]): Promise<Float32Array[]> {
		const [promise, resolve, reject] = unpackPromise<Float32Array[]>();
		this.#resolves.push(resolve);
		this.#rejects.push(reject);

		const writeBuffer = Buffer.allocUnsafe(
			4 + this.#dimensions * Float32Array.BYTES_PER_ELEMENT * vectors.length,
		);

		let offset = 0;

		writeBuffer.writeUInt32BE(vectors.length, offset);
		offset += 4;

		for (const vector of vectors) {
			for (const a of vector) {
				writeBuffer.writeFloatLE(a, offset);
				offset += 4;
			}
		}

		this.#process.stdin?.write(writeBuffer);
		this.#process.stdin?.cork();
		this.#process.stdin?.uncork();
		return await promise;
	}

	async destroy() {
		this.#process.kill(9); // No reason for graceful termination
	}

	#handleData(data: Buffer) {
		this.#stdOutLog.addChunk(data);
		this.#tryResolve();
	}

	#tryResolve() {
		const outputSize = 4 * this.#dimensions * this.#nClusters;
		if (this.#stdOutLog.size >= outputSize) {
			const acc: Float32Array[] = new Array(this.#nClusters)
				.fill(null)
				.map(() => {
					const buffer = this.#stdOutLog.get(4 * this.#dimensions);
					return new Float32Array(
						buffer.buffer,
						buffer.byteOffset,
						buffer.byteLength / Float32Array.BYTES_PER_ELEMENT,
					);
				});
			this.#resolves.splice(0, 1)[0](acc);
			this.#rejects.splice(0, 1);
		}
	}

	#handleStdErr(data: Buffer) {
		this.#stdErrLog.addChunk(data);
	}

	#handleclose(code: number | null, signal: NodeJS.Signals | null) {
		for (const reject of this.#rejects)
			this.#stdErrPromiseAndHandles[0].then((log) =>
				reject({
					code: code ?? undefined,
					signal: signal ?? undefined,
					stderr: log,
				}),
			);
		this.#resolves.splice(0);
		this.#rejects.splice(0);
	}
}

class MutBuffer {
	#chunks: Buffer[] = [];
	#size = 0;

	addChunk(chunk: Buffer) {
		this.#chunks.push(chunk);
		this.#size += chunk.byteLength;
	}

	get size() {
		return this.#size;
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
