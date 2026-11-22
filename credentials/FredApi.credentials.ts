import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class FredApi implements ICredentialType {
	name = 'fredApi';

	displayName = 'FRED API';

	icon: Icon = 'file:../icons/fred.svg';

	documentationUrl = 'https://fred.stlouisfed.org/docs/api/fred/v2/api_key.html';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Your FRED API key. Request one at https://fredaccount.stlouisfed.org/apikeys.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.stlouisfed.org',
			url: '/fred/v2/release/observations',
			method: 'GET',
			qs: {
				release_id: 53,
				limit: 1,
			},
		},
	};
}
