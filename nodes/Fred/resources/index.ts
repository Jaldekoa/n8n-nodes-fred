import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { releaseOperations } from './release';

export type OperationHandler = (
	this: IExecuteFunctions,
	itemIndex: number,
) => Promise<IDataObject[]>;

/**
 * Registry of resource -> operation -> handler.
 *
 * To add a new FRED v2 endpoint:
 * 1. Create `resources/<resource>/<operation>.ts` exporting its UI description and handler.
 * 2. Add it to the resource's `index.ts` (operation option + handler map).
 * 3. For a new resource, register it here and add it to the Resource options in `Fred.node.ts`.
 */
export const operationHandlers: Record<string, Record<string, OperationHandler>> = {
	release: releaseOperations,
};
