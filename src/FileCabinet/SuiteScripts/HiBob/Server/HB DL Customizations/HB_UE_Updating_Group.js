/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */

/*******************************************************************
 * Name 		: HB UE Grouping Quantity and Amount
 * Script Type  : USER EVENT Script
 * Created On   : 
 * Script Owner : 
 * Purpose 		: This script is used to group the amounts and quantity based on item name,rate,Billing Product name.
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
			if (scriptContext.type == scriptContext.UserEventType.EDIT || scriptContext.type == scriptContext.UserEventType.CREATE){
				var newObj = scriptContext.newRecord
				var invID = newObj.id;
				var recType = newObj.type;

				var soObj = record.load({
					type: recType,
					id: invID,
					isDynamic: true,
				});
				
				var docNumber = soObj.getValue({
					fieldId: 'tranid'
				});
				
				var itemCount = soObj.getLineCount({
					sublistId: 'item'
				});
				var itemArr = [];var jsonItemObj = {};

				for(var x =0;x<itemCount;x++){
					var itemID = soObj.getSublistValue({
						sublistId: 'item',
						fieldId: 'item',
						line: x
					});
					var rate = soObj.getSublistValue({
						sublistId: 'item',
						fieldId: 'rate',
						line: x
					});
					var amount = soObj.getSublistValue({
						sublistId: 'item',
						fieldId: 'amount',
						line: x
					});
					var quantity = soObj.getSublistValue({
						sublistId: 'item',
						fieldId: 'quantity',
						line: x
					});
					var billingProductName = soObj.getSublistValue({
						sublistId: 'item',
						fieldId: 'custcol_hb_billing_product_name',
						line: x
					});


					if(itemArr.indexOf(itemID) > -1){
						if(billingProductName != null && billingProductName != undefined && billingProductName != ""){
							if(jsonItemObj[itemID].hasOwnProperty(billingProductName)){
								if(jsonItemObj[itemID][billingProductName].hasOwnProperty(rate)){

									var totalQuantity = jsonItemObj[itemID][billingProductName][rate][0];
									var totalamount = jsonItemObj[itemID][billingProductName][rate][1];


									totalQuantity   = totalQuantity+quantity;
									totalamount     = totalamount+amount;


									jsonItemObj[itemID][billingProductName][rate][0] = totalQuantity;
									jsonItemObj[itemID][billingProductName][rate][1] = totalamount;
								}else{
									jsonItemObj[itemID][billingProductName][rate] = [quantity,amount]
								}

							}else{
								jsonItemObj[itemID][billingProductName] = {};
								jsonItemObj[itemID][billingProductName][rate] = [quantity,amount]
							}
						}else{
							if(jsonItemObj[itemID].hasOwnProperty(rate)){
								var totalQuantity = jsonItemObj[itemID][rate][0]
								var totalamount    = jsonItemObj[itemID][rate][1]	

								totalQuantity = totalQuantity+quantity;
								totalamount     = totalamount+amount;


								jsonItemObj[itemID][rate][0] = totalQuantity;
								jsonItemObj[itemID][rate][1] = totalamount;
							}else{
								jsonItemObj[itemID][rate] = [quantity,amount];
							}
						}

					}else{
						itemArr.push(itemID);
						jsonItemObj[itemID] = {}
						if(billingProductName != null && billingProductName != undefined && billingProductName != ""){
							jsonItemObj[itemID][billingProductName] = {};
							jsonItemObj[itemID][billingProductName][rate] = [quantity,amount]
						}else{
							jsonItemObj[itemID][rate] = [quantity,amount];
						}

					}

				}
				log.debug("jsonItemObj ",jsonItemObj);
				var secondObj = jsonItemObj;var submitFlag = false

				if(secondObj != null && secondObj != undefined && secondObj != ""){
					for(var sk =0;sk<itemCount;sk++){
						var itemSecondTime = soObj.getSublistValue({
							sublistId: 'item',
							fieldId: 'item',
							line: sk
						});

						var rateSecondTime = soObj.getSublistValue({
							sublistId: 'item',
							fieldId: 'rate',
							line: sk
						});
						var secbillingProductName = soObj.getSublistValue({
							sublistId: 'item',
							fieldId: 'custcol_hb_billing_product_name',
							line: sk
						});



						//if(jsonItemObj[itemSecondTime][billingProductName][rateSecondTime][2] == true){

						//}else{
						if(secondObj.hasOwnProperty(itemSecondTime)){
							if(secbillingProductName != null && secbillingProductName != undefined && secbillingProductName != ""){
								if(secondObj[itemSecondTime][secbillingProductName][rateSecondTime][2] == true){
									
								}
								else if(secondObj[itemSecondTime].hasOwnProperty(secbillingProductName)){
									submitFlag = true;
									
									var subListObj = soObj.selectLine({
									    sublistId: 'item',
									    line: sk
									});

									soObj.setCurrentSublistValue({sublistId: 'item',fieldId: 'custcol_hb_grouping_values',value:true,ignoreFieldChange: true});
									soObj.setCurrentSublistValue({sublistId: 'item',fieldId: 'custcol_hb_total_group_quantity',value:secondObj[itemSecondTime][secbillingProductName][rateSecondTime][0],ignoreFieldChange: true});
									soObj.setCurrentSublistValue({sublistId: 'item',fieldId: 'custcol_hb_total_amount_group',value:secondObj[itemSecondTime][secbillingProductName][rateSecondTime][1],ignoreFieldChange: true});
									soObj.commitLine({sublistId: 'item'});
									
									
									secondObj[itemSecondTime][secbillingProductName][rateSecondTime][2] = true;
									//log.debug("In Billing Product",sk)
								}
								
							}else{
								if(secondObj[itemSecondTime][rateSecondTime][2] == true){

								}else{
									if(secondObj[itemSecondTime].hasOwnProperty(rateSecondTime)){
										submitFlag = true;
										var subListObj = soObj.selectLine({
										    sublistId: 'item',
										    line: sk
										});

										soObj.setCurrentSublistValue({sublistId: 'item',fieldId: 'custcol_hb_grouping_values',value:true,ignoreFieldChange: true});
										soObj.setCurrentSublistValue({sublistId: 'item',fieldId: 'custcol_hb_total_group_quantity',value:secondObj[itemSecondTime][rateSecondTime][0],ignoreFieldChange: true});
										soObj.setCurrentSublistValue({sublistId: 'item',fieldId: 'custcol_hb_total_amount_group',value:secondObj[itemSecondTime][rateSecondTime][1],ignoreFieldChange: true});
										soObj.commitLine({sublistId: 'item'});
										
										secondObj[itemSecondTime][rateSecondTime][2] = true;
										//log.debug("In rate",sk)
									}

								}

							}
						}


						//}


					}
					if(submitFlag == true){

						soObj.setValue({
							fieldId: 'custbody_hb_grouping_logic_on_so',
							value: true,
							ignoreFieldChange: true
						});


						var recordId = soObj.save({
							enableSourcing: true,
							ignoreMandatoryFields: true
						});
						log.debug("Submitted recordId ",recordId);
					}
				}
				log.debug("secondObj second time - ",secondObj);
			}

		}catch(er){
			log.error("Error while grouping amount and quantity based on item,rate,billing product name on SO -"+docNumber+'due to - ',er.message);
		}
	}

	return {

		afterSubmit: afterSubmit
	};

});
