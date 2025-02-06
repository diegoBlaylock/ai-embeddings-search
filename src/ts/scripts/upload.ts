import { config } from "dotenv";
import { TalkScrapper } from "../services/data/scrapper/scrapper.js";
import { ClustererPool } from "../services/data/cluster/index.js";
import { OpenAiClient } from "../services/openai/client.js";
import { TalkCompiler } from "../services/data/embeddings.js";
import { withSql } from "../services/sql/client.js";

async function main() {
	config();

	const openAi = new OpenAiClient("text-embedding-ada-002");
	const clusterer = new ClustererPool(6, { dimensions: 1536, nClusters: 8 });
	const scrapper = new TalkScrapper({
		lowerYearBound: 2000,
		maxBatchSize: 64,
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
					.map((emb) => [ids[di].talk_id, `[${emb.join(",")}]`]),
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
