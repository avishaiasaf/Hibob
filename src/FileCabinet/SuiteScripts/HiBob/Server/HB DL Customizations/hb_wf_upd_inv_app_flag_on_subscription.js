/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 */

/*******************************************************************
 * Name 		: HB WF Invoice App Flag on Subscription
 * Script Type  : Workflow Action
 * Created On   : 
 * Script Owner : 
 * Purpose 		: This script is used to update the Invoice Approved Flag to true on Subscription record,when invoice is approved.
 ********************************************************************/

define(["N/url","N/record"],

		function(url,record) {

	function onAction(context) {
		try{
			var wfJournalEntryRec = context.newRecord;
			var recordId = wfJournalEntryRec.id;
			log.debug('recordId',recordId);
			
			var subscriptionId = wfJournalEntryRec.getValue({
			    fieldId: 'custbody_hb_zab_subscription'
			});
			
			if(subscriptionId != null && subscriptionId != undefined && subscriptionId != ""){
				var id = record.submitFields({
				    type: 'customrecordzab_subscription',
				    id: subscriptionId,
				    values: {
				    	custrecord_hb_invoice_approved:true 
				    },
				    options: {
				        enableSourcing: false,
				        ignoreMandatoryFields : true
				    }
				});
				log.debug('Subscription Submitted ID',id);
			}

			

		}catch(ex){
			log.error('Error while updating Invoice Approved Flag on Subscription due to - ',ex.message);
		}	


	}

	return {
		onAction : onAction
	};

});