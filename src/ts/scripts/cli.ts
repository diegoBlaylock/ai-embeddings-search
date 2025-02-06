import { config } from "dotenv";
import { OpenAiClient } from "../services/openai/client.js";
import { withSql } from "../services/sql/client.js";
import { createInterface } from "node:readline";
import { toSql, unpackPromise, semanticQuery as sQuery } from "../utils.js";
import { spawn } from "node:child_process";
import { formatWithOptions } from "node:util";
import type { Talk } from "../models.js";
import colors from "colors";

// VARIABLES

const CUTOFF = 0.1;
const LIMIT = 100;

// MAIN

async function main() {
	config();
	colors.enable();
	const input = createInterface({
		input: process.stdin,
		output: process.stdout,
	});
	const openAi = new OpenAiClient("text-embedding-ada-002");
	withSql(async (sql) => {
		let stop = false;

		while (!stop) {
			console.info(
				"\nSelect Option:\n" +
					"  1. Semantic Query\n" +
					"  2. Query Talk\n" +
					"  3. Exit",
			);

			const [optionAnswered, resolveOption] = unpackPromise<void>();

			input.question("> ", async (option) => {
				const [promise, resolve] = unpackPromise<void>();
				switch (option) {
					case "1": {
						await semanticQuery(resolve);
						break;
					}
					case "2": {
						await queryTalk(resolve);
						break;
					}
					case "3": {
						stop = true;
						console.log("# exiting...");
						resolve();
						break;
					}
					default:
						console.log("# Unknown option!");
						resolve();
				}

				await promise;
				resolveOption();
			});

			await optionAnswered;
		}

		input.close();

		async function semanticQuery(resolve: () => void) {
			input.question("> query? ", async (answer) => {
				try {
					const [embedding] = await openAi.getEmbeddings([answer]);

					const rows = await sQuery(sql, embedding, CUTOFF, LIMIT);

					await displayLess(formatWithOptions({ colors: true }, "%o", rows));
				} finally {
					resolve();
				}
			});
		}

		async function queryTalk(resolve: () => void) {
			input.question("> talk id? ", async (answer) => {
				try {
					const id = Number.parseInt(answer);

					const [[talk]] = await sql.query(
						"SELECT t.talk_id, t.title, t.subtitle, t.author, t.calling, t.month, t.year, t.text\n" +
							" FROM vect.talk t WHERE t.talk_id = $1;",
						id,
					);

					if (talk == null) {
						console.info("# No talk found!");
						return;
					}

					const formatted = formatTalk(id, talk as unknown as Talk);

					await displayLess(formatted);
				} finally {
					resolve();
				}
			});
		}
	});
}

async function displayLess(text: string): Promise<void> {
	const [processPromise, processResolve] = unpackPromise<void>();
	const less = spawn("less", ["-R", "-+S"], {
		stdio: ["pipe", 1, 2],
		shell: false,
		env: {
			...process.env,
			FORCE_COLOR: "1",
			CI: "1",
			NPM_CONFIG_COLOR: "always",
		},
	});
	process.stdin.pause();
	less.on("exit", () => {
		process.stdin.resume();
		processResolve();
	});

	less.stdin?.write(text);
	less.stdin?.end();

	return processPromise;
}

function formatTalk(id: number, talk: Talk): string {
	return `${colors.bold(colors.magenta(talk.title))} (${colors.yellow(id.toString())})
${talk.month} ${colors.yellow(talk.year.toString())}

By ${colors.yellow(talk.author)}
Called as ${colors.yellow(talk.calling ?? "N/A")}

${talk.subtitle ? `Summary: ${colors.cyan(talk.subtitle)}\n` : ""}
${colors.dim("=".repeat(100))}

${talk.text}`;
}

await main();
