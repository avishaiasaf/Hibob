/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */

/*******************************************************************
 * Name 		: HB UE Updating Tax Item For Texas
 * Script Type  : USER EVENT Script
 * Created On   : 
 * Script Owner : 
 * Purpose 		: This script is used to add 20%  discount item for texas state.
 ********************************************************************/


define(['N/record', 'N/search','N/runtime'],
		/**
		 * @param {record} record
		 * @param {search} search
		 */
		function(record, search,runtime) {


	/**
	 * Function definition to be triggered before record is loaded.
	 *
	 * @param {Object} scriptContext
	 * @param {Record} scriptContext.newRecord - New record
	 * @param {Record} scriptContext.oldRecord - Old record
	 * @param {string} scriptContext.type - Trigger type
	 * @Since 2015.2
	 */
	function afterSubmit(scriptContext) {
		try{
			if (scriptContext.type == scriptContext.UserEventType.CREATE){

				var newObj = scriptContext.newRecord
				var invID = newObj.id;
				var recType = newObj.type;
				
				
				var scriptObj 		= runtime.getCurrentScript();
				var taxRateLookup 	= scriptObj.getParameter({name:'custscript_hb_tax_rate'});
				var itemID          = scriptObj.getParameter({name:'custscript_hb_tax_item_code'});
				var taxCode         = scriptObj.getParameter({name:'custscript_hb_tax_code'});
				
				
				var taxRate = Number((taxRateLookup).replace('%', ''))/100;

				//log.debug("taxRate ",taxRate);
				var invObj = record.load({
					type: recType,
					id: invID,
					isDynamic: true,
				});
				//log.debug("invObj :",invObj);
				
				var docNumber = invObj.getValue({
					fieldId: 'tranid'
				});
				
				var shipSubRec= invObj.getSubrecord({
					fieldId: 'shippingaddress'
				});

				var shipState = shipSubRec.getValue({
					fieldId: 'state'
				});
				log.debug("shipState ",shipState);

				//IF THE SHIP STATE IS TEXAS,ADDING NEGATIVE AMOUNT LINE BY CALCUALTING 20% DISCOUNT TO THE TAX AMOUNT	
				if(shipState == "TX"){
					var taxTotalAmount = invObj.getValue({
						fieldId: 'taxtotal'
					});	
					log.debug("taxTotalAmount ",taxTotalAmount);

					if(taxTotalAmount > 0){
						
						
						var taxAmount = taxRate * taxTotalAmount;
						//log.debug("taxAmount ",taxAmount);
						var lineCount = "";

						var subListObj = invObj.selectNewLine({sublistId:'item'});
						invObj.setCurrentSublistValue({sublistId: 'item',fieldId: 'item',value:itemID,ignoreFieldChange: true});
						invObj.setCurrentSublistValue({sublistId: 'item',fieldId: 'amount',value:Number(-taxAmount),ignoreFieldChange: true});
						invObj.setCurrentSublistValue({sublistId: 'item',fieldId: 'taxcode',value:taxCode,ignoreFieldChange: true});
						invObj.commitLine({sublistId: 'item'});

						var recordId = invObj.save({
							enableSourcing: true,
							ignoreMandatoryFields: true
						});
						log.debug("Submitted recordId ",recordId);
					}
				}
			}

		}catch(er){
			log.error("Error while adding discount to the tax for SO - "+docNumber+' due to - ',er.message);
		}
	}

	return {

		afterSubmit: afterSubmit
	};

});