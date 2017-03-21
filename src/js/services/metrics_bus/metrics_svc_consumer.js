// NPM IMPORTS
import assert from 'assert'

// SERVER IMPORTS
import ServiceConsumer from '../base/service_consumer'


let context = 'server/services/metrics_bus/metrics_svc_consumer'



/**
 * Service consumer class.
 * @author Luc BORIES
 * @license Apache-2.0
 */
export default class MetricsSvcBusConsumer extends ServiceConsumer
{
	/**
	 * Create a service consumer.
	 * 
	 * @param {string} arg_consumer_name - consumer name.
	 * @param {Service} arg_service_instance - service instance.
	 * @param {string} arg_context - logging context label.
	 * 
	 * @returns {nothing}
	 */
	constructor(arg_consumer_name, arg_service_instance, arg_context)
	{
		super(arg_consumer_name, arg_service_instance, arg_context ? arg_context : context)
		assert( arg_service_instance.is_metrics_service, context + ':constructor:bad crud service instance')
	}
	
	
	
	/**
	 * Enhance operands if needed.
	 * 
	 * @params {array} arg_operands - Variable list of operands.
	 * 
	 * @returns {array} - not used.
	 */
	prepare_args(arg_operands)
	{
		this.enter_group('prepare_args')
		
		this.leave_group('prepare_args')
		return arg_operands
	}
	
	
	
	/**
	 * Consume a service on the same bus.
	 * 
	 * @param {object} arg_provider - service provider.
	 * 
	 * @return {object} a promise of results.
	 */
	consume_local(/*arg_provider*/)
	{
		return Promise.resolve(undefined)
	}
	
	
	
	/**
	 * Consume a service on a remote bus.
	 * 
	 * @param {object} arg_provider - service provider.
	 * @param {array} arg_routes - Routes to request.
	 * 
	 * @return {object} a promise of results.
	 */
	consume_remote(/*arg_provider, arg_routes*/)
	{
		this.enter_group('consume_remote')
		
		
		this.leave_group('consume_remote')
		return Promise.resolve(undefined)
	}
}
