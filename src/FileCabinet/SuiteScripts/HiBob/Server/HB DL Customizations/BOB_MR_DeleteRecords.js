/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */

define(['N/search', 'N/runtime', 'N/record'],

		function (search, runtime, record) {

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

		var toDelRecSearch = runtime.getCurrentScript().getParameter('custscript_hb_searchid');

		var searchObj = search.load({
			id: toDelRecSearch
		})

		return searchObj;
	}

	/**
	 * Executes when the map entry point is triggered and applies to each key/value pair.
	 *
	 * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
	 * @since 2015.1
	 */
	function map(context) {

		try {
			var searchResult = JSON.parse(context.value);
			var recId = searchResult.id;
			var recType = searchResult.recordType;
			log.debug('record values',recId + ' : ' + recType);


			record.delete({                 
				type: recType,
				id: recId,
			});

		} catch (e) {
			log.debug('Error Deleting ' + recId, e);
		}
	}

	return {
		getInputData: getInputData,
		map: map
	};

});
