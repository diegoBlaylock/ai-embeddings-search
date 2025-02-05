export interface IProducer<T> {
	gatherDocuments(): AsyncGenerator<T[], void, unknown>;
}
