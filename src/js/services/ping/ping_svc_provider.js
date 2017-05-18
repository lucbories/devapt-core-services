// NPM IMPORTS
// import assert from 'assert'

// COMMON IMPORTS
import T               from 'devapt-core-common/dist/js/utils/types'
import ServiceProvider from 'devapt-core-common/dist/js/services/service_provider'
import ServiceResponse from 'devapt-core-common/dist/js/services/service_response'

// SERVICES IMPORTS


let context = 'services/ping/ping_svc_provider'



/**
 * Ping service provider class.
 * @author Luc BORIES
 * @license Apache-2.0
 */
export default class PingSvcProvider extends ServiceProvider
{
	/**
	 * Create a ping service provider.
	 * 
	 * @param {string} arg_provider_name - consumer name.
	 * @param {Service} arg_service_instance - service instance.
	 * @param {string} arg_context - logging context label.
	 * 
	 * @returns {nothing}
	 */
	constructor(arg_provider_name, arg_service_instance, arg_context=context)
	{
		super(arg_provider_name, arg_service_instance, arg_context)

		this.is_ping_svc_provider = true
	}



	/**
	 * Get provider operations names.
	 * @abstract
	 * 
	 * @returns {array}
	 */
	get_operations_names()
	{
		return ['devapt-ping'].concat(super.get_operations_names())
	}


	
	/**
	 * Produce service datas on request.
	 * 
	 * @param {ServiceRequest} arg_request - service request instance.
	 * 
	 * @returns {Promise} - promise of ServiceResponse instance.
	 */
	produce(arg_request)
	{
		if ( ! T.isObject(arg_request) || ! arg_request.is_service_request)
		{
			return Promise.resolve({error:'bad request object'})
		}

		const operation = arg_request.get_operation()

		// console.log(context + ':produce:request for service=' + this.service.get_name() + ':operation=' + operation)

		if (operation == 'devapt-ping')
		{
			const response = new ServiceResponse(arg_request)
			response.set_results(['devapt-pong'])

			// console.log(context + ':produce:reply for service=' + this.service.get_name() + ':operation=' + operation, response.get_properties_values())

			return Promise.resolve(response)
		}

		this.leave_group('produce:super.')
		return super.produce(arg_request)
	}
}
