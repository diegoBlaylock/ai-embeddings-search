import { config } from "dotenv";
import { TalkScrapper } from "../services/data/scrapper/scrapper.js";
import { ClustererPool } from "../services/data/cluster/index.js";
import { OpenAiClient } from "../services/openai/client.js";
import { TalkCompiler } from "../services/data/embeddings.js";
import { withSql } from "../services/sql/client.js";
import { toSql } from "../utils.js";

// VARIABLES

const MODEL = "text-embedding-ada-002";
const DIMENSIONS = 1536;

const N_CLUSTERS = 6;
const N_CLST_WORKERS = 8;

const MIN_YEAR = 2000;
const BATCH_SIZE = 64;

// MAIN

async function main() {
	config();

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
	withSql(async (sql) => {
		await sql.executeScript("./src/sql/create-table.sql");

		let count = 0;
		for await (const documents of generator.gatherDocuments()) {
			const talkRows = documents.map((d) => [
				d.title,
				d.month,
				d.year,
				d.calling ?? null,
				d.subtitle ?? null,
				d.author,
				d.text,
			]);

			const { rows: ids } = await sql.insertMultiple(
				"vect.talk",
				"title, month, year, calling, subtitle, author, text",
				talkRows,
				"talk_id",
			);

			const embeddingsRow = documents.flatMap((d, di) =>
				d.embeddings
					.filter((row) => !row.includes(Number.NaN))
					.map((emb) => [ids[di].talk_id, toSql(emb)]),
			);

			await sql.insertMultiple(
				"vect.embedding",
				"talk_id, embedding",
				embeddingsRow,
			);

			count += documents.length;
			process.stdout.write(`\r${count}`);
		}
		console.log();
		console.log("FINISHED");
	}).finally(() => {
		clusterer.destroy();
	});
}

await main();
