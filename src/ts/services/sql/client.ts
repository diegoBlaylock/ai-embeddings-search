import { readFile } from "node:fs/promises";
import pg from "pg";
import format from "pg-format";

export async function withSql<T = void>(
	fn: (sql: SqlClient) => Promise<T> | T,
) {
	const _client = new pg.Client({
		connectionString: process.env.PG_CONNECTION_STRING,
	});
	await _client.connect();

	const client = new SqlClient(_client);

	try {
		return await fn(client);
	} finally {
		await client.destroy();
	}
}

export type { SqlClient };
class SqlClient {
	#client: pg.Client;
	constructor(client: pg.Client) {
		this.#client = client;
	}

	async query(string: string) {
		return this.#format(await this.#client.query(string));
	}

	async insertMultiple(
		table: string,
		columns: string,
		values: unknown[][],
		returns?: string,
	) {
		return await this.#client.query(
			format(
				`INSERT INTO ${table}(${columns}) VALUES %L ${returns != null ? `RETURNING ${returns}` : ""};`,
				values,
			),
		);
	}

	async executeScript(path: string) {
		const script = await readFile(path, { encoding: "utf-8" });
		return await this.query(script);
	}

	destroy() {
		return this.#client.end();
	}

	#format<T extends pg.QueryResultRow>(
		result: pg.QueryResult<T> | pg.QueryResult<T>[],
	) {
		return Array.isArray(result) ? result : [result];
	}
}
