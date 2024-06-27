/**
 * @NApiVersion 2.1
 * @NScriptType workflowactionscript
 */

/*******************************************************************
 * Name 		: HB WF Sending Email to Primary|Secondary Contacts
 * Purpose 		: This script is used to email the approved invoice to primary and secondary contacts of the customer.
 * Script Type  : Workflow Action
 * Created On   : 
 * Script Owner : Daniel Starkman
 ********************************************************************/

define(["N/url","N/record","N/search","N/render","N/email","N/runtime","N/query"],

		function(url,record,search,render,email,runtime,query) {

	/**
	 * Definition of the Suitelet script trigger point.
	 *
	 * @param {Object} scriptContext
	 * @param {Record} scriptContext.newRecord - New record
	 * @param {Record} scriptContext.oldRecord - Old record
	 * @Since 2016.1
	 */
	function onAction(context) {
		try{

			var wfInvRec = context.newRecord;
			var recordId = wfInvRec.id;
			log.debug('recordId',recordId);

			var customer = wfInvRec.getValue({
				fieldId: 'entity'
			});
			var docNumber = wfInvRec.getValue({
				fieldId: 'tranid'
			});

			//Running search to get contacts of the customer.

			var sql = query.runSuiteQL({
                query:` select id from contact where company = ${customer} and custentity_billing_contact = 'T'`
            }).asMappedResults();
			log.debug({
				title: 'Sql Length',
				details: sql.length
			})
			log.debug('sql',sql);
			var arrInternalIds = [];
			if (sql.length > 0){
				for (var i = 0; i < sql.length ; i++){
					arrInternalIds.push(sql[i].id);	
				}	
				var scriptObj = runtime.getCurrentScript();
				var emailTemplate   = scriptObj.getParameter({name:'custscript_hb_p_s_email_template'});
				var senderEmail   = scriptObj.getParameter({name:'custscript_hb_p_c_sender_email'});
				var myMergeResult = render.mergeEmail({
					templateId: emailTemplate,
					transactionId: recordId,
					entity: {
						type: 'customer',
						id: Number(customer)
					}
				});

				var senderId = senderEmail;
				var recipientEmail = arrInternalIds;
				var emailSubject = myMergeResult.subject; // Get the subject for the email
				var emailBody = myMergeResult.body // Get the body for the email


				var transactionFile = render.transaction({
					entityId: recordId,
					printMode: render.PrintMode.PDF
				});

				email.send({
					author: senderId,
					recipients: recipientEmail,
					subject: emailSubject,
					body: emailBody,
					relatedRecords:{transactionId:recordId},
					attachments:[transactionFile]
				});
				log.debug("Email Sent");
			}
			log.debug("arrSecContacts emails ",arrInternalIds);
		}catch(er){
			log.error("Error while sending email to primary and secondary contacts for invoice - "+docNumber+" due to - ",er.message);
		}
	}

	return {
		onAction : onAction
	};

});