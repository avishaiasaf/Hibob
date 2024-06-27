/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 */

define(['N/email', 'N/search','N/render','N/runtime','N/record','N/format'],

		function(email, search, render, runtime,record,format) {
	function onAction(scriptContext) {
		try{
			var currentScript = runtime.getCurrentScript();

			var obj_rec = scriptContext.newRecord;
			var record_id = obj_rec.id;
			var customer = obj_rec.getValue('custrecordzab_s_customer')
			var template_id = currentScript.getParameter({name: 'custscript_wa_templateid'})
			var email_sender = currentScript.getParameter({name: 'custscript_wa_emailsender'})
			var obj_merge = render.mergeEmail({
				templateId: template_id,
				entity: {
					type: 'customer',
					id: parseInt(customer)
				}
			});

			log.debug('obj_merge',obj_merge)

			email.send({
				author: email_sender,
				recipients: customer,
				subject: obj_merge.subject,
				body: obj_merge.body,
				relatedRecords: {
					customRecord:{
						id:	record_id,
						recordType:obj_rec.type
					}
				}
			});
			
			record.submitFields({
				type: 'customer', id: customer,
				values: {
					custentity_hb_onboarding_email_sent: 'T',
					custentity_hb_on_email_sent_date:format.format({value:new Date(), type: format.Type.DATE})
				}
			})

		}
		catch(e)
		{
			log.error('error',e)
		}
	}
	return {
		onAction : onAction
	};

});