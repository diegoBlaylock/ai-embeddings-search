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
