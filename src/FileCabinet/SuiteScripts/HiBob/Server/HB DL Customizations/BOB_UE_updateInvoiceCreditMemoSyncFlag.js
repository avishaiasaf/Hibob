/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
/*
Name                : BOB_UE_updateInvoiceCreditMemoSyncFlag.js
Purpose             : This script will update Sync Successfully flag on Invoice and Credit Memo 
Created On          : 12/15/2021
Saved Searches      : NA
CHANGE REQUESTS :	: NA
 */
define(['N/record', 'N/search', 'N/runtime','./BOB_lib_constants','/.bundle/328420/Log_Handler.js'],

		function(record, search, runtime,constants,errorHandler) {
	/***************/
	var currentScript = runtime.getCurrentScript();
	var REC_CONSTANT = {
			SCRIPT_PARAM:{
				LOG_FLAG: 'custscript_bob_log_flag',
				FRICEW_ID: 'custscript_bob_fricew_id',
				EXECUTION_ID: 'custscript_bob_execution_id',
			},
	};
	/***************/

	function updateInvoiceOrCreditMemo(rec,sublist)
	{
		/***************/
		var logObjectInput = errorHandler.Start(REC_CONSTANT.SCRIPT_PARAM.LOG_FLAG,
				REC_CONSTANT.SCRIPT_PARAM.FRICEW_ID, REC_CONSTANT.SCRIPT_PARAM.EXECUTION_ID,
				'', '', false);
		/***************/

		var lineCount = rec.getLineCount({
			sublistId: sublist
		});
		for (var i = 0; i < lineCount; i++) {

			var tranType = rec.getSublistValue({ sublistId: sublist, fieldId: 'trantype', line: i });
			var apply = rec.getSublistValue({ sublistId: sublist, fieldId: 'apply', line: i });

			log.debug('params', tranType + ' : ' + apply)

			if ((tranType == 'CustInvc' || tranType == 'CustCred') && apply) {

				var recordId = rec.getSublistValue({ sublistId: sublist, fieldId: 'internalid', line: i });

				try {

					if(tranType == 'CustInvc')
						tranType = 'invoice';
					else
						tranType = 'creditmemo';

					log.debug('updating '+tranType, recordId)
					var recordId = record.submitFields({
						type: tranType,
						id: recordId,
						values: {
							custbody_hb_db_sync_success: constants.integrationStatus.Ready
						}
					});
				} catch (e) {
					log.error('error',e)
					/***************/
					errorHandler.Error(logObjectInput, 'afterSubmit', tranType, recordId, e,	null, null, true);
					errorHandler.End(logObjectInput, false);
					/***************/

				}
			}
		}


	}
	function afterSubmit(scriptContext) {
		try{

			if(scriptContext.type == 'delete')
				return;

			if(runtime.getCurrentUser().id != constants.boomi_user)
			{
				var rec = scriptContext.newRecord;

				updateInvoiceOrCreditMemo(rec,'apply')
				updateInvoiceOrCreditMemo(rec,'credit')
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
