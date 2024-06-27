/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/https', 'N/record', 'N/task', 'N/runtime'], /**
 * @param{https} https
 * @param{record} record
 * @param{task} task
 */ (https, record, task, runtime) => {
    /**
     * Defines the Scheduled script trigger point.
     * @param {Object} scriptContext
     * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
     * @since 2015.2
     */
    const execute = (scriptContext) => {
        const data = runtime
            .getCurrentScript()
            .getParameter({ name: 'custscript_hb_ss_data' });
        log.debug('Data', data);
        try {
            const parsedData = JSON.parse(data);
            const { webhook_url, action, script_activation } = parsedData;
            const parentTaskId = search.lookupFields({
                type: 'customrecord_script_activation',
                id: script_activation,
                columns: ['custrecord_sa_script_taskid'],
            })['custrecord_sa_script_taskid'];
            log.debug('Parent Task ID', parentTaskId);
            const parentTask = task.checkStatus({ taskId: parentTaskId });

            log.debug('Parent Task Status', parentTask.status);
            const body = JSON.stringify({
                action,
                script_activation,
            });
            const response = https.post({ url: webhook_url, body });
            log.debug('Response', response);
        } catch (e) {
            log.error('Error Occurred', e);
        }
    };

    return { execute };
});
