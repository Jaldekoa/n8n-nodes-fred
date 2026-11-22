import {
	NodeApiError,
	NodeConnectionTypes,
	NodeOperationError,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';
import { operationHandlers } from './resources';
import { releaseDescription } from './resources/release';

export class Fred implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'FRED',
		name: 'fred',
		icon: 'file:../../icons/fred.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Retrieve economic data from FRED® (Federal Reserve Economic Data) API v2',
		defaults: {
			name: 'FRED',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'fredApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Release',
						value: 'release',
					},
				],
				default: 'release',
			},
			...releaseDescription,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const resource = this.getNodeParameter('resource', itemIndex) as string;
				const operation = this.getNodeParameter('operation', itemIndex) as string;
				const handler = operationHandlers[resource]?.[operation];
				if (!handler) {
					throw new NodeOperationError(
						this.getNode(),
						`The operation "${operation}" is not supported for resource "${resource}"`,
						{ itemIndex },
					);
				}

				const results = await handler.call(this, itemIndex);
				for (const json of results) {
					returnData.push({ json, pairedItem: { item: itemIndex } });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: itemIndex },
					});
					continue;
				}
				// Keep API errors intact (HTTP code, description); wrap anything else.
				const nodeError =
					error instanceof NodeApiError
						? error
						: new NodeOperationError(this.getNode(), error as Error, { itemIndex });
				throw nodeError;
			}
		}

		return [returnData];
	}
}
