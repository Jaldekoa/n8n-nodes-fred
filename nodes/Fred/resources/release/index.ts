import type { INodeProperties } from 'n8n-workflow';
import { releaseGetObservations, releaseGetObservationsDescription } from './getObservations';

export const releaseOperations = {
	getObservations: releaseGetObservations,
};

export const releaseDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['release'] } },
		options: [
			{
				name: 'Get Observations',
				value: 'getObservations',
				action: 'Get observations for all series on a release',
				description:
					'Get the observations for all series on a release of economic data (fred/v2/release/observations)',
			},
		],
		default: 'getObservations',
	},
	...releaseGetObservationsDescription,
];
