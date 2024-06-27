/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record'],

		function(record) {
	function afterSubmit(scriptContext) {
		try{
			if(scriptContext.type == 'delete')
				return;

			log.debug(scriptContext.newRecord.type,scriptContext.newRecord.id)
			var currentRecord = record.load({type: scriptContext.newRecord.type,
				id: scriptContext.newRecord.id,
				isDynamic: false});

			var charge_QTY = currentRecord.getValue('custrecordzab_c_quantity');
			var new_QTY = currentRecord.getValue('custrecord_hb_new_quantity_for_proration');
			var initiate_prorate = currentRecord.getValue('custrecord_hb_initiate_proration')
			var prorate_happened = currentRecord.getValue('custrecord_hb_proration_occured')

			log.debug('charge_QTY',charge_QTY)
			log.debug('new_QTY',new_QTY)
			log.debug('initiate_prorate',initiate_prorate)

			if(charge_QTY != '0' && initiate_prorate == 'TRUE' && new_QTY != charge_QTY && !prorate_happened)
			{

				log.debug('update the values')
				currentRecord.setValue('custrecordzab_c_quantity',new_QTY);
				currentRecord.setValue('custrecordzab_c_amount',currentRecord.getValue('custrecordzab_c_rate')*new_QTY);
				currentRecord.setValue('custrecord_hb_proration_occured',true);

				currentRecord.save();

			}

		}
		catch(e)
		{
			log.error('error',e)
		}
	}
	return {
		afterSubmit: afterSubmit

	};

});
