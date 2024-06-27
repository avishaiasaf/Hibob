/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/task','N/search'],
		/**
		 * @param {file} file
		 * @param {task} task
		 */
		function(task,search) {

	/**
	 * Definition of the Scheduled script trigger point.
	 *
	 * @param {Object} scriptContext
	 * @param {string} scriptContext.type - The context in which the script is executed. It is one of the values from the scriptContext.InvocationType enum.
	 * @Since 2015.2
	 */
	function execute(scriptContext) {
		try{
			/**********Dependent Scheduled Script Task********************/

			var scriptTask = task.create({taskType: task.TaskType.SCHEDULED_SCRIPT});
			scriptTask.scriptId = 'customscript_sch_trigger_csvimportforstr';
			scriptTask.deploymentId = 'customdeploy_sch_trigger_csvimportforstr';

			/******************************/
			var savedSearchId = 'customsearch_hb_stripe_id_update_on_inv';

			/*******Check if saved search contains result*******/

			var search_invoices = search.load({
				id: savedSearchId, 
			});
			var invoice_result = search_invoices.run().getRange({
				start: 0,
				end: 1
			});

			if(invoice_result.length > 0)
			{
				log.debug('Initiate', "CSV Export followed by CSV Import")
				// Create the search task
				var myTask = task.create({
					taskType: task.TaskType.SEARCH
				});
				myTask.savedSearchId = savedSearchId;

				var path = 'Stripe ID Export for Invoice Update/invoice_update.csv';
				myTask.filePath = path;

				myTask.addInboundDependency(scriptTask);

				// Submit the search task
				var myTaskId = myTask.submit();

				// Retrieve the status of the search task
				var taskStatus = task.checkStatus({
					taskId: myTaskId
				});

				log.debug('taskStatus',taskStatus)
				/************************/
			}
			else
			{
				log.debug("Search is Empty")
			}

		}
		catch(e)
		{
			log.error('error',e)	
		}
	}

	return {
		execute: execute
	};

});
