// NPM IMPORTS
import assert from 'assert'

// COMMON IMPORTS
import T          from 'devapt-core-common/dist/js/utils/types'
import Executable from 'devapt-core-common/dist/js/base/executable'
import {get_runtime}    from 'devapt-core-common/dist/js/base/runtime'
const runtime = get_runtime()

// SERVER IMPORTS


let context = 'services/executables/executable_route'
console.log(context + ':HAS RUNTIME ?' + runtime ? 'yes' : 'no')



/**
 * @file Route registering base class.
 * @author Luc BORIES
 * @license Apache-2.0
 */
export default class ExecutableRoute extends Executable
{
    /**
     * Create a ExecutableRoute instance.
	 * @extends Executable
     * @abstract
     */
	constructor()
	{
		super(context, runtime.get_logger_manager())
	}
	
	
    
	/**
     * Prepare an execution with contextual informations.
     * @override
	 * 
     * @param {object} arg_settings - execution settings.
	 * 
     * @returns {nothing}
     */
	prepare(arg_settings)
	{
		// console.log(context + ':prepare:arg_settings', arg_settings)
		
		assert( T.isObject(arg_settings), context + ':no given config')
		this.store_config = arg_settings
		
		assert(T.isObject(this.store_config), context + ':bad config object')
		
		assert(T.isObject(this.store_config.server), context + ':bad server object')
		assert(this.store_config.server.is_server, context + ':bad server instance')
		
		this.server = this.store_config.server
	}
    
	

	/**
     * Execution with contextual informations.
     * @override
	 * 
     * @param {object} arg_data - Application instance.
	 * 
     * @returns {object} promise.
     */
	execute(arg_data)
	{
		// console.log(context + ':execute:store_config', this.store_config)
		
		// CHECK APPLICATION
		assert(T.isObject(arg_data), context + ':bad application object')
		assert(arg_data.is_topology_define_application, context + ':bad application instance')
		const application = arg_data
		
		this.info('Execute: add server route for ' + application.get_name())
		
		
		// CHECK SERVER
		const server_instance = this.server
		assert(T.isString(server_instance.server_type), context + ':bad server_instance.server_type string')
		assert(T.isObject(server_instance.server) || T.isFunction(server_instance.server), context + ':bad server_instance.server object or function')
		

		// LOOP ON ROUTES
		this.debug('this.store_config.routes', this.store_config.routes)
		let routes_registering_promises = []
		assert(T.isArray(this.store_config.routes), context + ':bad store_config.routes object')
		const cfg_routes = this.store_config.routes

		// PROBLEM WITH NODEJS 0.10
		// for(let cfg_route of cfg_routes)
		// {
		for(let cfg_route_index = 0 ; cfg_route_index < cfg_routes.length ; cfg_route_index++)
		{
			// GET ROUTE CONFIG
			let cfg_route = cfg_routes[cfg_route_index]
			this.debug('loop on cfg_route', cfg_route)
			assert(T.isObject(cfg_route), context + ':bad cfg_route object')
			assert(T.isString(cfg_route.route), context + ':bad route string')
			
			// GET APPLICATION URL
			const app_url = T.isString(application.app_url) ? application.app_url : ''
			this.debug('app_route', app_url)
			
			// GET ROUTE IS GLOBAL (HAS FULL ROUTE INSIDE)
			const route_is_global = (T.isBoolean(cfg_route.is_global) && cfg_route.is_global == true)

			// GET APPLICATION ROUTE
			let app_route = route_is_global ? cfg_route.route : app_url + cfg_route.route
			app_route = (app_route[0] == '/' ? '' : '/') + app_route
			cfg_route.full_route = app_route

			// DEBUG
			// console.log('route=%s, app_route=%s, cfg.route=%s, is_global=%s, cond=%s', route, app_route, cfg_route.route, cfg_route.is_global, (cfg_route.is_global && cfg_route.is_global == true))
			
			// GET REGEXP
			cfg_route.route_regexp = undefined
			if ( app_route.indexOf('.*') > -1 || app_route.indexOf('$') > -1 || app_route.indexOf('^') > -1 )
			{
				cfg_route.route_regexp = new RegExp( app_route.replace('/', '\/') )
			}
			
			this.debug('route', cfg_route.full_route.toString())
			this.debug('directory', cfg_route.directory)
			
			const route_resistering_promise = this.process_route(server_instance, application, cfg_route, arg_data)
			routes_registering_promises.push(route_resistering_promise)
            
			this.info('registering route [' + app_route + '] for application [' + application.$name + ']')
		}
        
		return Promise.all(routes_registering_promises)
	}

	
    
	/**
     * Process a route registering.
	 * 
     * @param {Server} arg_server - Server instance.
     * @param {TopologyDefineApplication} arg_application - Application instance.
     * @param {object} arg_cfg_route - plain object route configuration.
     * @param {object} arg_data - plain object contextual datas.
	 * 
     * @returns {Promise} - Promise(boolean) with (true:success, false: failure).
     */
	process_route(arg_server, arg_application, arg_cfg_route, arg_data)
	{
		// DEBUG
		// console.log(arg_cfg_route, 'arg_cfg_route')
		
		// GET ROUTE CALLBACK
		const route_cb = this.get_route_cb(arg_application, arg_cfg_route, arg_data)
		if (!route_cb)
		{
			console.error('bad route callback', context)
			return Promise.reject(context + ':process_route:bad route callback')
		}

		// CHECK SERVER
		if ( ! T.isObject(arg_server) || ! arg_server.is_server || ! arg_server.is_routable_server )
		{
			return Promise.reject(context + ':process_route:bad server type')
		}
        
		// ADD ROUTE HANDLER
		try
		{
			arg_server.add_get_route(arg_cfg_route, route_cb)

			return Promise.resolve(true)
		}
		catch(e)
		{
			console.error(e, context)
			const cfg_route_str = JSON.stringify(arg_cfg_route)
			return Promise.reject(context + ':process_route:' + e.toString() + ' for route config=[' + cfg_route_str + ']')
		}
	}
    

	
	/**
     * Callback for route handling.
     * @abstract
	 * 
     * @param {TopologyDefineApplication} arg_application - Application instance.
     * @param {object} arg_cfg_route - plain object route configuration.
     * @param {object} arg_data - plain object contextual datas.
	 * 
     * @param {function} route handler.
     */
	get_route_cb(/*arg_application, arg_cfg_route, arg_data*/)
	{
		assert(false, context + ':get_route_cb(cfg_route) should be implemented')
	}
	
	
	
	/**
	 * Callback for redirect route handling.
	 * 
	 * @param {TopologyDefineApplication} arg_application - Application instance.
	 * @param {object} arg_cfg_route - plain object route configuration.
	 * @param {object} arg_data - plain object contextual datas.
	 * 
	 * @param {function} route handler.
	 */
	get_route_redirect_cb(arg_application, arg_cfg_route/*, arg_data*/)
	{
		assert(T.isString(arg_cfg_route.redirect), context + ':bad redirect route string')
		
		return (req, res/*, next*/) => {
			const url = runtime.context.get_url_with_credentials(arg_cfg_route.redirect, req)
			res.redirect(url)
		}
	}
}
