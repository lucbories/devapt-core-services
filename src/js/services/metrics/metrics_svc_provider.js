// NPM IMPORTS
// import assert from 'assert'
import {format} from 'util'

// COMMON IMPORTS
import T                  from 'devapt-core-common/dist/js/utils/types'
import ServiceProvider    from 'devapt-core-common/dist/js/services/service_provider'
import ServiceResponse    from 'devapt-core-common/dist/js/services/service_response'
import {get_runtime}      from 'devapt-core-common/dist/js/base/runtime'
const runtime = get_runtime()

// SERVICES IMPORTS


const context = 'services/metrics/metrics_svc_provider'



/**
 * Metrics service provider class.
 * 
 * @author Luc BORIES
 * @license Apache-2.0
 * 
 */
export default class MetricsSvcProvider extends ServiceProvider
{
	/**
	 * Create a metrics service provider.
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

		// CREATE STREAMS
		// this.metrics_streams = {
		// 	'http':new Stream(),
		// 	'bus':new Stream(),
		// 	'host':new Stream(),
		// 	'nodejs':new Stream()
		// }

		// GET NODE METRICS BUS
		this._metrics_bus_stream = runtime.node.get_metrics_bus().get_input_stream()
		this._metrics_bus_stream_transformed = undefined
		
		// DEBUG STREAM
		// this._metrics_bus_streams.subscribe(
		// 	(metrics_record) => {
		// 		console.log('MetricsSvcProvider: new metrics record on the bus', metrics_record)
		// 	}
		// )


		this.add_stream('http')
		this.add_stream('bus')
		this.add_stream('host')
		this.add_stream('nodejs')

		this.init_stream('http')
		this.init_stream('bus')
		this.init_stream('host')
		this.init_stream('nodejs')
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
			'devapt-metrics-get',        'devapt-metrics-list',
			'devapt-metrics-http-get',   'devapt-metrics-http-list',   'devapt-metrics-http-subscribe',
			'devapt-metrics-bus-get',    'devapt-metrics-bus-list',    'devapt-metrics-bus-subscribe',
			'devapt-metrics-host-get',   'devapt-metrics-host-list',   'devapt-metrics-host-subscribe',
			'devapt-metrics-nodejs-get', 'devapt-metrics-nodejs-list', 'devapt-metrics-nodejs-subscribe'
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
		let type = undefined
		let op = 'undefined'

		switch(operation) {
			case 'devapt-subscribe':
				op = 'super'
				break
			case 'devapt-unsubscribe':
				op = 'super'
				break

			case 'devapt-metrics-get':
				op = 'get'
				break
			case 'devapt-metrics-list':
				op = 'list'
				break
			
			case 'devapt-metrics-http-get':
				type = 'http'
				op = 'get'
				break
			case 'devapt-metrics-http-list':
				type = 'http'
				op = 'list'
				break
			case 'devapt-metrics-http-subscribe':
				type = 'http'
				op = 'subscribe'
				break
			case 'devapt-metrics-http-unsubscribe':
				type = 'http'
				op = 'unsubscribe'
				break
			
			case 'devapt-metrics-bus-get':
				type = 'bus'
				op = 'get'
				break
			case 'devapt-metrics-bus-list':
				type = 'bus'
				op = 'list'
				break
			case 'devapt-metrics-bus-subscribe':
				type = 'bus'
				op = 'subscribe'
				break
			case 'devapt-metrics-bus-unsubscribe':
				type = 'bus'
				op = 'unsubscribe'
				break
			
			case 'devapt-metrics-host-get':
				type = 'host'
				op = 'get'
				break
			case 'devapt-metrics-host-list':
				type = 'host'
				op = 'list'
				break
			case 'devapt-metrics-host-subscribe':
				type = 'host'
				op = 'subscribe'
				break
			case 'devapt-metrics-host-unsubscribe':
				type = 'host'
				op = 'unsubscribe'
				break
			
			case 'devapt-metrics-nodejs-get':
				type = 'nodejs'
				op = 'get'
				break
			case 'devapt-metrics-nodejs-list':
				type = 'nodejs'
				op = 'list'
				break
			case 'devapt-metrics-nodejs-subscribe':
				type = 'nodejs'
				op = 'subscribe'
				break
			case 'devapt-metrics-nodejs-unsubscribe':
				type = 'nodejs'
				op = 'unsubscribe'
				break
			
		}

		let operand_index = 0
		if (! type && operands.length > 0 && T.isNotEmptyString(operands[0]) )
		{
			type = operands[0]
			++operand_index
		}
		
		// DEBUG
		const debug_msg = format('produce:service[%s] operation[%s] op[%s] type[%s] operands count[%d] opds index[%d]', response.get_service(), operation, op, type, operands.length, operand_index)
		// console.log(context + debug_msg)
		this.debug(debug_msg)

		// CHECK OPERATION AND TYPE STRINGS
		if (! T.isNotEmptyString(op) || ! T.isNotEmptyString(type) )
		{
			this.fill_error(response, operands, 'bad metrics operation and/or type string', op, type)
			return Promise.resolve(response)
		}

		// GET METRICS SERVER
		const metrics_server = runtime.node.get_metrics_server()
		if (! metrics_server)
		{
			this.fill_error(response, operands, 'metrics server not found', op, type)
			return Promise.resolve(response)
		}

		// OPERATION: GET CURRENT METRICS
		if (op == 'get')
		{
			// GET WITH ONE OPERAND
			const item = operands[operand_index]
			if ( T.isNotEmptyString(item) )
			{
				this.debug('get with one not empty operand string:[' + item + ']')
				const state_values = metrics_server.get_metrics_state_values(type, item)
				
				// console.log(context + debug_msg + ' item=[%s] state_values=', item, bus_state_values)
				
				response.set_results([state_values])

				this.leave_group( debug_msg + format(' metrics values keys[%s]', Object.keys(state_values) ) )
				return Promise.resolve(response)
			}
			
			// DEFAULT CASE
			const state_values = metrics_server.get_metrics_state_values(type)

			// console.log(context + debug_msg + ' state_values=', state_values)
			this.debug(debug_msg + ' state_values=', state_values)
			
			response.set_results([state_values])

			this.leave_group( debug_msg + format(' metrics values keys[%s]', Object.keys(state_values) ) )
			return Promise.resolve(response)
		}
		
		// OPERATION: LIST METRICS ITEMS
		if (op == 'list')
		{
			const state_items = metrics_server.get_metrics_state_values_items(type)

			// console.log(context + debug_msg + ' state_items=', state_items)
			this.debug(debug_msg + ' state_items=', state_items)
			
			const items = T.isArray(state_items) ? state_items : []
			response.set_results(items)

			this.leave_group( debug_msg + format(' metrics items[%s]', items) )
			return Promise.resolve(response)
		}
		
		// OPERATION: SUBSCRIBE
		if (op == 'subscribe')
		{
			const socket = arg_request.get_socket()
			
			if (socket)
			{
				const result = this.subscribe(type, socket)
				if (! result)
				{
					response.set_results([ { error:'subscribe failed' } ].concat(operands) )
					return Promise.resolve(response)
				}

				response.set_results( ['done'].concat(operands) )
				return Promise.resolve(response)
			}
			
			response.set_results([ { error:'bad socket' } ].concat(operands) )
			return Promise.resolve(response)
		}
		
		// OPERATION: UNSUBSCRIBE
		if (op == 'unsubscribe')
		{
			const socket = arg_request.get_socket()
			
			if (socket)
			{
				const result = this.unsubscribe(type, socket)
				if (! result)
				{
					response.set_results([ { error:'subscribe failed' } ].concat(operands) )
					return Promise.resolve(response)
				}

				response.set_results( ['done'].concat(operands) )
				return Promise.resolve(response)
			}
			
			response.set_results([ { error:'bad socket' } ].concat(operands) )
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
	 * @param {string} arg_op          - metrics operation.
	 * @param {string} arg_type        - metrics type.
	 * 
	 * @returns {nothing}
	 */
	fill_error(arg_response, arg_operands, arg_error, arg_op, arg_type)
	{
		const op = arg_response.get_operation()
		const svc = arg_response.get_service()
		const error_msg = format('produce:error=[%s] with svc=[%s] operation=[%s] op=[%s] type=[%s] operands count=[%i]', arg_error, svc, op, arg_op, arg_type, arg_operands.length)
		
		arg_response.set_has_error(true)
		arg_response.set_error(error_msg)
		arg_response.set_results(arg_operands)
		
		this.leave_group(error_msg)
	}
	
	
	
	/**
	 * Init output stream.
	 * 
	 * @param {string} arg_type - metrics type.
	 * 
	 * @returns {nothing}
	 */
	init_stream(arg_type)
	{
		const self = this
		
		// CHECK TYPE
		if ( ! this.has_stream(arg_type) )
		{
			console.error(context + ':init_stream:bad metrics type[' + arg_type + ']')
			return
		}

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
			if (arg_msg.payload.metric != arg_type)
			{
				console.warn(context + ':init_stream:metrics filter blocks', arg_msg.payload.metric, arg_type)
			}
			return arg_msg.payload.metric == arg_type
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
		
		self._metrics_bus_stream_transformed = self._metrics_bus_stream.get_transformed_stream().filter(msg_filter_cb).map(msg_cb).groupBy(key_cb, limit_cb).flatMap(flatmap_cb)
		
		self._metrics_bus_stream_transformed.onValue(
			(metrics_record) => {
				console.log(context + ':init_stream:new metrics record')
				self.get_stream(arg_type).push(metrics_record)
			}
		)
	}
}
