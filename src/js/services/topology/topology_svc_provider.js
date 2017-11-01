// NPM IMPORTS
import assert from 'assert'

// COMMON IMPORTS
import T               from 'devapt-core-common/dist/js/utils/types'
import ServiceProvider from 'devapt-core-common/dist/js/services/service_provider'
import ServiceResponse from 'devapt-core-common/dist/js/services/service_response'

// SERVICES IMPORTS


/**
 * Contextual constant for this file logs.
 * @private
 */
const context = 'services/topology/topology_svc_provider'

/**
 * Operation name.
 * @private
 */
const GET_TENANTS_NAMES ='devapt-deployed-tenants-names'
/**
 * Operation name.
 * @private
 */
const GET_TENANTS_INFOS ='devapt-deployed-tenants-infos'
/**
 * Operation name.
 * @private
 */
const GET_TENANT_INFOS = 'devapt-deployed-tenant-infos'

/**
 * Operation name.
 * @private
 */
const GET_TENANT_APPLICATIONS_NAMES = 'devapt-deployed-applications-names'
/**
 * Operation name.
 * @private
 */
const GET_TENANT_APPLICATIONS_INFOS = 'devapt-deployed-applications-infos'
/**
 * Operation name.
 * @private
 */
const GET_TENANT_APPLICATION_INFOS = 'devapt-deployed-application-infos'

/**
 * Operation name.
 * @private
 */
const GET_TENANT_SERVICES_NAMES = 'devapt-deployed-services-names'
/**
 * Operation name.
 * @private
 */
const GET_TENANT_SERVICES_INFOS = 'devapt-deployed-services-infos'
/**
 * Operation name.
 * @private
 */
const GET_TENANT_SERVICE_INFOS = 'devapt-deployed-service-infos'

/**
 * Operation name.
 * @private
 */
const GET_NODES_NAMES = 'devapt-deployed-nodes'



/**
 * Topology service provider class.
 * @author Luc BORIES
 * @license Apache-2.0
 */
export default class TopologySvcProvider extends ServiceProvider
{
	/**
	 * Create a topology service provider.
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
		this.is_topology_svc_provider = true
	}



	/**
	 * Get provider operations names.
	 * 
	 * @returns {array} - operations names.
	 */
	get_operations_names()
	{
		return [
			GET_TENANTS_NAMES, GET_TENANTS_INFOS, GET_TENANT_INFOS,
			GET_TENANT_APPLICATIONS_NAMES, GET_TENANT_APPLICATIONS_INFOS, GET_TENANT_APPLICATION_INFOS,
			GET_TENANT_SERVICES_NAMES, GET_TENANT_SERVICES_INFOS, GET_TENANT_SERVICE_INFOS,
			GET_NODES_NAMES
		]
		//.concat(super.get_operations_names())
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
			this.leave_group('produce:error:bad request object')
			return Promise.resolve({error:'bad request object'})
		}

		const operation = arg_request.get_operation()
		console.log(context + ':produce:request for service=' + this.service.get_name() + ':operation=' + operation, 'operands=', arg_request.get_operands())

		const deployed_topology = this.get_runtime().get_deployed_topology()
		const operand_0 = arg_request.get_operand(0)
		const operand_1 = arg_request.get_operand(1)
		const tenant_name = T.isNotEmptyString(operand_0) ? operand_0 : undefined
		const item_name = T.isNotEmptyString(operand_1) ? operand_1 : undefined

		console.log(context + ':produce:request for service=[%s] operation=[%s] tenant=[%s] item=[%s]', this.service.get_name(), operation, tenant_name, item_name)
		const response = new ServiceResponse(arg_request)
		let results = []
		switch(operation){
			case GET_TENANTS_NAMES:
				results = deployed_topology.get_deployed_tenants_names()
				break
			case GET_TENANTS_INFOS:
				results = deployed_topology.get_deployed_tenants_infos(true)
				break
			case GET_TENANT_INFOS:
				results = tenant_name ? deployed_topology.get_deployed_tenant_infos(tenant_name, true) : []
				break
			
			case GET_TENANT_APPLICATIONS_NAMES:
				results = tenant_name ? deployed_topology.get_deployed_tenant_applications_names(tenant_name) : []
				break
			case GET_TENANT_APPLICATIONS_INFOS:
				results = tenant_name ? deployed_topology.get_deployed_tenant_applications_infos(tenant_name, true) : []
				break
			case GET_TENANT_APPLICATION_INFOS:
				results = tenant_name && item_name ? deployed_topology.get_deployed_tenant_application_infos(tenant_name, item_name, true) : []
				break
			
			case GET_TENANT_SERVICES_NAMES:
				results = tenant_name ? deployed_topology.get_deployed_tenant_services_names(tenant_name) : []
				break
			case GET_TENANT_SERVICES_INFOS:
				results = tenant_name ? deployed_topology.get_deployed_tenant_services_infos(tenant_name, true) : []
				break
			case GET_TENANT_SERVICE_INFOS:
				results = tenant_name && item_name ? deployed_topology.get_deployed_tenant_service_infos(tenant_name, item_name, true) : []
				break

			case GET_NODES_NAMES:
				results = deployed_topology.get_deployed_nodes_names()
				break

			default:
				response.set_has_error(true)
				response.set_error('produce:error:bad operation [' + operation + ']')
				
				this.leave_group('produce:error:bad operation [' + operation + ']')
				return Promise.resolve(response)
		}
		if (! results)
		{
			response.set_has_error(true)
			response.set_error('produce:error:operation failure [' + operation + '], check tenant_name=' + tenant_name + ' or item name=' + item_name)

			this.leave_group('produce:error:operation failure [' + operation + '], check tenant_name=' + tenant_name + ' or item name=' + item_name)
			return Promise.resolve(response)

			// this.leave_group('produce:super.')
			// return super.produce(arg_request)
		}
		response.set_results(results)

		// console.log(context + ':produce:reply for service=' + this.service.get_name() + ':operation=' + operation, response.get_properties_values())
		
		this.leave_group('produce')
		return Promise.resolve(response)
	}


	/**
	 * Get deployed nodes.
	 * 
	 * @returns {array}
	 */
	get_deployed_nodes_topology()
	{
		let topology = { nodes:{} }

		// LOOP ON DEFINED NODES
		const nodes = this.get_runtime().get_defined_topology().nodes().get_latest_items()
		assert( T.isArray(nodes), context + ':get_deployed_nodes_topology:bad runtime.nodes array')
		nodes.forEach(
			(node) => {
				topology.nodes[node.get_name()] = this.get_deployed_node_topology(node)
			}
		)

		return topology.nodes
	}



	/**
	 * Get deployed topology for a node.
	 * 
	 * @param {TopologyDeployedNode} arg_deployed_node - deployed node.
	 * 
	 * @returns {object} - deployed node topology plain object.
	 */
	get_deployed_node_topology(arg_deployed_node)
	{
		const node_topology = {
			name:arg_deployed_node.get_name(),
			servers:{}
		}

		// LOOP ON NODE SERVERS
		const node_servers = arg_deployed_node.servers().get_latest_items()
		assert( T.isArray(node_servers), context + ':get_deployed_node_topology:bad node.servers array')
		node_servers.forEach(
			(server) => {
				node_topology.servers[server.get_name()] = this.get_deployed_server(server)
			}
		)
		
		return node_topology
	}



	/**
	 * Get deployed topology for a server.
	 * 
	 * @param {TopologyDeployedServer} arg_deployed_server - deployed server.
	 * 
	 * @returns {object} - deployed server topology plain object.
	 */
	get_deployed_server_topology(arg_deployed_server)
	{
		const server_topology = {
			host:arg_deployed_server.server_host,
			port:arg_deployed_server.server_port,
			protocole:arg_deployed_server.server_protocole,
			type:arg_deployed_server.server_type,
			middlewares:arg_deployed_server.server_middlewares,
			use_socketio:arg_deployed_server.server_use_socketio
		}
		
		return server_topology
	}



	/**
	 * Get deployed tenants topology.
	 * 
	 * @returns {object} - deployed tenants topology plain object.
	 */
	get_deployed_tenants_topology()
	{
		const tenants_topology = {
		}
		
		return tenants_topology
	}



	/**
	 * Get deployed tenants topology.
	 * 
	 * @returns {object} - deployed tenant topology plain object.
	 */
	get_deployed_tenant_topology(arg_tenant_name)
	{
		const tenant_topology = {
		}
		
		return tenant_topology
	}



	/**
	 * Get deployed tenants topology.
	 * 
	 * @returns {object} - deployed tenant topology plain object.
	 */
	get_deployed_application_topology(arg_tenant_name)
	{
		const tenant_topology = {
		}
		
		return tenant_topology
	}
}
