// NPM IMPORTS
import T from 'typr'
import assert from 'assert'

// SERVER IMPORTS
import SocketIOServiceProvider from './socketio_service_provider'


let context = 'server/services/base/service_exec_provider'



/**
 * Service provider class for executable provider.
 * @author Luc BORIES
 * @license Apache-2.0
 */
export default class ServiceExecProvider extends SocketIOServiceProvider
{
	/**
	 * Create a service provider.
	 * 
	 * @param {string} arg_provider_name - consumer name.
	 * @param {Service} arg_service_instance - service instance.
	 * @param {string} arg_context - logging context label.
	 * 
	 * @returns {nothing}
	 */
	constructor(arg_provider_name, arg_service_instance, arg_context)
	{
		super(arg_provider_name, arg_service_instance, arg_context ? arg_context : context)
		
		this.is_service_exec_provider = true
	}
	
	
	
	/**
	 * Activate a service feature for an application for a specific provider.
	 * 
	 * @param {Application} arg_application - application instance.
	 * @param {Server} arg_server - server instance to bind the service.
	 * @param {object} arg_app_svc_cfg - service configuration for activation on application (unused).
	 * 
	 * @returns {nothing}
	 */
	activate_self(arg_application, arg_server, arg_app_svc_cfg)
	{
		assert( T.isObject(this.exec), context + ':activate_self:bad exec object')
		
		const exec_cfg = {
			'routes':this.get_setting_js('routes'),
			'server': arg_server,
			'unused':arg_app_svc_cfg
		}
		this.exec.prepare(exec_cfg)
		this.exec.execute(arg_application)
	}
}
