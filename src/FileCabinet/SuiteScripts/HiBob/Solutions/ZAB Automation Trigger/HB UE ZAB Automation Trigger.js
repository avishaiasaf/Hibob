/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/https', 'N/search'], /**
 * @param{record} record
 */ (record, https, search) => {
    const EntryPoints = {};
    /**
     * Defines the function definition that is executed before record is loaded.
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
     * @param {Form} scriptContext.form - Current form
     * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
     * @since 2015.2
     */
    EntryPoints.beforeLoad = (scriptContext) => {};

    /**
     * Defines the function definition that is executed before record is submitted.
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
     * @since 2015.2
     */
    EntryPoints.beforeSubmit = (scriptContext) => {};

    /**
     * Defines the function definition that is executed after record is submitted.
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
     * @since 2015.2
     */
    EntryPoints.afterSubmit = ({ newRecord, type }) => {
        const completionPercent = newRecord.getValue({
            fieldId: 'custrecordzab_p_percent_complete',
        });
        log.debug('Completion Percent', completionPercent);
        if (completionPercent === 100) {
            const url =
                'https://webhooks.workato.com/webhooks/rest/fc5b9c59-495f-4ee3-a0cc-b618338d8564/zab-automation-trigger';
            // const automation = newRecord.getValue({
            //     fieldId: 'custrecordzab_p_automation',
            // });
            // const context = newRecord.getText({
            //     fieldId: 'custrecordzab_p_context',
            // });
            // const process = newRecord.getText({
            //     fieldId: 'custrecordzab_p_process',
            // });
            // const qtyToProcess = newRecord.getValue({
            //     fieldId: 'custrecordzab_p_quantity_to_process',
            // });
            // const processed = newRecord.getValue({
            //     fieldId: 'custrecordzab_p_quantity_processed',
            // });
            // const errorCount = newRecord.getValue({
            //     fieldId: 'custrecordzab_p_error_count',
            // });
            // const prevProcess = newRecord.getText({
            //     fieldId: 'custrecordzab_p_previous_process',
            // });
            // const nextProcess = newRecord.getText({
            //     fieldId: 'custrecordzab_p_next_process',
            // });
            // const dataFile = newRecord.getValue({
            //     fieldId: 'custrecordzab_p_data_file',
            // });
            // const responseFile = newRecord.getValue({
            //     fieldId: 'custrecordzab_p_response_file',
            // });

            const values = search.lookupFields({
                type: newRecord.type,
                id: newRecord.id,
                columns: [
                    'custrecordzab_p_automation',
                    'custrecordzab_p_context',
                    'custrecordzab_p_process',
                    'custrecordzab_p_quantity_to_process',
                    'custrecordzab_p_quantity_processed',
                    'custrecordzab_p_error_count',
                    'custrecordzab_p_previous_process',
                    'custrecordzab_p_next_process',
                    'custrecordzab_p_data_file',
                    'custrecordzab_p_response_file',
                    'custrecordzab_p_percent_complete',
                ],
            });

            // log.debug('Values', values);

            // const body = {
            //     completionPercent,
            //     automation,
            //     context,
            //     process,
            //     qtyToProcess,
            //     processed,
            //     errorCount,
            //     prevProcess,
            //     nextProcess,
            //     dataFile,
            //     responseFile,
            // };

            log.debug('body', values);

            const response = https.post({ url, body: JSON.stringify(values) });
            log.debug('Resposne', response);
        }
        return true;
    };

    return EntryPoints;
});
