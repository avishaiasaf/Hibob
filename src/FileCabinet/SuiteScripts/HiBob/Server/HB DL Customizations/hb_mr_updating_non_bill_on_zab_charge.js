/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search','N/runtime'],
		/**
		 * @param {record} record
		 * @param {search} search
		 */
		function(record, search,runtime) {

	/**
	 * Marks the beginning of the Map/Reduce process and generates input data.
	 *
	 * @typedef {Object} ObjectRef
	 * @property {number} id - Internal ID of the record instance
	 * @property {string} type - Record type id
	 *
	 * @return {Array|Object|Search|RecordRef} inputSummary
	 * @since 2015.1
	 */
	function getInputData() {
		try {
			var currentScript = runtime.getCurrentScript();

			return search.load({
				id: 'customsearch_hb_dm_zab_charge_script_use'
			});
		}
		catch (e) {
			log.error('error',e)
		}
	}
	/**
	 * Executes when the map entry point is triggered and applies to each key/value pair.
	 *
	 * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
	 * @since 2015.1
	 */
	function map(context) {
		try {
			var currentScript = runtime.getCurrentScript();
			var chargeStatus = currentScript.getParameter({name:'custscript_hb_zab_charge_status'})

			log.debug('chargeStatus',chargeStatus)

			var chargeID = context.key;
			log.debug('chargeID :: ',chargeID);
			if(chargeStatus != null && chargeStatus != "" && chargeStatus != undefined){

				var subChargeID = record.submitFields({
					type: 'customrecordzab_charge',
					id: chargeID,
					values: {custrecordzab_c_status:chargeStatus}
				});
				log.debug('subChargeID :: ',subChargeID);
			}
		}
		catch (er) {
			log.error('error while updating charge status for DM',er.message);
		}
	}

	/**
	 * Executes when the reduce entry point is triggered and applies to each group.
	 *
	 * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
	 * @since 2015.1
	 */
	function reduce(context) {

	}


	/**
	 * Executes when the summarize entry point is triggered and applies to the result set.
	 *
	 * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
	 * @since 2015.1
	 */
	function summarize(summary) {

	}

	return {
		getInputData: getInputData,
		map: map,
		//reduce: reduce,
		//summarize: summarize
	};

});
