// NPM IMPORTS
import assert from 'assert'

// COMMON IMPORTS
import T             from 'devapt-core-common/dist/js/utils/types'
import {get_runtime} from 'devapt-core-common/dist/js/base/runtime'
const runtime = get_runtime()

// SERVER IMPORTS
import ExecutableRoute from '../../executables/executable_route'


let context = 'server/services/base/executable_route_assets'



/**
 * @file Assets route registering class.
 * @author Luc BORIES
 * @license Apache-2.0
 */
export default class ExecutableRouteAssets extends ExecutableRoute
{
	/**
	 * Create an assets route registering executable.
	 * @extends ExecutableRoute
	 * 
	 * @returns {nothing}
	 */
	constructor()
	{
		super(context)
	}
	
	
	/**
	 * Callback for route handling.
	 * @override
	 * 
	 * @param {object} arg_application - Application instance.
	 * @param {object} arg_cfg_route - plain object route configuration.
	 * @param {object} arg_data - plain object contextual datas.
	 * 
	 * @returns {function} - route handler.
	 */
	get_route_cb(arg_application, arg_cfg_route, arg_data)
	{
		if ( T.isString(arg_cfg_route.directory) )
		{
			console.log(context + ':ROUTE FOR ASSETS IN DIRECTORY MODE for ', arg_cfg_route.directory)

			return this.get_route_directory_cb(arg_application, arg_cfg_route, arg_data)
		}
		
		
		if ( T.isArray(arg_cfg_route.plugins) )
		{
			console.log(context + ':ROUTE FOR ASSETS IN PLUGINS MODE for ', arg_cfg_route.plugins)
			return this.get_route_plugins_cb(arg_application, arg_cfg_route, arg_data)
		}


		if ( T.isString(arg_cfg_route.redirect) )
		{
			console.log(context + ':REDIRECT ROUTE FOR ASSETS', arg_cfg_route.redirect)
			return this.get_route_redirect_cb(arg_application, arg_cfg_route, arg_data)
		}
		
		// UNKNOW SERVER TO SERVE STATIC FILES
		console.error('UNKNOW ROUTE MODE', arg_cfg_route)
		return null
	}

	
	
	/**
	 * Callback for route handling.
	 * 
	 * @param {object} arg_application - Application instance.
	 * @param {object} arg_cfg_route - plain object route configuration.
	 * @param {object} arg_data - plain object contextual datas.
	 * 
	 * @returns {function} - route handler.
	 */
	get_route_directory_cb(arg_application, arg_cfg_route/*, arg_data*/)
	{
		assert(T.isString(arg_cfg_route.directory), context + ':bad directory string')
		
		// CHECK SERVER
		if ( ! T.isObject(this.server) || ! this.server.is_server || ! this.server.is_routable_server )
		{
			console.error(context + ':get_route_directory_cb:bad routable server')
			return undefined
		}
		
		return this.server.get_middleware_for_static_route(arg_cfg_route)
	}
	
	
	
	/**
	 * Callback for route handling.
	 * @param {object} arg_application - Application instance.
	 * @param {object} arg_cfg_route - plain object route configuration.
	 * @param {object} arg_data - plain object contextual datas.
	 * @param {function} route handler.
	 */
	get_route_plugins_cb(arg_application, arg_cfg_route/*, arg_data*/)
	{
		assert(T.isArray(arg_cfg_route.plugins), context + ':bad plugins array')
		
		console.log(context + ':ROUTE FOR ASSETS IN PLUGINS MODE')
		
		const plugins_names = arg_cfg_route.plugins
		const rendering_manager = runtime.get_plugins_factory().get_rendering_manager()
		
		return (req, res/*, next*/) => {
			const asset_name_parts = req.path.split('?', 2)
			const asset_name = asset_name_parts[0]
			console.log(context + ':MIDDLEWARE: ROUTE FOR ASSETS IN PLUGINS MODE for ', asset_name, plugins_names)

			// BAD METHOD
			if (req.method !== 'GET' && req.method !== 'HEAD')
			{
				// method not allowed
				res.statusCode = 405
				res.setHeader('Allow', 'GET, HEAD')
				res.setHeader('Content-Length', '0')
				res.end()
				return
			}
			
			for(let plugin_name of plugins_names)
			{
				console.log(context + ':MIDDLEWARE: ROUTE FOR ASSETS IN PLUGINS MODE:loop on ', plugin_name)
				
				const plugin = rendering_manager.plugin(plugin_name)
				const asset_file_path = plugin.get_public_asset(asset_name)
				if (asset_file_path)
				{
					console.log(context + ':MIDDLEWARE: ROUTE FOR ASSETS IN PLUGINS MODE:found for ', plugin_name, asset_file_path)
					
					var options = {
						dotfiles: 'deny',
						headers: {
							'x-timestamp': Date.now(),
							'x-sent': true
						}
					}

					try
					{
						res.sendFile(asset_file_path, options,
							(err) => {
								if (err)
								{
									console.log(context + ':MIDDLEWARE: ROUTE FOR ASSETS IN PLUGINS MODE:error=[%s]\n plugin=[%s]\n file=[%s]', err, plugin_name, asset_file_path)
									res.status(err.status).end()
								}
								else
								{
									console.log(context + ':MIDDLEWARE: ROUTE FOR ASSETS IN PLUGINS MODE:Sent file=[%s]', asset_file_path)
								}
							}
						)
					}
					catch(err)
					{
						res.status(404)
						const error = {
							error:err,
							plugin:plugin_name,
							asset:asset_name,
							file:asset_file_path
						}
						res.type('json')
						res.send(error)
					}

					return
				}
			}
		}
	}
}
