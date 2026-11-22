import {
	NodeApiError,
	sleep,
	type IDataObject,
	type IExecuteFunctions,
	type IHttpRequestMethods,
	type IHttpRequestOptions,
	type JsonObject,
} from 'n8n-workflow';

export const FRED_BASE_URL = 'https://api.stlouisfed.org';

/** FRED allows up to 2 requests per second; stay safely below it. */
export const MIN_REQUEST_INTERVAL_MS = 550;

const MAX_RETRIES_ON_429 = 3;

function getStatusCode(error: JsonObject): number | undefined {
	const status =
		(error.httpCode as string | number | undefined) ??
		((error.response as JsonObject | undefined)?.status as number | undefined) ??
		(error.statusCode as number | undefined);
	return status === undefined ? undefined : Number(status);
}

/**
 * Performs an authenticated request against the FRED API (v2 endpoints live under `/fred/v2`).
 * Retries automatically on HTTP 429 (rate limit) with exponential backoff.
 */
export async function fredApiRequest(
	this: IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	qs: IDataObject = {},
	itemIndex = 0,
): Promise<IDataObject> {
	const options: IHttpRequestOptions = {
		method,
		url: `${FRED_BASE_URL}${endpoint}`,
		qs: { ...qs, format: 'json' },
		headers: { Accept: 'application/json' },
		json: true,
	};

	for (let attempt = 0; ; attempt++) {
		try {
			return (await this.helpers.httpRequestWithAuthentication.call(
				this,
				'fredApi',
				options,
			)) as IDataObject;
		} catch (error) {
			if (getStatusCode(error as JsonObject) === 429 && attempt < MAX_RETRIES_ON_429) {
				await sleep(1000 * 2 ** attempt);
				continue;
			}
			throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex });
		}
	}
}
