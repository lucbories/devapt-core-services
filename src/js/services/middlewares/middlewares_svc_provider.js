// NPM IMPORTS
import assert from 'assert'
import {format} from 'util'

// COMMON IMPORTS
import T                from 'devapt-core-common/dist/js/utils/types'
import ServiceProvider  from 'devapt-core-common/dist/js/services/service_provider'
import ServiceResponse  from 'devapt-core-common/dist/js/services/service_response'
import RenderingBuilder from 'devapt-core-common/dist/js/rendering/rendering_builder'

// SERVICES IMPORTS
import ExecutableRouteMiddleware from './executable_route_middleware'


let context = 'server/services/middlewares/middlewares_svc_provider'



/**
 * Middlewares service provider class.
 * 
 * @author Luc BORIES
 * @license Apache-2.0
 */
export default class MiddlewaresSvcProvider extends ServiceProvider
{
	/**
	 * Create a middleware service provider.
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
		
		this.is_middleware_svc_provider = true
		
		this.exec = new ExecutableRouteMiddleware()
		this.exec.service = this.service
	}



	/**
	 * Get provider operations names.
	 * @abstract
	 * 
	 * @returns {array}
	 */
	get_operations_names()
	{
		return ['devapt-mw-list', 'devapt-mw-get']
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
		const credentials = arg_request.get_credentials()

		// CHECK OPERANDS
		if ( ! T.isNotEmptyArray(operands) )
		{
			return Promise.resolve(undefined)
		}
		
		// DEBUG
		const debug_msg = format('produce:service[%s] operation[%s] operands count[%d]', response.get_service(), operation, operands.length)
		// console.log(context + debug_msg)
		this.debug(debug_msg)


		// GET TARGET ROUTE
		const opd_1 = operands.length > 0 ? operands[0] : undefined
		const opd_1_route = T.isObject(opd_1) ? opd_1.route : opd_1
		let target_route = opd_1_route && T.isNotEmptyString(opd_1_route) ? opd_1_route : undefined
		if ( ! target_route)
		{
			this.fill_error(response, operands, 'bad middleware route string')
			return Promise.resolve(response)
		}
		target_route = target_route.endsWith('/') ? target_route.slice(0, target_route.length - 1) : target_route
		
		// GET ROUTES
		const routes = this.get_setting_js('routes', [])
		// console.log(debug_msg + ':target_route=', target_route)

		switch(operation) {
			case 'get': {
				let renderer_result_json = undefined

				// SEARCH ROUTE
				let route_mw_file = undefined
				let route_page_view = undefined
				let route_page_menubar = undefined

				// TODO REPLACE FOREACH TO END LOOP ON FOUND
				routes.forEach(
					(route_cfg)=>{
						const loop_route = route_cfg.route.endsWith('/') ? route_cfg.route.slice(0, target_route.length - 1) : route_cfg.route
						if (loop_route == target_route)
						{
							route_mw_file = route_cfg.mw_file
							route_page_view = route_cfg.page_view
							route_page_menubar = route_cfg.page_menubar

							console.log(context + ':process:target_route found')
						}
					}
				)

				try {
					// PROCESS MIDDLEWARE FILE
					if ( T.isString(route_mw_file) )
					{
						console.log(context + ':process:route_mw_file found', route_mw_file)

						renderer_result_json = this.process_mw_file(route_mw_file, credentials)

						response.set_results( [renderer_result_json] )

						this.leave_group( format('produce:middleware file:service[%s] operation[%s]', response.get_service(), operation) )
						return Promise.resolve(response)
					}

					// VIEW RENDERING MIDDLEWARE
					if ( T.isString(route_page_view) )
					{
						console.log(context + ':process:route_page_view found', route_page_view)

						renderer_result_json = this.process_mw_view(route_page_view, route_page_menubar, credentials)

						response.set_results( [renderer_result_json] )

						this.leave_group( format('produce:view rendering:service[%s] operation[%s]', response.get_service(), operation) )
						return Promise.resolve(response)
					}

					// BAD ROUTE CONFIG
					this.fill_error(response, operands, 'route not found for target', target_route)
					return Promise.resolve(response)
				}
				catch(e)
				{
					this.fill_error(response, operands, 'exception for target', target_route, e)
					return Promise.resolve(response)
				}
			}
		}

		this.fill_error(response, operands, 'bad operation', target_route)
		return Promise.resolve(response)
	}



	/**
	 * Process a middleware file.
	 * 
	 * @param {string} arg_mw_file - middleware file.
	 * @param {Credentials} arg_credentials - request credentials.
	 * 
	 * @returns {object} - JSON rendering result.
	 */
	process_mw_file(arg_mw_file, arg_credentials)
	{
		this.enter_group('process_mw_file:' + arg_mw_file)
		assert( T.isString(arg_mw_file), context + ':process_mw_file:bad file string')
		
		let mw_cfg = undefined

		// CHECK PATH
		const path_file_name = this.get_runtime().context.get_absolute_path(arg_mw_file)
		assert(T.isString(path_file_name), context + ':bad middleware file path string')
		
		// LOAD MIDDLEWARE FILE
		try {
			this.info('Loading middleware file')
			
			mw_cfg = require(path_file_name).service_cfg
			// console.log(mw_cfg, 'mw_cfg')
		}
		catch(e)
		{
			console.log(context + ':process_mw_file:middleware loading error:' + e)
			this.error('process_mw_file:middleware file not found or not valid')
			
			this.leave_group('ExecutableRouteMiddleware.exec_http')
			return undefined
		}

		// PROCESSING MIDDLEWARE
		try {
			this.info('Processing middleware view')
			
			const view = mw_cfg.view
			const menubar = mw_cfg.menubar
			const renderer_result_json = this.process_mw_view(view, menubar, arg_credentials)

			this.info('Loading middleware after')
			return renderer_result_json
		}
		catch(e)
		{
			console.log(context + ':process_mw_file:middleware processing error:' + e)
			this.error('process_mw_file:middleware processing error', e)

			this.leave_group('ExecutableRouteMiddleware.exec_http')
			return undefined
		}
	}



	/**
	 * Process a middleware view.
	 * 
	 * @param {string|Component} arg_view_name - middleware view name.
	 * @param {string} arg_menubar_name - middleware menubar name.
	 * @param {Credentials} arg_credentials - request credentials.
	 * 
	 * @returns {object} - JSON rendering result.
	 */
	process_mw_view(arg_view_name, arg_menubar_name, arg_credentials)
	{
		const view_name = T.isString(arg_view_name) ? arg_view_name : ( ( T.isObject(arg_view_name) && arg_view_name.is_component) ? arg_view_name.get_name() : 'undefined')
		const menubar_name = T.isString(arg_menubar_name) ? arg_menubar_name : ( ( T.isObject(arg_menubar_name) && arg_menubar_name.is_component) ? arg_menubar_name.get_name() : 'undefined')
		console.log(context + ':process_mw_view:view,menubar:', view_name, menubar_name)

		assert( T.isString(arg_view_name) || ( T.isObject(arg_view_name) && arg_view_name.is_component), context + ':process_mw_view:bad view string or object')

		// GET ASSETS CONFIG
		const assets = this.service.get_assets_services_names('any')

		// CREATE RENDERING RESULT AND BUILDER
		const arg_application = undefined
		const renderer = new RenderingBuilder(this.runtime, assets.style, assets.script, assets.image, assets.html, arg_application)
		
		// RENDER TREE
		const renderer_result_json = renderer.render_json_content(arg_view_name, arg_menubar_name, arg_credentials)

		return renderer_result_json
	}



	/**
	 * Populate a response with error message.
	 * 
	 * @param {ServiceResponse} arg_response - response instance.
	 * @param {array} arg_operands      - request operands.
	 * @param {string} arg_error        - error text.
	 * @param {string} arg_target_route - target route (optional).
	 * @param {Error} arg_exception     - exception (optional).
	 * 
	 * @returns {nothing}
	 */
	fill_error(arg_response, arg_operands, arg_error, arg_target_route, arg_exception)
	{
		const op = arg_response.get_operation()
		const svc = arg_response.get_service()
		const error_msg = format('produce:error=[%s] with svc=[%s] operation=[%s] target route=[%s] exception=[%s].', arg_error, svc, op, arg_target_route, arg_exception)
		
		arg_response.set_has_error(true)
		arg_response.set_error(error_msg)
		arg_response.set_results(arg_operands)
		
		this.leave_group(error_msg)
	}
}
