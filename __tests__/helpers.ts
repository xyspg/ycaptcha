/**
 * Proxy-based Drizzle chain mock.
 * `chainResult(data)` returns a proxy that makes any chained Drizzle call
 * (select, from, where, innerJoin, orderBy, limit, set, values, returning, etc.)
 * eventually resolve to `data` when awaited.
 */
export function chainResult<T>(data: T) {
	const handler: ProxyHandler<object> = {
		get(_target, prop) {
			// Make the proxy thenable so `await db.select()...` resolves to data
			if (prop === "then") {
				return (resolve: (v: T) => void) => resolve(data);
			}
			// Any method call returns the proxy itself to support chaining
			return () => new Proxy({}, handler);
		},
	};
	return new Proxy({}, handler);
}

/**
 * Create a POST Request with JSON body, suitable for passing to route handlers.
 */
export function makePostRequest(
	body: Record<string, unknown>,
	options?: { headers?: Record<string, string> },
): Request {
	return new Request("http://localhost:3000/api/test", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...options?.headers,
		},
		body: JSON.stringify(body),
	});
}
