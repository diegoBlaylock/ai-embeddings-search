import { type ChildProcess, spawn } from "node:child_process";
import type { ClusterOpts } from "./types.js";
import { MutByteBuffer, unpackPromise } from "../../../utils.js";
import { Mutex } from "async-mutex";

export interface IClusterer {
	generateClusters(vectors: Float32Array[]): Promise<Float32Array[]>;
	destroy(): void;
}

export class ClustererPool implements IClusterer {
	#clusterers: Clusterer[];
	constructor(numWorkers: number, opts: ClusterOpts) {
		this.#clusterers = new Array(numWorkers)
			.fill(null)
			.map(() => new Clusterer(opts));
	}

	generateClusters(vectors: Float32Array[]): Promise<Float32Array[]> {
		return this.#clusterer.generateClusters(vectors);
	}

	destroy(): void {
		for (const c of this.#clusterers) {
			c.destroy();
		}
	}

	get #clusterer() {
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		return this.#clusterers.at(
			Math.trunc(Math.random() * this.#clusterers.length),
		)!;
	}
}

export class Clusterer implements IClusterer {
	count = 0;

	#process: ChildProcess;
	#dimensions: number;
	#nClusters: number;

	#mutex = new Mutex();
	#buffMutex = new Mutex();

	#resolves: ((clusters: Float32Array[]) => void)[] = [];
	#rejects: ((err: unknown) => void)[] = [];

	#stdErrPromiseAndHandles = unpackPromise<string>();
	#stdErrLog = new MutByteBuffer();
	#stdOutLog = new MutByteBuffer();

	constructor(opts: ClusterOpts) {
		this.#dimensions = opts.dimensions;
		this.#nClusters = opts.nClusters;
		this.#process = spawn(
			"python",
			[
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
		this.#process.stdout?.on("error", console.dir);
		this.#process.stderr?.on("data", (data) => this.#handleStdErr(data));
		this.#process.stderr?.on("error", console.dir);
		this.#process.stderr?.on("end", () =>
			this.#stdErrPromiseAndHandles[1](this.#stdErrLog.get().toString()),
		);

		// setTimeout(() => {
		// 	this.#tryResolve();
		// }, 10);
	}

	generateClusters(vectors: Float32Array[]): Promise<Float32Array[]> {
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

		const [promise, resolve, reject] = unpackPromise<Float32Array[]>();

		this.#mutex.runExclusive(() => {
			this.#resolves.push(resolve);
			this.#rejects.push(reject);
			this.#process.stdin?.write(writeBuffer);
			this.#process.stdin?.cork();
			this.#process.stdin?.uncork();
		});
		return promise;
	}

	async destroy() {
		this.#process.kill(9); // No reason for graceful termination
	}

	#handleData(data: Buffer) {
		this.#stdOutLog.addChunk(data);
		while (this.#tryResolve());
	}

	#tryResolve() {
		const outputSize = 4 * this.#dimensions * this.#nClusters;

		if (this.#stdOutLog.size >= outputSize) {
			const acc = new Array(this.#nClusters).fill(null).map(() => {
				const buffer = this.#stdOutLog.get(4 * this.#dimensions);
				return new Float32Array(
					buffer.buffer,
					buffer.byteOffset,
					buffer.byteLength / Float32Array.BYTES_PER_ELEMENT,
				);
			});

			this.#mutex.runExclusive(() => {
				const resolve = this.#resolves.shift();
				this.#rejects.shift();
				resolve?.(acc);
			});

			return true;
		}
		return false;
	}

	#handleStdErr(data: Buffer) {
		this.#stdErrLog.addChunk(data);
		// console.error(data.toString());
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
		this.#stdErrPromiseAndHandles[0];
	}
}
