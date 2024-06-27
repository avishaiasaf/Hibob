/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
/*
Name                : BOB_UE_AddCurrencies.js
Purpose             : This script will add the currencies on a customer record based on Customer Currency selected on Subsidiary Record
Created On          : 12/15/2021
Saved Searches      : NA
CHANGE REQUESTS :	: NA
 */
define(['N/record', 'N/search', 'N/runtime'],


		function(record, search, runtime) {
	function beforeSubmit(scriptContext) {

		try{

			if(scriptContext.type == 'delete')
				return;

			var customerRecord = scriptContext.newRecord;

			var primarySubsidiary = customerRecord.getValue('subsidiary');
			log.debug('primarySubsidiary',primarySubsidiary)

			if(primarySubsidiary)
			{
				var sub_lookup = search.lookupFields({
					type:'subsidiary',
					id: primarySubsidiary,
					columns: ['custrecord_hb_customer_currency']
				});


				log.debug('sub_lookup',sub_lookup)
				var currenyDefOnSub = new Array();
				if(sub_lookup.custrecord_hb_customer_currency.length >0)
				{

					for(var i = 0; i < sub_lookup.custrecord_hb_customer_currency.length; i++)
					{

						currenyDefOnSub.push(sub_lookup.custrecord_hb_customer_currency[i].value);
					}

					var custRecCurrencyCount = customerRecord.getLineCount({ sublistId: 'currency' });
					var custCurrency = new Array();
					for(var i = 0; i < custRecCurrencyCount; i++)
					{
						custCurrency.push(customerRecord.getSublistValue({sublistId: 'currency',fieldId: 'currency',line: i}));
					}
					log.debug('custCurrency',custCurrency)
					log.debug('currenyDefOnSub',currenyDefOnSub)

					var currCounter = custRecCurrencyCount;

					for(var i = 0; i < currenyDefOnSub.length; i++)
					{
						if(custCurrency.indexOf(currenyDefOnSub[i]) == '-1')
						{
							log.debug('adding currency',currenyDefOnSub[i])
							customerRecord.setSublistValue({sublistId: 'currency', fieldId: 'currency',	line: currCounter, value: currenyDefOnSub[i]});
							currCounter++;
						}
						else
							log.debug('currency already exist',currenyDefOnSub[i])

					}
				}
				else
					log.debug('No Customer Currency Defined on Subsidiary')


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
