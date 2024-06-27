
/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */

/*******************************************************************
 * Name 		: HB MR Generating Dig Signature	
 * Purpose 		: This script is used to email original pdf with digital stamp for primary contact and copied invoice for secondary contacts for Israel Subsidiary.
 * Script Type  : Map Reduce
 * Created On   : 
 * Script Owner : 
 ********************************************************************/

define(["N/url","N/record","N/search","N/render","N/email","N/runtime","N/file","N/https"],

		function(url,record,search,render,email,runtime,file,https) {

	/**
	 * Marks the beginning of the Map/Reduce process and generates input data.
	 *
	 * @typedef {Object} ObjectRef
	 * @property {number} id - Internal ID of the record instance
	 * @property {string} type - Record type id
	 *
	 * @return {Array|Object|Search|RecordRef} inputSummary
	 * @since 2015.1
	 */
	function getInputData() {
		log.debug('Start','***** START *****');

		return search.load({
			id: 'customsearch_hb_email_ori_invoice'
		});
	}



	/**
	 * Executes when the reduce entry point is triggered and applies to each group.
	 *
	 * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
	 * @since 2015.1
	 */
	function reduce(context) {

		try{

			var scriptObj = runtime.getCurrentScript(); 
			var emailTemplate   = "";
			var senderEmail   = scriptObj.getParameter({name:'custscript_hb_mr_sender_email_ds'});
			var secondaryRoleValue = scriptObj.getParameter({name:'custscript_hb_mr_sec_contact_value'});
			var folderName = scriptObj.getParameter({name:'custscript_hb_sign_documents_folder'});
			var invEmailTemplate   = scriptObj.getParameter({name:'custscript_hb_mr_dig_inv_email_temp'});
			var cmEmailTemplate   = scriptObj.getParameter({name:'custscript_hb_mr_cm_email_template'});



			var recordId = context.key;
			var contObjText = JSON.parse(context.values[0])["values"];


			var recordType = contObjText["recordtype"];
			var documentNumber = contObjText["tranid"];
			var ILTransactionRecord = contObjText["custbody_il_transaction_state"]["value"]
			var entityID = contObjText["entity"]["value"];

			log.debug("values ",recordType+" - "+documentNumber+" - "+ ILTransactionRecord+" - "+ entityID);

			if(recordType == 'invoice'){
				emailTemplate = invEmailTemplate;
			}else if(recordType == 'creditmemo'){
				emailTemplate = cmEmailTemplate;
			}
			if(entityID && ILTransactionRecord){


				var parentRecordType = "";
				if(recordType == 'invoice'){
					parentRecordType = 'Invoice';
				}else if(recordType == 'creditmemo'){
					parentRecordType = 'Creditmemo';
				}

				//Retrieving Original PDF URL to generate original PDF with digital signature
				var originalPDFURL = url.resolveScript({
					scriptId: 'customscript_il_tran_print_routr',
					deploymentId: 'customdeploy_hb_generating_dig_sign_n_in',
					returnExternalUrl: true
				});
				originalPDFURL += "&recType="+recordType+"&recId="+recordId+"&printingType=origin&formPrintingType=advancedpdf&usesign=T";
				//log.debug("originalPDFURL : ",originalPDFURL);
				var response = https.get({
					url: originalPDFURL,
				});
				//log.debug("response : ",response);

				//Forming the file path name  to get the PDF File which was generated in previous request
				var filePath = folderName+"/"+parentRecordType+"_"+documentNumber+"_"+recordId+".pdf";
				log.debug("filePath : ",filePath);

				if(response.code == 200 && parentRecordType){
					var fileObj = file.load({
						id: filePath
					});
					//log.debug("fileObj :: ",fileObj);

					if(fileObj){ //SENDING EMAIL

						var myMergeResult = render.mergeEmail({
							templateId: emailTemplate,
							transactionId: Number(recordId),
							entity: {
								type: 'customer',
								id: Number(entityID)
							}
						});

						var senderId = senderEmail;
						var recipientEmail = entityID;
						var emailSubject = myMergeResult.subject; // Get the subject for the email
						var emailBody = myMergeResult.body // Get the body for the email

						//Emailing orignal pdf email with digital signature

						email.send({
							author: senderId,
							recipients: recipientEmail,
							subject: emailSubject,
							body: emailBody,
							relatedRecords:{transactionId:recordId},
							attachments:[fileObj]
						});
						log.debug("Original Email Sent");

						//Once the original  is sent to the contacts and marking Auto Email as true.

						var updateFlag = record.submitFields({
							type: 'customrecord_il_transaction_state',
							id: ILTransactionRecord,
							values: {
								custrecord_hb_auto_email:true
							},
							options: {
								enableSourcing: false,
								ignoreMandatoryFields : true
							}
						});
						log.debug("Submitted id for updating flag ",updateFlag);

						//LOGIC TO SEND COPIED INVOICE TO SECONDARY CONTACTS OF THE CUSTOMER


						//=========== Customer Search to get Secondary Contacts =============
						var arrSecContacts = []; var arrInternalIds = [];
						var customerSearchObj = search.create({
							type: "customer",
							filters:[["internalid","anyof",entityID],"AND", ["contact.role","anyof",secondaryRoleValue] ,"AND", ["contact.internalid","noneof","@NONE@"],"AND",["contact.email","isnotempty",""]],
							columns:
								[search.createColumn({name: "internalid",join: "contact"})]
						});

						var searchResultCount = customerSearchObj.runPaged().count;
						customerSearchObj.run().each(function(result){
							var secEmail = result.getValue({name: "internalid",join: "contact"});
							if(secEmail != null && secEmail != undefined && secEmail != ""){
								arrInternalIds.push(secEmail)
							}
							return true;
						});

						log.debug("arrSecContacts emails ",arrInternalIds);

						var cusId = entityID;

						if(arrInternalIds.length > 0){


							var senderId = senderEmail;
							var recipientEmail = arrInternalIds;


							var transactionFile = render.transaction({
								entityId: Number(recordId),
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
							log.debug("Copied Email Sent");

						}

					}

				}
			}

		}
		catch(err)
		{
			log.error('Error while emailing Invoice for Israel Subsidiary - '+documentNumber+' due to - ',err.message);
		}
	}


	/**
	 * Executes when the summarize entry point is triggered and applies to the result set.
	 *
	 * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
	 * @since 2015.1
	 */
	function summarize(summary) {
		log.debug('End','***** END *****');
	}


	return {
		getInputData: getInputData,
		//map: map,
		reduce: reduce,
		summarize: summarize
	};

});