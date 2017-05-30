// NPM IMPORTS
// import assert from 'assert'

// COMMON IMPORTS
import T               from 'devapt-core-common/dist/js/utils/types'
import ServiceProvider from 'devapt-core-common/dist/js/services/service_provider'
import ServiceResponse from 'devapt-core-common/dist/js/services/service_response'

// SERVICES IMPORTS
import ExecutableRouteAssets from './executable_route_assets'


const context = 'services/assets/assets_svc_provider'



/**
 * Assets service provider class.
 * 
 * @author Luc BORIES
 * @license Apache-2.0
 */
export default class AssetsSvcProvider extends ServiceProvider
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

		this.is_assets_svc_provider = true
		
		this.exec = new ExecutableRouteAssets()
	}



	/**
	 * Get provider operations names.
	 * @abstract
	 * 
	 * @returns {array}
	 */
	get_operations_names()
	{
		return ['list', 'get']
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
		const operands = arg_request.get_operands()

		// CHECK OPERANDS
		if ( ! T.isNotEmptyArray(operands) )
		{
			return Promise.resolve(undefined)
		}

		// OPERATION=GET
		if (operation == 'get')
		{
			const results = []
			operands.forEach(
				(asset_name)=>{
					if ( T.isNotEmptyString(asset_name) )
					{
						results.push( this.get_plugin_asset_file_path(asset_name) )
					}
				}
			)

			const response = new ServiceResponse(arg_request)
			response.set_results(results)
			return Promise.resolve(response)
		}

		return Promise.resolve(undefined)
	}



	/**
	 * Get plugin asset file path name.
	 * 
	 * @param {string} arg_asset_name - asset name to lookup for.
	 * 
	 * @returns {string|undefined} - asset file path name or undefined if not found.
	 */
	get_plugin_asset_file_path(arg_asset_name)
	{
		const arg_cfg_route = this.get_setting('routes', {})
		const plugins_names = arg_cfg_route.plugins
		const rendering_manager = this.get_runtime().get_plugins_factory().get_rendering_manager()

		for(let plugin_name of plugins_names)
		{
			// console.log('MIDDLEWARE: ROUTE FOR ASSETS IN PLUGINS MODE:loop on ', plugin_name)
			
			const plugin = rendering_manager.plugin(plugin_name)
			const asset_file_path = plugin.get_public_asset(arg_asset_name)
			if (asset_file_path)
			{
				return asset_file_path
			}
		}

		return undefined
	}
}
