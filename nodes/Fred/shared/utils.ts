import type { IDataObject } from 'n8n-workflow';

/**
 * FRED encodes missing observations as ".". Converts values to numbers, using `null` for missing ones.
 */
export function parseObservationValue(value: unknown): number | string | null {
	if (value === null || value === undefined || value === '.' || value === '') return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : (value as string);
}

export function convertObservations(observations: IDataObject[], toNumber: boolean): IDataObject[] {
	if (!toNumber) return observations;
	return observations.map((observation) => ({
		...observation,
		value: parseObservationValue(observation.value),
	}));
}
