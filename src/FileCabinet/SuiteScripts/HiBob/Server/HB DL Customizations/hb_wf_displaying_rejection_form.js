/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 */

/*******************************************************************
 * Name 		: 
 * Purpose 		: To redirect to the Suitelet which prompts for entering "Rejection Reason".
 * Script Type  : Workflow Action
 * Created On   : 
 * Script Owner : 
 ********************************************************************/

define(["N/url","N/redirect","N/runtime"],

		function(url,redirect,runtime) {

	function onAction(context) {
		try{
			var wfInvRec = context.newRecord;
			var recordId = wfInvRec.id;
			var recordType = wfInvRec.type;
			log.debug('recordId',recordId);

			var scriptObj = runtime.getCurrentScript(); 
			var subscriptionStatus   = scriptObj.getParameter({name:'custscript_wa_subscription_status'});	

			redirect.toSuitelet({
				scriptId: 'customscript_hb_sl_updating_rej_reason',
				deploymentId: 'customdeploy_hb_sl_updating_rej_reason',
				parameters: {'invRecId':recordId,"recordType":recordType,"subscriptionStatus":subscriptionStatus}
			});

		}catch(ex){
			log.error('error in OnAction() function',ex);
		}	
	}

	return {
		onAction : onAction
	};

});