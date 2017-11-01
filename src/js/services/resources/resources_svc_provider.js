// NPM IMPORTS
import {format} from 'util'

// COMMON IMPORTS
import T                  from 'devapt-core-common/dist/js/utils/types'
import ServiceProvider    from 'devapt-core-common/dist/js/services/service_provider'
import ServiceResponse    from 'devapt-core-common/dist/js/services/service_response'

// SERVICES IMPORTS
import ExecutableRouteResources from './executable_route_get_resource'


/**
 * Contextual constant for this file logs.
 * @private
 */
const context = 'services/resources/resources_svc_provider'



/**
 * Resources service provider class.
 * 
 * @author Luc BORIES
 * @license Apache-2.0
 * 
 */
export default class ResourcesSvcProvider extends ServiceProvider
{
	/**
	 * Create a resources gateway service provider.
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

		/**
		 * Class test flag.
		 * @type {boolean}
		 */
		this.is_resources_svc_provider = true
		
		/**
		 * Service executable instance.
		 * @type {Executable}
		 */
		this.exec = new ExecutableRouteResources(this)
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
			'devapt-res-get', 'devapt-res-list'
		]
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

		// GET TENANT NAME
		const tenant_name = T.isObject(credentials) ? credentials.tenant : undefined
		const check_tenant_name = T.isNotEmptyString(tenant_name)
		if (! check_tenant_name)
		{
			this.fill_error(response, operands, 'bad credentials tenant name', tenant_name, application_name, undefined, undefined)
			return Promise.resolve(response)
		}

		// GET APPLICATION NAME
		const application_name = T.isObject(credentials) ? credentials.application : undefined
		this.debug('application_name', application_name)
		// console.log('application_name', application_name)
		const check_app_name = T.isNotEmptyString(application_name)
		if (! check_app_name)
		{
			this.fill_error(response, operands, 'bad credentials application name', tenant_name, application_name, undefined, undefined)
			return Promise.resolve(response)
		}
		
		// DEBUG
		// this.debug('tenant_name', tenant_name)
		// console.log('tenant_name', tenant_name)
		console.log(context + ':produce:request for operation=%s tenant=%s and app=%s', operation, tenant_name, application_name)

		// GET DEFINED TENANT
		const defined_tenant = this.get_runtime().defined_world_topology.tenant(tenant_name)
		const check_tenant = T.isObject(defined_tenant) && defined_tenant.is_topology_define_tenant
		if (! check_tenant)
		{
			this.fill_error(response, operands, 'bad credentials tenant object', tenant_name, application_name, undefined, undefined)
			return Promise.resolve(response)
		}

		// GET DEFINED APPLICATION
		const application = defined_tenant.application(application_name)
		const check_app = T.isObject(application) && application.is_topology_define_application
		if (! check_app)
		{
			this.fill_error(response, operands, 'bad credentials application object', tenant_name, application_name, undefined, undefined)
			return Promise.resolve(response)
		}

		// GET COLLECTION NAME
		const opd_1 = T.isNotEmptyArray(operands) ? operands[0] : ( T.isObject(operands) ? operands.collection : undefined)
		const collection = T.isNotEmptyString(opd_1) ? opd_1 : undefined
		if (! collection)
		{
			this.fill_error(response, operands, 'bad collection name', tenant_name, application_name, undefined, undefined)
			return Promise.resolve(response)
		}

		// OPERATION: LIST ALL APPLICATION RESOURCES
		if (operation == 'devapt-res-list')
		{
			const res_list = application.get_resources_names(collection)
			const results = [ { resources_names:res_list } ]

			response.set_results(results)

			this.leave_group( format('produce:service[%s] operation[%s] resources count[%n]', response.get_service(), operation, res_list.length) )
			return Promise.resolve(response)
		}

		// GET RESOURCE NAME
		const opd_2 = T.isNotEmptyArray(operands) ? operands[1] : ( T.isObject(operands) ? operands.resource : undefined)
		const res_name = T.isNotEmptyString(opd_2) ? opd_2 : undefined
		if (! res_name)
		{
			this.fill_error(response, operands, 'bad resource name', tenant_name, application_name, collection, undefined)
			return Promise.resolve(response)
		}
		
		// OPERATION: GET RESOURCES
		if (operation == 'devapt-res-get')
		{
			const type = (collection && collection != '*') ? collection : undefined
			const resource_instance = application.find_resource(res_name, type)

			if (! T.isObject(resource_instance) )
			{
				this.fill_error(response, operands, 'resource not found', tenant_name, application_name, collection, res_name)
				return Promise.resolve(response)
			}

			if (collection !== '*' && (resource_instance.topology_type != collection) )
			{
				this.fill_error(response, operands, 'resource found but bad collection', tenant_name, application_name, collection, res_name)
				return Promise.resolve(response)
			}
			
			const res_settings = this.get_resource_json(resource_instance)
			const results = [res_settings]
			if (res_settings.error)
			{
				this.fill_error(response, operands, res_settings.error, tenant_name, application_name, collection, res_name)
				return Promise.resolve(response)
			}

			response.set_results(results)
			this.leave_group( format('produce:service[%s] operation[%s] resources count[%n]', response.get_service(), operation, results.length) )
			return Promise.resolve(response)
		}
			
		this.fill_error(response, operands, 'bad operation', tenant_name, application_name, collection, res_name)
		return Promise.resolve(response)

		// this.leave_group('produce:super.')
		// return super.produce(arg_request)
	}



	/**
	 * Populate a response with error message.
	 * 
	 * @param {ServiceResponse} arg_response - response instance.
	 * @param {array} arg_operands     - request operands.
	 * @param {string} arg_error       - error text.
	 * @param {string} arg_tenant      - tenant name.
	 * @param {string} arg_application - application name.
	 * @param {string} arg_collection  - collection name.
	 * @param {string} arg_resource    - resource name.
	 * 
	 * @returns {nothing}
	 */
	fill_error(arg_response, arg_operands, arg_error, arg_tenant='N/A', arg_application='N/A', arg_collection='N/A', arg_resource='N/A')
	{
		const op = arg_response.get_operation()
		const svc = arg_response.get_service()
		const error_msg = format('produce:error=[%s] with svc=[%s] operation=[%s] tenant=[%s] app=[%s] collection=[%s] resource=[%s].', arg_error, svc, op, arg_tenant, arg_application, arg_collection, arg_resource)
		
		arg_response.set_has_error(true)
		arg_response.set_error(error_msg)
		arg_response.set_results(arg_operands)
		
		this.leave_group(error_msg)
	}
	


	/**
	 * Get resource settings.
	 * 
	 * @param {Instance} arg_resource - resource instance.
	 * 
	 * @returns {object}
	 */
	get_resource_json(arg_resource)
	{
		// WRAP INCLUDED FILE
		if ( arg_resource.has_setting('include_file_path_name') )
		{
			self.debug('Process resource.include_file_path_name [%s]', arg_resource.include_file_path_name)
			
			const file_path = arg_resource.get_setting('include_file_path_name')
			if ( T.isString(file_path) )
			{
				try
				{
					const file_content = self.include_file(self, arg_resource, file_path)
					arg_resource.set_setting('include_file_content', file_content)
				}
				catch(e)
				{
					const error_msg = 'an error occures when loading file [' + e.toString() + ']'
					arg_resource.set_setting('include_file_content', error_msg)
					
					console.error(context, error_msg)

					return { error:error_msg }
				}
			}
		}
		
		return arg_resource.export_settings()
	}
}
