// NPM IMPORTS
// import assert from 'assert'
import _ from 'lodash'

// COMMON IMPORTS
import T                  from 'devapt-core-common/dist/js/utils/types'
import ServiceProvider    from 'devapt-core-common/dist/js/services/service_provider'
import ServiceResponse    from 'devapt-core-common/dist/js/services/service_response'
import DistributedMessage from 'devapt-core-common/dist/js/base/distributed_message'
import DistributedLogs    from 'devapt-core-common/dist/js/base/distributed_logs'
import DistributedMetrics from 'devapt-core-common/dist/js/base/distributed_metrics'
// import Stream             from 'devapt-core-common/dist/js/messaging/stream'

// SERVICES IMPORTS


const context = 'services/messages/messages_svc_provider'



/**
 * Messages service provider class.
 * 
 * @author Luc BORIES
 * @license Apache-2.0
 * 
 * @example
* 	API:
* 		this._msg_subscriptions = {
* 			sender name:{
* 				bus name:{
* 					channel name:{
* 						socket: server/browser socket,
* 						unsubscribe: function
* 					}
* 				}
* 			}
* 		}
 */
export default class MessagesSvcProvider extends ServiceProvider
{
	/**
	 * Create a messages gateway service provider.
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

		this.is_messages_svc_provider = true

		this._msg_subscriptions = {}
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
			'devapt-msg-describe', 'devapt-msg-recipients',
			'devapt-msg-send',
			'devapt-msg-subscribe', 'devapt-msg-unsubscribe', 'devapt-msg-subscription'
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

		// GET BUSES
		const node = this.get_runtime().get_node()
		const msg_bus = node.get_msg_bus()
		const logs_bus = node.get_logs_bus()
		const metrics_bus = node.get_metrics_bus()
		const msg_engine = msg_bus.get_bus_engine()
		const logs_engine = logs_bus.get_bus_engine()
		const metrics_engine = metrics_bus.get_bus_engine()


		if (operation == 'devapt-msg-recipients')
		{
			const bus        = operands.length > 0 ? operands[0] : undefined
			const page_size  = operands.length > 1 ? operands[1] : 99
			const page_index = operands.length > 2 ? operands[2] : 0

			if (bus == 'messages')
			{
				const paged_result = msg_bus.msg_recipients(page_size, page_index)
				response.set_results(paged_result)
				this.leave_group('produce:operation[' + operation + '] for bus [' + bus + ']')
				return Promise.resolve(response)
			}

			if (bus == 'logs')
			{
				const paged_result = logs_bus.msg_recipients(page_size, page_index)
				response.set_results(paged_result)
				this.leave_group('produce:operation[' + operation + '] for bus [' + bus + ']')
				return Promise.resolve(response)
			}

			if (bus == 'metrics')
			{
				const paged_result = metrics_bus.msg_recipients(page_size, page_index)
				response.set_results(paged_result)
				this.leave_group('produce:operation[' + operation + '] for bus [' + bus + ']')
				return Promise.resolve(response)
			}

			// ERROR: BAD BUS NAME
			response.set_has_error(true)
			response.set_error('bad operands bus [' + bus + '] for operation [' + operation + ']')
			response.set_results(operands)

			this.leave_group('produce:error:operation failure [' + operation + ']:bad operands bus [' + bus + '].')
			return Promise.resolve(response)
		}
	
		if (operation == 'devapt-msg-describe')
		{
			const buses = {}

			buses['messages'] = {
				name:msg_bus.get_name(),
				type:'messages',
				engine:msg_engine.get_name(),
				channels:msg_engine.channel_list(),
				recipients:node.get_msg_bus().msg_recipients(99, 0)
			}
			
			buses['logs'] = {
				name:logs_bus.get_name(),
				type:'logs',
				engine:logs_engine.get_name(),
				channels:logs_engine.channel_list(),
				recipients:node.get_logs_bus().msg_recipients(99, 0)
			}
			
			buses['metrics'] = {
				name:metrics_bus.get_name(),
				type:'metrics',
				engine:metrics_engine.get_name(),
				channels:metrics_engine.channel_list(),
				recipients:node.get_metrics_bus().msg_recipients(99, 0)
			}

			response.set_results(buses)

			// console.log(context + ':produce:reply for service=' + this.service.get_name() + ':operation=' + operation, response.get_properties_values())

			this.leave_group('produce:operation[' + operation + ']')
			return Promise.resolve(response)
		}


		if (operation == 'devapt-msg-send')
		{
			const response_promise = this.produce_send(arg_request)
			this.leave_group('produce:[' + operation + ']')
			return response_promise
		}


		if (operation == 'devapt-msg-subscribe')
		{
			const response_promise = this.produce_subscribe(arg_request)
			this.leave_group('produce:[' + operation + ']')
			return response_promise
		}


		if (operation == 'devapt-msg-unsubscribe')
		{
			const response_promise = this.produce_unsubscribe(arg_request)
			this.leave_group('produce:[' + operation + ']')
			return response_promise
		}


		if (operation == 'devapt-msg-subscription')
		{
			response.set_results([])

			this.leave_group('produce:[' + operation + ']')
			return Promise.resolve(response)
		}

		this.leave_group('produce:super.')
		return super.produce(arg_request)
	}



	produce_send(arg_request)
	{
		this.enter_group('produce_send')

		const response = new ServiceResponse(arg_request)
		const operation = arg_request.get_operation()
		const operands = arg_request.get_operands()
		const node = this.get_runtime().get_node()

		// GET REQUEST OPERANDS
		const sender  = arg_request.get_session_uid()
		const bus     = operands.length > 0 ? operands[0] : undefined
		const channel = operands.length > 1 ? operands[1] : 'default'
		const target  = operands.length > 2 ? operands[2] : undefined
		const payload = operands.length > 3 ? operands[3] : undefined

		if (bus == 'messages')
		{
			// CHECK REQUEST OPERANDS
			if ( ! T.isString(channel) || ! T.isString(target) || ! T.isObject(payload) )
			{
				response.set_has_error(true)
				response.set_error('bad operands to send a message.')
				response.set_results(operands)

				this.leave_group('produce_send:error:operation failure [' + operation + ']:bad operands to send a message.')
				return Promise.resolve(response)
			}

			const msg = new DistributedMessage(sender, target, payload, channel)
			node.get_msg_bus().msg_post(msg)

			this.leave_group('produce_send:operation[' + operation + '] for bus=[' + bus + '], channel=[' + channel + '], target=[' + target + ']')
			return Promise.resolve(response)
		}

		if (bus == 'logs')
		{
			// CHECK REQUEST OPERANDS
			if ( ! T.isString(channel) || ! T.isString(target) || ! T.isObject(payload) )
			{
				response.set_has_error(true)
				response.set_error('bad operands to send logs.')
				response.set_results(operands)

				this.leave_group('produce_send:error:operation failure [' + operation + ']:bad operands to send logs.')
				return Promise.resolve(response)
			}

			// CHECK LOGS CONTENT
			if ( ! T.isString(payload.timestamp) || ! T.isString(payload.level) || ! T.isArray(payload.values) )
			{
				response.set_has_error(true)
				response.set_error('bad operands payload to send logs: {timestamp:"", level:"", values:[]}.')
				response.set_results(operands)

				this.leave_group('produce_send:error:operation failure [' + operation + ']:bad operands payload to send logs: {timestamp:"", level:"", values:[]}.')
				return Promise.resolve(response)
			}

			const msg = new DistributedLogs(sender, target, payload.timestamp, payload.level, payload.values)
			node.get_logs_bus().msg_post(msg)
			
			this.leave_group('produce_send:operation[' + operation + '] for bus=[logs]')
			return Promise.resolve(response)
		}

		if (bus == 'metrics')
		{
			// CHECK REQUEST OPERANDS
			if ( ! T.isString(channel) || ! T.isString(target) || ! T.isObject(payload) )
			{
				response.set_has_error(true)
				response.set_error('bad operands to send metrics.')
				response.set_results(operands)

				this.leave_group('produce_send:error:operation failure [' + operation + ']:bad operands to send metrics.')
				return Promise.resolve(response)
			}

			// CHECK METRICS CONTENT
			if ( ! T.isString(payload.type) || ! T.isArray(payload.values) )
			{
				response.set_has_error(true)
				response.set_error('bad operands payload to send metrics: {type:"", values:[]}.')
				response.set_results(operands)

				this.leave_group('produce_send:error:operation failure [' + operation + ']:bad operands payload to send metrics: {type:"", values:[]}.')
				return Promise.resolve(response)
			}

			const msg = new DistributedMetrics(sender, target, payload.type, payload.values)
			node.get_metrics_bus().msg_post(msg)
			
			this.leave_group('produce_send:operation[' + operation + '] for bus=[metrics]')
			return Promise.resolve(response)
		}

		// ERROR: BAD BUS NAME
		response.set_has_error(true)
		response.set_error('bad operands bus [' + bus + '] for operation [' + operation + ']')
		response.set_results(operands)

		this.leave_group('produce_send:error:operation failure [' + operation + ']:bad operands bus [' + bus + '].')
		return Promise.resolve(response)
	}



	produce_subscribe(arg_request)
	{
		this.enter_group('produce_subscribe')

		const response = new ServiceResponse(arg_request)
		const operation = arg_request.get_operation()
		const operands = arg_request.get_operands()
		const node = this.get_runtime().get_node()

		// // GET REQUEST OPERANDS
		const sender  = arg_request.get_session_uid()
		const bus     = operands.length > 0 ? operands[0] : undefined
		const channel = operands.length > 1 ? operands[1] : 'default'
		
		if (bus == 'messages')
		{
			// CHECK REQUEST OPERANDS
			if ( ! T.isString(channel) )
			{
				response.set_has_error(true)
				response.set_error('bad operands channel to subscribe on messages.')
				response.set_results(operands)

				this.leave_group('produce_subscribe:error:operation failure [' + operation + ']:bad operands channel to subscribe on messages.')
				return Promise.resolve(response)
			}

			// SUBSCRIPTION EXISTS
			if ( this.has_subscription(sender, bus, channel) )
			{
				response.set_has_error(true)
				response.set_error('messages subscription already exists for sender [' + sender + '].')
				response.set_results(operands)

				this.leave_group('produce_subscribe:error:operation failure [' + operation + ']:messages subscription already exists for sender [' + sender + '].')
				return Promise.resolve(response)
			}


			// CREATE SESSION STREAM
			const socket = arg_request.get_socket()
			this._msg_subscriptions[sender] = this.init_subscription(sender, bus, channel, socket)

			const handler = (arg_msg)=>{
				if (arg_msg.get_target() == sender)
				{
					const msg_payload = arg_msg.get_payload()
					const socket_id = msg_payload.socket_id//.split('#')[1]
					
					// SERVICE RESPONSE TRANSPORT
					if ( T.isNotEmptyString(msg_payload.service) && T.isNotEmptyString(msg_payload.operation) && T.isArray(msg_payload.results) )
					{
						// DEBUG
						console.log(context + ':produce_subscribe:handler for service response:socket_id=[%s] service=[%s] operation=[%s] results=[%a]', socket_id, msg_payload.service, msg_payload.operation, msg_payload.results)
						
						const iosrvs = this.get_runtime().socketio_servers
						const svc_path = '/' + msg_payload.service

						_.forEach(iosrvs,
							(iosrv)=>{
								console.log('svc_path=[%s],socket_id=[%s], iosrv.of(svc_path)=', svc_path, socket_id, iosrv.of(svc_path))
								
								if (svc_path in iosrv.nsps)
								{
									// console.log('iosrv.of(...).connected', iosrv.of(svc_path).connected)

									if (socket_id in iosrv.of(svc_path).connected)
									{
										// console.log('iosrv.of(...).connected[socket_id]', iosrv.of(svc_path).connected[socket_id])

										iosrv.of(svc_path).connected[socket_id].emit(msg_payload.operation, msg_payload)
									}
								}
							}
						)

						return
					}

					// OTHERS CASES
					const payload = { service:this.service.get_name(), operation:'devapt-msg-subscription', results:['done', arg_msg] }
					
					// DEBUG
					console.log(context + ':produce_subscribe:default handler:socket_id=[%s] service=[%s] operation=[%s] results=[%a]', socket_id, payload.service, payload.operation, payload.results)

					socket.emit('devapt-msg-subscription', payload)
				}
			}

			node.get_msg_bus().msg_add_recipient(sender, 'browser')
			
			this._msg_subscriptions[sender][bus][channel].unsubscribe = node.get_msg_bus().msg_subscribe(channel, handler, sender)
			
			// UNSUBSCRIBE ON SOCKET CLOSE
			socket.on('disconnect', ()=>{
				if ( this.has_subscription(sender, bus, channel) && this._msg_subscriptions[sender][bus][channel].unsubscribe )
				{
					this._msg_subscriptions[sender][bus][channel].unsubscribe()
				}
				node.get_msg_bus().msg_remove_recipient(sender)
			})
			socket.on('end', ()=>{
				if ( this.has_subscription(sender, bus, channel) && this._msg_subscriptions[sender][bus][channel].unsubscribe )
				{
					this._msg_subscriptions[sender][bus][channel].unsubscribe()
				}
				node.get_msg_bus().msg_remove_recipient(sender)
			})

			response.set_results([])

			this.leave_group('produce_subscribe:operation[' + operation + '] for bus=[messages] for sender [' + sender + ']')
			return Promise.resolve(response)
		}

		// ERROR: BAD BUS NAME
		response.set_has_error(true)
		response.set_error('bad operands bus [' + bus + '] for operation [' + operation + ']')
		response.set_results(operands)

		this.leave_group('produce_subscribe:error:operation failure [' + operation + ']:bad operands bus [' + bus + '].')
		return Promise.resolve(response)
	}


	has_subscription(arg_sender, arg_bus, arg_channel)
	{
		if (arg_sender in this._msg_subscriptions)
		{
			const subscription = this._msg_subscriptions[arg_sender]
			if (arg_bus in subscription)
			{
				if (arg_channel in subscription[arg_bus])
				{
					return true
				}
			}
		}

		return false
	}


	init_subscription(arg_sender, arg_bus, arg_channel, arg_socket)
	{
		let subscription = this._msg_subscriptions[arg_sender]
		if ( ! subscription)
		{
			subscription = {}
		}

		if ( !(arg_bus in subscription) )
		{
			subscription[arg_bus] = {}
		}

		if ( ! (arg_channel in subscription[arg_bus]) )
		{
			subscription[arg_bus][arg_channel] = {
				socket:arg_socket,
				unsubscribe: undefined
			}
		}

		return subscription
	}



	produce_unsubscribe(arg_request)
	{
		this.enter_group('produce_unsubscribe')

		const response = new ServiceResponse(arg_request)
		const operation = arg_request.get_operation()
		const operands = arg_request.get_operands()

		// // GET REQUEST OPERANDS
		const sender  = arg_request.get_session_uid()
		const bus     = operands.length > 0 ? operands[0] : undefined
		const channel = operands.length > 1 ? operands[1] : 'default'
		
		if (bus == 'messages')
		{
			// CHECK REQUEST OPERANDS
			if ( ! T.isString(channel) )
			{
				response.set_has_error(true)
				response.set_error('bad operands channel to unsubscribe for messages.')
				response.set_results(operands)

				this.leave_group('produce_unsubscribe:error:operation failure [' + operation + ']:bad operands channel to unsubscribe for messages.')
				return Promise.resolve(response)
			}

			// CHECK SUBSCRIPTION
			if ( ! this.has_subscription(sender, bus, channel) )
			{
				response.set_has_error(true)
				response.set_error('messages subscription doesn t exists for sender [' + sender + '].')
				response.set_results(operands)

				this.leave_group('produce_unsubscribe:error:operation failure [' + operation + ']:messages subscription doesn t exists for sender [' + sender + '].')
				return Promise.resolve(response)
			}
			const subscription = this._msg_subscriptions[sender][bus][channel]

			// REMOVE SESSION STREAM
			const unsubscribe_fn = subscription.unsubscribe
			if (unsubscribe_fn)
			{
				unsubscribe_fn()
			}
			delete this._msg_subscriptions[sender][bus][channel]

			this.leave_group('produce_unsubscribe:operation[' + operation + '] for bus=[messages] for sender [' + sender + ']')
			return Promise.resolve(response)
		}

		// ERROR: BAD BUS NAME
		response.set_has_error(true)
		response.set_error('bad operands bus [' + bus + '] for operation [' + operation + ']')
		response.set_results(operands)

		this.leave_group('produce_unsubscribe:error:operation failure [' + operation + ']:bad operands bus [' + bus + '].')
		return Promise.resolve(response)
	}
}
