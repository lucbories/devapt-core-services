// NPM IMPORTS
import {format} from 'util'

// COMMON IMPORTS
import T                  from 'devapt-core-common/dist/js/utils/types'
import ServiceProvider    from 'devapt-core-common/dist/js/services/service_provider'
import ServiceResponse    from 'devapt-core-common/dist/js/services/service_response'
import DistributedMessage from 'devapt-core-common/dist/js/base/distributed_message'

// SERVICES IMPORTS


/**
 * Contextual constant for this file logs.
 * @private
 */
const context = 'services/ping/ping_svc_provider'



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

		/**
		 * Class test flag.
		 * @type {boolean}
		 */
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
		this.enter_group('produce')

		if ( ! T.isObject(arg_request) || ! arg_request.is_service_request)
		{
			this.leave_group('produce:bad request object')

			return Promise.resolve({error:'bad request object'})
		}

		const operation = arg_request.get_operation()
		const operands  = arg_request.get_operands()
		const target    = operands.length > 0 && T.isNotEmptyString(operands[0]) ? operands[0] : undefined

		// DEBUG
		this.debug('produce:request for service=' + this.service.get_name() + ':operation=' + operation)
		// console.log(context + ':produce:request for service=' + this.service.get_name() + ':operation=' + operation)

		if (operation == 'devapt-ping')
		{
			// DEBUG
			this.debug('produce:process for service=' + this.service.get_name() + ':operation=' + operation)
			// console.log(context + ':produce:process for service=' + this.service.get_name() + ':operation=' + operation)

			if (! target/* || target == this.get_runtime().node.get_name()*/)
			{
				// DEBUG
				this.debug('produce:reply for service=' + this.service.get_name() + ':operation=' + operation, response.get_properties_values())
				// console.log(context + ':produce:reply for service=' + this.service.get_name() + ':operation=' + operation, response.get_properties_values())
				
				const response  = new ServiceResponse(arg_request)
				response.set_results(['devapt-pong'])

				this.leave_group('produce:locally resolved')
				return Promise.resolve(response)
			}
			
			const work = (resolve/*, reject*/)=>{
				const response  = new ServiceResponse(arg_request)

				// DEBUG
				this.enter_group('produce:forward request for service=' + this.service.get_name() + ':operation=' + operation, response.get_properties_values())
				// console.log(context + ':produce:forward request for service=' + this.service.get_name() + ':operation=' + operation, response.get_properties_values())
				
				const plain_object_payload = arg_request.get_properties_values()
				plain_object_payload.socket_id = arg_request.get_socket().id
				
				const msg = new DistributedMessage(arg_request.get_session_uid(), target, plain_object_payload)
				const bool_result = this.get_runtime().node.get_msg_bus().msg_post(msg)
				
				if (! bool_result)
				{
					this.fill_error(response, operands, 'message forward failure', target)
					resolve(response)
				}
			}
			
			this.leave_group('produce:forward request')
			return new Promise(work)
		}

		this.leave_group('produce:super.')
		return super.produce(arg_request)
	}



	/**
	 * Populate a response with error message.
	 * 
	 * @param {ServiceResponse} arg_response - response instance.
	 * @param {array} arg_operands     - request operands.
	 * @param {string} arg_error       - error text.
	 * @param {string} arg_target      - target name.
	 * 
	 * @returns {nothing}
	 */
	fill_error(arg_response, arg_operands, arg_error, arg_target='N/A')
	{
		const op = arg_response.get_operation()
		const svc = arg_response.get_service()
		const error_msg = format('produce:error=[%s] with svc=[%s] operation=[%s] target=[%s].', arg_error, svc, op, arg_target)
		
		arg_response.set_has_error(true)
		arg_response.set_error(error_msg)
		arg_response.set_results(arg_operands)
		
		this.leave_group(error_msg)
	}
}
