// NPM IMPORTS
// import assert from 'assert'
import {format} from 'util'

// COMMON IMPORTS
import T                  from 'devapt-core-common/dist/js/utils/types'
import ServiceProvider    from 'devapt-core-common/dist/js/services/service_provider'
import ServiceResponse    from 'devapt-core-common/dist/js/services/service_response'
import Stream             from 'devapt-core-common/dist/js/messaging/stream'
import {get_runtime}      from 'devapt-core-common/dist/js/base/runtime'
const runtime = get_runtime()

// SERVICES IMPORTS


const context = 'services/metrics/metrics_bus_svc_provider'



/**
 * Bus Metrics service provider class.
 * 
 * @author Luc BORIES
 * @license Apache-2.0
 * 
 */
export default class MetricsBusSvcProvider extends ServiceProvider
{
	/**
	 * Create a bus metrics service provider.
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

		this.is_metrics_svc_provider = true

		// CREATE A STREAM
		this.metrics_stream = new Stream()
		this.metrics_bus_stream = runtime.node.get_metrics_bus().get_input_stream()

		this.init_stream()
		
		// DEBUG STREAM
		// this.metrics_bus_stream.subscribe(
		// 	(metrics_record) => {
		// 		console.log('MetricsSvcProvider: new metrics record on the bus', metrics_record)
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
		return [
			'devapt-metrics-bus-get', 'devapt-metrics-bus-list'
		].concat( super.get_operations_names() )
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
			this.leave_group('produce:error:bad request object.')
			return Promise.resolve({error:'bad request object'})
		}

		const response = new ServiceResponse(arg_request)
		const operation = arg_request.get_operation()
		const operands = arg_request.get_operands()

		// console.log(context + ':produce:request for service=' + this.service.get_name() + ':operation=' + operation)

		// GET METRICS SERVER
		const metrics_server = runtime.node.get_metrics_server()
		if (! metrics_server)
		{
			this.error(response, operands, 'metrics server not found')
			return Promise.resolve(response)
		}

		// OPERATION: GET CURRENT METRICS
		if (operation == 'devapt-metrics-bus-get')
		{
			// GET WITHOUT OPERANDS
			// if (operands.length == 0)
			// {
			// 	const bus_state_values = metrics_server.get_bus_metrics_state_values()
			// 	// console.log(bus_state_values, context + ':produce:get:no opds:bus_state_values')
				
			// 	response.set_results(bus_state_values)

			// 	this.leave_group( format('produce:service[%s] operation[%s] metrics values count[%n]', response.get_service(), operation, bus_state_values.length) )
			// 	return Promise.resolve(response)
			// }
			
			// GET WITH ONE OPERAND
			const bus_name = operands[0]
			if ( T.isNotEmptyString(bus_name) )
			{
				const bus_state_values = metrics_server.get_bus_metrics_state_values_for(bus_name)
				// console.log(bus_state_values, context + ':produce:get:bus_name=' + bus_name + ':bus_state_values')
				
				response.set_results(bus_state_values)

				this.leave_group( format('produce:service[%s] operation[%s] metrics values count[%n]', response.get_service(), operation, bus_state_values.length) )
				return Promise.resolve(response)
			}
			
			// DEFAULT OPERANDS CAS
			const bus_state_values = metrics_server.get_bus_metrics_state_values()
			// console.log(bus_state_values, context + ':produce:get:bad opds:bus_state_values')
			
			response.set_results(bus_state_values)

			this.leave_group( format('produce:service[%s] operation[%s] metrics values count[%n]', response.get_service(), operation, bus_state_values.length) )
			return Promise.resolve(response)
		}
		
		// OPERATION: LIST METRICS ITEMS
		if (operation == 'devapt-metrics-bus-list')
		{
			const bus_state_items = metrics_server.get_bus_metrics_state_values_items()
			// console.log(bus_state_items, context + ':produce:list:bus_state_items')
			
			response.set_results(bus_state_items)

			this.leave_group( format('produce:service[%s] operation[%s] metrics values count[%n]', response.get_service(), operation, bus_state_items.length) )
			return Promise.resolve(response)
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
	 * 
	 * @returns {nothing}
	 */
	error(arg_response, arg_operands, arg_error)
	{
		const op = arg_response.get_operation()
		const svc = arg_response.get_service()
		const error_msg = format('produce:error=[%s] with svc=[%s] operation=[%s]', arg_error, svc, op)
		
		arg_response.set_has_error(true)
		arg_response.set_error(error_msg)
		arg_response.set_results(arg_operands)
		
		this.leave_group(error_msg)
	}
	
	
	
	/**
	 * Init output stream.
	 * 
	 * @returns {nothing}
	 */
	init_stream()
	{
		const self = this
		
		const max_metrics_per_msg = 10
		const delay_per_metrics_msg = 100
		const limit_cb = (grouped_stream/*, group_start_event*/) => {
			const map_cb = (values) => {
				// console.log(values, 'limit.map.values')
				
				let metrics_record = {
					metric: undefined,
					metrics:[]
				}
				
				values.forEach(
					(value) => {
						metrics_record.metric = value.metric,
						metrics_record.metrics = metrics_record.metrics.concat(value.metrics)
					}
				)
				
				// console.log(metrics_record, 'limit.map.metrics_record')
				return metrics_record
			}
			
			return grouped_stream.bufferWithTimeOrCount(delay_per_metrics_msg, max_metrics_per_msg).map(map_cb)
		}
		
		
		const key_cb = (value) => {
			// console.log(value.metric, 'value.metric')
			return value.metric
		}
		
		
		const flatmap_cb = (grouped_stream) => {
			return grouped_stream
		}
		
		const msg_filter_cb = (arg_msg) => {
			return arg_msg.payload.metric == 'bus'
		}
		
		const msg_cb = (arg_msg) => {
			const metric_type = arg_msg.payload.metric
			const metrics_array = arg_msg.payload.metrics
			const metrics_record = {
				metric: metric_type,
				metrics:metrics_array
			}
			
			return metrics_record
		}
		
		self.msg_bus_stream_transfomed = self.metrics_bus_stream.get_transformed_stream().filter(msg_filter_cb).map(msg_cb).groupBy(key_cb, limit_cb).flatMap(flatmap_cb)
		
		self.msg_bus_stream_transfomed.onValue(
			(metrics_record) => {
				self.provided_values_stream.push(metrics_record)
			}
		)
		
		// SEND METRICS TO SOCKETIO SUBSCRIBERS
		self.metrics_stream.subscribe(
			(metrics_record) => {
				// console.log(metrics_record, 'metrics_record')
				self.provided_values_stream.push(metrics_record)
			}
		)
	}
}
