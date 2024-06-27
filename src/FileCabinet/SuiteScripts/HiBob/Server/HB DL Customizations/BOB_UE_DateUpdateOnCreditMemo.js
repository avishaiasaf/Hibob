/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */

define(['N/record', 'N/search','N/format'],

		function(record, search,format) {
	function beforeSubmit(scriptContext) {

		try{
			if(scriptContext.type == 'create')
			{

				var invoice_rec =  scriptContext.newRecord;

				var subscription = invoice_rec.getValue('custbody_hb_zab_subscription')

				if(subscription)
				{

					var searchPeriod = search.load({
						id:"customsearch_hb_period_based_on_today"
					});
					var searchResultPeriod = searchPeriod.run().getRange({
						start: 0,
						end: 1
					});
					log.debug('searchResultPeriod length', searchResultPeriod.length)

					if(searchResultPeriod)
						for(var i = 0; i < searchResultPeriod.length; i++)
						{
							log.debug('trandate', format.parse({ value:searchResultPeriod[i].getValue('formuladate'), type: format.Type.DATE }))
							log.debug('posting period', searchResultPeriod[i].id)

							invoice_rec.setValue('trandate',format.parse({ value:searchResultPeriod[i].getValue('formuladate'), type: format.Type.DATE }))
							invoice_rec.setValue('postingperiod',searchResultPeriod[i].id)
						}

				}

			}
		}
		catch(e)
		{
			log.error('error',e)
		}
	}
	return {
		beforeSubmit: beforeSubmit
	};

});
