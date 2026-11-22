import {
	NodeOperationError,
	sleep,
	type IDataObject,
	type IExecuteFunctions,
	type INodeProperties,
} from 'n8n-workflow';
import { fredApiRequest, MIN_REQUEST_INTERVAL_MS } from '../../shared/transport';
import { convertObservations } from '../../shared/utils';

const showOnlyForReleaseGetObservations = {
	resource: ['release'],
	operation: ['getObservations'],
};

/** Maximum number of observations the API returns per request. */
const MAX_LIMIT = 500000;

export const releaseGetObservationsDescription: INodeProperties[] = [
	{
		displayName: 'Release ID',
		name: 'releaseId',
		type: 'number',
		required: true,
		default: 0,
		typeOptions: { minValue: 1 },
		placeholder: 'e.g. 53',
		description:
			'The ID of the release (e.g. 53 = Gross Domestic Product, 52 = Z.1 Financial Accounts). Find it in the release URL on <a href="https://fred.stlouisfed.org/releases">fred.stlouisfed.org/releases</a>.',
		displayOptions: { show: showOnlyForReleaseGetObservations },
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		hint: 'Follows the pagination cursor until the whole release is retrieved. Large releases can contain millions of observations.',
		displayOptions: { show: showOnlyForReleaseGetObservations },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: { minValue: 1, maxValue: MAX_LIMIT },
		description: 'Max number of results to return',
		hint: 'Counts observations (data points), not series',
		displayOptions: { show: { ...showOnlyForReleaseGetObservations, returnAll: [false] } },
	},
	{
		displayName: 'Output',
		name: 'output',
		type: 'options',
		default: 'series',
		options: [
			{
				name: 'One Item per Series',
				value: 'series',
				description: 'Each item is a series with its metadata and an array of observations',
			},
			{
				name: 'One Item per Observation',
				value: 'observations',
				description: 'Each item is a single observation, flattened with its series metadata',
			},
			{
				name: 'Raw Response',
				value: 'raw',
				description:
					'Each item is the unmodified API response for one page (includes has_more and next_cursor)',
			},
		],
		displayOptions: { show: showOnlyForReleaseGetObservations },
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: showOnlyForReleaseGetObservations },
		options: [
			{
				displayName: 'Convert Values to Numbers',
				name: 'convertValues',
				type: 'boolean',
				default: true,
				description:
					'Whether to convert observation values to numbers. Missing values (".") become null. Not applied to raw output.',
			},
			{
				displayName: 'Include Series Notes',
				name: 'includeNotes',
				type: 'boolean',
				default: true,
				description:
					'Whether to include the (often long) notes field of each series. Not applied to raw output.',
			},
			{
				displayName: 'Next Cursor',
				name: 'nextCursor',
				type: 'string',
				default: '',
				placeholder: 'e.g. BOGZ1FA106000125A,2010-01-01',
				description:
					'Cursor returned by a previous request (next_cursor) to continue from that point. Leave empty to start from the beginning.',
			},
		],
	},
];

interface ReleaseObservationsResponse extends IDataObject {
	has_more?: boolean | string;
	next_cursor?: string;
	release?: IDataObject;
	series?: IDataObject[];
}

function hasMore(response: ReleaseObservationsResponse): boolean {
	return (response.has_more === true || response.has_more === 'true') && !!response.next_cursor;
}

export async function releaseGetObservations(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject[]> {
	const releaseId = this.getNodeParameter('releaseId', itemIndex) as number;
	const returnAll = this.getNodeParameter('returnAll', itemIndex) as boolean;
	const output = this.getNodeParameter('output', itemIndex) as 'series' | 'observations' | 'raw';
	const options = this.getNodeParameter('options', itemIndex, {}) as {
		convertValues?: boolean;
		includeNotes?: boolean;
		nextCursor?: string;
	};
	const convertValues = options.convertValues ?? true;
	const includeNotes = options.includeNotes ?? true;

	if (!Number.isInteger(releaseId) || releaseId < 1) {
		throw new NodeOperationError(this.getNode(), 'Release ID must be a positive integer', {
			itemIndex,
		});
	}

	const limit = returnAll ? MAX_LIMIT : (this.getNodeParameter('limit', itemIndex) as number);

	// Fetch page(s), following next_cursor when returning all.
	const pages: ReleaseObservationsResponse[] = [];
	let cursor = options.nextCursor?.trim() || undefined;
	do {
		if (pages.length > 0) await sleep(MIN_REQUEST_INTERVAL_MS);
		const qs: IDataObject = { release_id: releaseId, limit };
		if (cursor) qs.next_cursor = cursor;
		const page = (await fredApiRequest.call(
			this,
			'GET',
			'/fred/v2/release/observations',
			qs,
			itemIndex,
		)) as ReleaseObservationsResponse;
		pages.push(page);
		cursor = hasMore(page) ? page.next_cursor : undefined;
	} while (returnAll && cursor);

	if (output === 'raw') return pages;

	// Merge series across pages: a series may be split between two consecutive pages.
	const release = pages[0]?.release ?? {};
	const seriesList: IDataObject[] = [];
	const seriesById = new Map<string, IDataObject>();
	for (const page of pages) {
		for (const series of page.series ?? []) {
			const id = series.series_id as string;
			const observations = convertObservations(
				(series.observations as IDataObject[] | undefined) ?? [],
				convertValues,
			);
			const existing = seriesById.get(id);
			if (existing) {
				(existing.observations as IDataObject[]).push(...observations);
				continue;
			}
			const metadata: IDataObject = { ...series };
			delete metadata.observations;
			if (!includeNotes) delete metadata.notes;
			const merged: IDataObject = {
				release_id: release.release_id ?? releaseId,
				release_name: release.name,
				...metadata,
				observations,
			};
			seriesById.set(id, merged);
			seriesList.push(merged);
		}
	}

	if (output === 'series') return seriesList;

	return seriesList.flatMap((series) => {
		const metadata: IDataObject = { ...series };
		delete metadata.observations;
		return (series.observations as IDataObject[]).map((observation) => ({
			...metadata,
			...observation,
		}));
	});
}
