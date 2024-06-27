/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/file', 'N/task','N/runtime'],
		/**
		 * @param {file} file
		 * @param {task} task
		 */
		function(file, task,runtime) {

	/**
	 * Definition of the Scheduled script trigger point.
	 *
	 * @param {Object} scriptContext
	 * @param {string} scriptContext.type - The context in which the script is executed. It is one of the values from the scriptContext.InvocationType enum.
	 * @Since 2015.2
	 */
	function execute(scriptContext) {
		try{

			var path = 'Stripe ID Export for Invoice Update/invoice_update.csv';

			var csvTask = task.create({taskType: task.TaskType.CSV_IMPORT});
			csvTask.mappingId = "custimport_hb_stripe_id_update_inv";
			var objfile = file.load(path);
			csvTask.importFile = objfile;
			var csvImportTaskId = csvTask.submit();

			log.debug('csvImportTaskId',csvImportTaskId)
			if(csvImportTaskId)
			{
				var currentScript = runtime.getCurrentScript();
				var archive_folder = currentScript.getParameter({name: 'custscript_archive_folder_id'})
				objfile.folder =archive_folder;
				objfile.name = 'processed_'+ new Date().toISOString()+'.csv';

				var submitFile = objfile.save();
				
				log.debug("submitFile",submitFile)
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
