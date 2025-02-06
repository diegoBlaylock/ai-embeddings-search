import { config } from "dotenv";
import { TalkScrapper } from "../services/data/scrapper/scrapper.js";
import { ClustererPool } from "../services/data/cluster/index.js";
import { OpenAiClient } from "../services/openai/client.js";
import { TalkCompiler } from "../services/data/embeddings.js";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";

// VARIABLES

const MODEL = "text-embedding-ada-002";
const DIMENSIONS = 1536;

const N_CLUSTERS = 6;
const N_CLST_WORKERS = 6;

const MIN_YEAR = 2012;
const BATCH_SIZE = 64;

// MAIN

async function main() {
	config();

	await mkdir("./data", { recursive: true });
	const writeStream = createWriteStream("./data/talks.jsonl", {
		encoding: "utf-8",
	});

	const openAi = new OpenAiClient(MODEL);
	const clusterer = new ClustererPool(N_CLST_WORKERS, {
		dimensions: DIMENSIONS,
		nClusters: N_CLUSTERS,
	});
	const scrapper = new TalkScrapper({
		lowerYearBound: MIN_YEAR,
		maxBatchSize: BATCH_SIZE,
	});
	const generator = new TalkCompiler(scrapper, openAi, clusterer);

	try {
		let count = 0;

		for await (const documents of generator.gatherDocuments()) {
			writeStream.cork();
			for (const doc of documents) {
				const {
					title,
					subtitle = null,
					author,
					calling = null,
					month,
					year,
					text,
					embeddings,
				} = doc;
				const encoded = embeddings
					.map((emb) => Buffer.from(emb.buffer).toString("base64"))
					.join(".");

				const serialized = {
					title,
					subtitle,
					calling,
					author,
					month,
					year,
					text,
					embeddings: encoded,
				};

				writeStream.write(`${JSON.stringify(serialized, undefined, 0)}\n`);
			}

			writeStream.uncork();

			count += documents.length;
			process.stdout.write(`\r${count}`);
		}
		console.log();
		console.log("FINISHED");
	} finally {
		writeStream.end();
		clusterer.destroy();
	}
}

await main();
