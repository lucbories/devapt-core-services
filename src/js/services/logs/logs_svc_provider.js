// NPM IMPORTS
// import assert from 'assert'

// COMMON IMPORTS
import T               from 'devapt-core-common/dist/js/utils/types'
import ServiceProvider from 'devapt-core-common/dist/js/services/service_provider'
import ServiceResponse from 'devapt-core-common/dist/js/services/service_response'

// SERVICES IMPORTS


const context = 'services/logs/logs_svc_provider'



/**
 * Logs service provider class.
 * @author Luc BORIES
 * @license Apache-2.0
 */
export default class LogsSvcProvider extends ServiceProvider
{
	/**
	 * Create a assets service provider.
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

		this.is_logs_svc_provider = true
		
		// GET INPUT STREAM TO FORWARD TO SUBSCRIBERS
		this.logs_bus_stream = this.get_runtime().node.get_logs_bus().get_input_stream()
		this.init_logs_bus_stream()

		// DEBUG
		// this.logs_bus_stream.subscribe(
		// 	(logs_record) => {
		// 		console.log('LogsSvcProvider: new logs record on the bus', logs_record)
		// 		this.provided_values_stream.push(logs_record)
		// 	}
		// )
	}



	/**
	 * Get provider operations names.
	 * @abstract
	 * 
	 * @returns {array}
	 */
	get_operations_names()
	{
		return ['devapt-log'].concat(super.get_operations_names())
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
		const operation = arg_request.get_operation()
		// const operands = arg_request.get_operands()

		// // CHECK OPERANDS
		// if ( ! T.isNotEmptyArray(operands) )
		// {
		// 	return Promise.resolve(undefined)
		// }

		const response = new ServiceResponse(arg_request)

		// SUBSCRIBE TO PROVIDER STREAM DATAS
		if (operation == 'devapt-log')
		{
			// TODO
			response.set_results([ { error:'...' } ])
			return Promise.resolve(response)
		}

		return super.produce(arg_request)
	}
	
	
	
	init_logs_bus_stream()
	{
		const max_logs_per_msg = 10
		const delay_per_logs_msg = 100
		const self = this
		const limit_cb = (grouped_stream/*, group_start_event*/) => {
			const map_cb = (values) => {
				// console.log(values, 'limit.map.values')
				
				let logs_record = {
					ts:undefined,
					level: undefined,
					source:undefined,
					logs:[]
				}
				
				values.forEach(
					(value) => {
						logs_record.ts = value.ts,
						logs_record.level = value.level,
						logs_record.source = value.source,
						logs_record.logs = logs_record.logs.concat(value.logs)
					}
				)
				
				// console.log(logs_record, 'limit.map.logs_record')
				return logs_record
			}
			
			return grouped_stream.bufferWithTimeOrCount(delay_per_logs_msg, max_logs_per_msg).map(map_cb)
		}
		
		
		const key_cb = (value) => {
			// console.log(value.level, 'value.level')
			return value.level
		}
		
		
		const flatmap_cb = (grouped_stream) => {
			return grouped_stream
		}
		
		const msg_cb = (arg_msg) => {
			let logs_ts = undefined
			let logs_level = undefined
			let logs_source = undefined
			let logs_array = undefined
			
			// DEBUG
			// debugger

			if ( T.isObject(arg_msg) && arg_msg.is_distributed_logs )
			{
				logs_ts = arg_msg.get_logs_ts()
				logs_level = arg_msg.get_logs_level()
				logs_source = arg_msg.get_logs_source()
				logs_array = arg_msg.get_logs_values()
			}
			else if ( T.isObject(arg_msg) && T.isString(arg_msg.level) && T.isArray(arg_msg.logs) )
			{
				logs_ts = arg_msg.ts
				logs_level = arg_msg.level
				logs_source = arg_msg.source
				logs_array = arg_msg.logs
			}
			
			const logs_record = {
				ts: logs_ts,
				level: logs_level,
				source: logs_source,
				logs:logs_array
			}
				
			return logs_record
		}
		
		self.logs_bus_stream_transfomed = self.logs_bus_stream.get_transformed_stream().map(msg_cb).groupBy(key_cb, limit_cb).flatMap(flatmap_cb)
		
		self.logs_bus_stream_transfomed.onValue(
			(logs_record) => {
				this.get_stream('default').push(logs_record)
			}
		)
	}
}
