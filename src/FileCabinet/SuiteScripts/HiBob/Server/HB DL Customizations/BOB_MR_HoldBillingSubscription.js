/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define([
    'N/record',
    'N/search',
    'N/runtime',
    'N/task',
    'N/https',
    'N/encode',
], /**
 * @param {record} record
 * @param {search} search
 */ function (record, search, runtime, task, https, encode) {
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
        try {
            var currentScript = runtime.getCurrentScript();

            return search.load({
                id: currentScript.getParameter({
                    name: 'custscript_mr_savedsearchid',
                }),
            });
        } catch (e) {
            log.error('error', e);
        }
    }
    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context) {
        try {
            var currentScript = runtime.getCurrentScript();
            var holdBilling = currentScript.getParameter({
                name: 'custscript_mr_holdbilling',
            });

            log.debug('holdBilling', holdBilling);

            var sub = JSON.parse(context.value);
            log.debug('Map Stage', sub);

            var subId =
                sub.values['GROUP(custrecordzab_si_subscription)'].value;

            log.debug('subId', subId);

            record.submitFields({
                type: 'customrecordzab_subscription',
                id: subId,
                values: {
                    custrecord_hb_hold_billing_missing_usage: holdBilling,
                },
            });
        } catch (e) {
            log.error('error', e);
        }
    }

    /**
     * Executes when the reduce entry point is triggered and applies to each group.
     *
     * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */
    function reduce(context) {}

    const base64Encode = (str) => {
        return encode.convert({
            string: str,
            inputEncoding: encode.Encoding.UTF_8,
            outputEncoding: encode.Encoding.BASE_64,
        });
    };

    const createRequestAuthHeader = () => {
        const username = 'api-token';
        const token =
            'a19326ee8b3989584549671ad7a5249df5f3c78481806ba9224aca66bfe1ee29';

        const authHeader = 'Basic ' + base64Encode(username + ':' + token);
        return {
            Authorization: authHeader,
            'Content-Type': 'application/json',
        };
    };
    /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
    function summarize(summary) {
        log.debug('summary', summary);
        const data = runtime
            .getCurrentScript()
            .getParameter({ name: 'custscript_hb_ss_data' });
        log.debug('Data', data);
        try {
            const parsedData = JSON.parse(data);
            const {
                callback_url,
                callback_type,
                callback_id,
                script_activation,
                params,
            } = parsedData;
            const parentTaskId = search.lookupFields({
                type: 'customrecord_script_activation',
                id: script_activation,
                columns: ['custrecord_sa_script_taskid'],
            })['custrecord_sa_script_taskid'];
            log.debug('Parent Task ID', parentTaskId);
            const parentTask = task.checkStatus({ taskId: parentTaskId });

            log.debug('Parent Task Status', parentTask.status);
            const body = {
                callback_type,
                script_activation,
                callback_id,
            };
            log.debug('Params', params);
            log.debug('Params', JSON.stringify(Object.entries(params)));
            Object.entries(params).forEach((param) => {
                // log.debug('Adding param', param);
                body[param[0]] = param[1];
            });
            log.debug('Body', body);
            const response = https.post({
                url: callback_url,
                body: JSON.stringify(body),
                headers: createRequestAuthHeader(),
            });
            log.debug('Response', response);
        } catch (e) {
            log.error('Error Occurred', e);
        }
    }

    return {
        getInputData: getInputData,
        map: map,
        //reduce: reduce,
        summarize: summarize,
    };
});
