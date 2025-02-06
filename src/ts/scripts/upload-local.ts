import { config } from "dotenv";
import { createReadStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { createInterface, type Interface } from "node:readline";
import { withSql } from "../services/sql/client.js";
import { toSql, unpackPromise } from "../utils.js";

// VARIABLES

const BATCH_SIZE = 128;

// MAIN

async function main() {
	config();

	await mkdir("./data", { recursive: true });

	await withSql(async (sql) => {
		const [finishedReading, resolve] = unpackPromise<void>();
		let reader: Interface;

		try {
			// console.log(readStream.read(100).toString());

			await sql
				.executeScript("./src/sql/create-table.sql")
				.catch(console.error);

			const lines: string[] = [];

			reader = createInterface({
				input: createReadStream("./data/talks.jsonl", { encoding: "utf-8" }),
			});
			reader.on("close", () => resolve());
			reader.on("line", (line) => {
				// console.log(lines.length);
				lines.push(line);
			});

			await finishedReading;

			let count = 0;
			while (lines.length > 0) {
				const batch = lines.splice(0, BATCH_SIZE);

				try {
					const objects = batch.map((line) => JSON.parse(line));

					const talkRows = objects.map((obj) => [
						obj.title,
						obj.month,
						obj.year,
						obj.calling ?? null,
						obj.subtitle ?? null,
						obj.author,
						obj.text,
					]);

					const { rows: ids } = await sql.insertMultiple(
						"vect.talk",
						"title, month, year, calling, subtitle, author, text",
						talkRows,
						"talk_id",
					);

					const embeddingsRows = objects.flatMap((d, di) =>
						(d.embeddings as string)
							.split(".")
							.map(
								(e: string) =>
									new Float32Array(Buffer.from(e, "base64").buffer),
							)
							.filter((row) => !row.includes(Number.NaN))
							.map((emb) => [ids[di].talk_id, toSql(emb)]),
					);

					if (embeddingsRows.length > 0) {
						await sql.insertMultiple(
							"vect.embedding",
							"talk_id, embedding",
							embeddingsRows,
						);
					}

					count += batch.length;
					process.stdout.write(`\r${count}`);
				} finally {
					reader?.close();
					resolve();
				}
			}

			console.log();

			console.log("FINISHED");
		} finally {
			resolve();
		}
	});
}

await main();
