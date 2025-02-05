export function cleanSql(sql: string) {
	return sql
		.replaceAll(/(\/\*([^*]|\*[^\\] |\s)*\*\/)|(\-\-.*$)/gm, "")
		.replaceAll(/(\r?\n)+/g, "\n")
		.trim();
}
