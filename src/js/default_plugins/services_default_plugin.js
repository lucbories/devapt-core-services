// NPM IMPORTS
import assert from 'assert'
import _      from 'lodash'

// SERVER IMPORTS
import T               from 'devapt-core-common/dist/js/utils/types'
import ServicesPlugin  from 'devapt-core-common/dist/js/plugins/services_plugin'
import Service         from 'devapt-core-common/dist/js/services/service'
import ServiceProvider from 'devapt-core-common/dist/js/services/service_provider'
import ServiceConsumer from 'devapt-core-common/dist/js/services/service_consumer_by_url'


/**
 * Default plugins name/class path map.
 * @private
 * @type {object}
 */
const default_plugins_map = {
	'ping_svc':{
		'provider':'devapt-core-services/dist/js/services/ping/ping_svc_provider'
	},
	'html_assets_svc':{
		'provider':'devapt-core-services/dist/js/services/assets/assets_svc_provider'
	},
	'logs_svc':{
		'provider':'devapt-core-services/dist/js/services/logs/logs_svc_provider'
	},
	'topology_svc':{
		'provider':'devapt-core-services/dist/js/services/topology/topology_svc_provider'
	},
	'messages_svc':{
		'provider':'devapt-core-services/dist/js/services/messages/messages_svc_provider'
	},
	'resources_svc':{
		'provider':'devapt-core-services/dist/js/services/resources/resources_svc_provider'
	},
	'metrics_svc':{
		'provider':'devapt-core-services/dist/js/services/metrics/metrics_svc_provider'
	},
	'middlewares_svc':{
		'provider':'devapt-core-services/dist/js/services/middlewares/middlewares_svc_provider'
	}
}
// 'rest_api_models_query':    'devapt-core-services/dist/js/services/crud/crud_service',
// 'rest_api_models_modifier': 'devapt-core-services/dist/js/services/crud/crud_service',
// 'rest_api_resources_query': 'devapt-core-services/dist/js/services/resource/resources_service',
// 'security':                 'devapt-core-services/dist/js/services/security/security_service'

/**
 * Contextual constant for this file logs.
 * @private
 */
const context = 'services/default_plugins/services_default_plugin'



/**
 * Plugin class for default services.
 * @author Luc BORIES
 * @license Apache-2.0
 */
export default class DefaultServicesPlugin extends ServicesPlugin
{
	/**
     * Create a DefaultServicesPlugin instance.
	 * 
	 * @param {RuntimeBase} arg_runtime - runtime instance.
	 * @param {PluginsManager} arg_manager - plugins manager.
	 * 
	 * @returns {nothing}
     */
	constructor(arg_runtime, arg_manager)
	{
		assert( T.isObject(arg_runtime) && arg_runtime.is_base_runtime, context + ':constructor:bad runtime instance' )
		assert( T.isObject(arg_manager), context + ':constructor:bad plugins manager instance' )

		super(arg_runtime, arg_manager, 'DefaultServices', '1.0.0')

		/**
		 * Services classes.
		 * @private
		 * @type {object}
		 */
		this._services_classes = {}

		// FILL SERVICES CLASSES
		_.forEach(
			default_plugins_map,
			(value, svc_name)=>{
				console.log('service [' + svc_name + '] configuration=', value)

				// TEMPORARY DEFAULT CLASSES
				let provider_class = ServiceProvider
				let consumer_class = ServiceConsumer
				let service_class  = Service
				
				// GET SERVICE CLASS
				if ( T.isClass(value) )
				{
					service_class = value
				}

				// GET SERVICE CLASS FILE
				if ( T.isString(value) )
				{
					service_class = this.load_feature_class(value)
				}

				// GET SERVICE CONFIGURATION
				if ( T.isObject(value) )
				{
					// GET SERVICE PROVIDER CLASS FILE
					if ( T.isString(value.provider) )
					{
						console.log('service [' + svc_name + '] configuration:value.provider', value.provider)
						provider_class = this.load_feature_class(value.provider)
					}

					// GET SERVICE CONSUMER CLASS FILE
					if ( T.isString(value.consumer) )
					{
						console.log('service [' + svc_name + '] configuration:value.consumer', value.consumer)
						consumer_class = this.load_feature_class(value.consumer)
					}

					// GET SERVICE CLASS FILE
					if ( T.isString(value.service) )
					{
						console.log('service [' + svc_name + '] configuration:value.service', value.service)
						service_class = this.load_feature_class(value.service)
					}
				}

				// CHECK SERVICES CLASSES
				if ( ! T.isClass(service_class) || ! T.isClass(provider_class) || ! T.isClass(consumer_class) )
				{
					console.log('service [' + svc_name + '] service_class', service_class)
					console.log('service [' + svc_name + '] provider_class', provider_class)
					console.log('service [' + svc_name + '] consumer_class', consumer_class)
					console.error(context + ':constructor:bad classes for service=' + svc_name)
					return
				}

				// REGISTER SERVICES CLASSES
				console.log(context + ':constructor:register classes for service=' + svc_name)
				this._services_classes[svc_name] = {
					service:service_class,
					provider:provider_class,
					consumer:consumer_class
				}
			}
		)
	}
	


	/**
     * Test if a feature class is known into self contained plugins.
	 * 
     * @param {string} arg_class_name - feature class name.
	 * 
     * @returns {boolean} feature class found or not.
     */
	has(arg_class_name)
	{
		return (arg_class_name in this._services_classes)
	}
	
	
    
	/**
     * Create a component instance.
	 * 
     * @param {string} arg_class_name - type or class feature name.
     * @param {string} arg_name - feature name.
     * @param {object} arg_settings - feature settings plain object.
     * @param {object} arg_state - feature initial state plain object (optional).
	 * 
     * @returns {object} feature instance.
     */
	create(arg_class_name, arg_name, arg_settings, arg_state)
	{
		assert( T.isString(arg_class_name), context + ':bad class string')
		assert( T.isString(arg_name), context + ':bad name string')
		assert( T.isObject(arg_settings), context + ':bad settings object')
		
		const found = (arg_class_name in this._services_classes)
		assert( found, context + ':create:feature name not found')
		
		const service_classes = this._services_classes[arg_class_name]

		if ( T.isFunction(arg_settings.has) )
		{
			arg_settings = arg_settings.set('provider_class', service_classes.provider)
			arg_settings = arg_settings.set('consumer_class', service_classes.consumer)
		} else {
			arg_settings.provider_class = service_classes.provider
			arg_settings.consumer_class = service_classes.consumer
		}
		
		return super.create(arg_class_name, arg_name, arg_settings, arg_state)
	}



	/**
     * Get a feature class.
	 * 
     * @param {string} arg_class_name - feature class name.
	 * 
     * @returns {object} feature class.
     */
	get_feature_class(arg_class_name)
	{
		assert( T.isString(arg_class_name), context + ':create:bad name string')
		
		const found = (arg_class_name in this._services_classes)
		assert( found, context + ':create:feature name not found')
		
		const service_classes = this._services_classes[arg_class_name]
		
		return service_classes.service
	}
}
