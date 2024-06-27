/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/record', 'N/query', '../../Utilities/HB CM Server Utilities'], /**
 * @param{record} record
 * @param{search} search
 */ (record, query, serverUt) => {
    const { CUSTOM_RECORDS_TYPES, ZAB_REVENUE_DETAIL, SCRIPT_PARAMS } =
        serverUt.enums;

    const functions = {};

    const updateRevenueDetail = (revenueDetail, revenuePlanId) => {
        let revenuePlanField = ZAB_REVENUE_DETAIL.REVENUE_PLAN;
        let values = {};
        values[revenuePlanField] = revenuePlanId;
        record.submitFields({
            type: CUSTOM_RECORDS_TYPES.ZAB_REVENUE_DETAIL,
            id: revenueDetail,
            values,
        });
    };
    /**
     * Defines the function that is executed at the beginning of the map/reduce process and generates the input data.
     * @param {Object} inputContext
     * @param {boolean} inputContext.isRestarted - Indicates whether the current invocation of this function is the first
     *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
     * @param {Object} inputContext.ObjectRef - Object that references the input data
     * @typedef {Object} ObjectRef
     * @property {string|number} ObjectRef.id - Internal ID of the record instance that contains the input data
     * @property {string} ObjectRef.type - Type of the record instance that contains the input data
     * @returns {Array|Object|Search|ObjectRef|File|Query} The input data to use in the map/reduce process
     * @since 2015.2
     */

    functions.getInputData = (inputContext) => {
        const systemDateFormat =
            serverUt.getGeneralPreferencesField('DATEFORMAT');
        log.debug('System Date Format', systemDateFormat);
        const dateParam = serverUt.getScriptParam(SCRIPT_PARAMS.FROM_DATE);
        const fromDate = serverUt
            .moment(dateParam ? dateParam : new Date())
            .format(systemDateFormat);
        if (!dateParam) {
            log.debug('No "From Date" value', 'Starting from today');
        }
        log.debug('Querying results from date', `${fromDate}`);
        const results = query
            .runSuiteQL({
                query: `
                SELECT Detail.id AS RevenueDetail, Detail.CUSTRECORDZAB_RD_REVENUE_ELEMENT AS RevenueElement, Plan.id AS PlanId, Plan.revenueplantype, Status.name
                FROM customrecordzab_revenue_detail AS Detail
                LEFT JOIN revenueplan as Plan ON CUSTRECORDZAB_RD_REVENUE_ELEMENT=Plan.createdfrom AND Plan.revenueplantype = 'ACTUAL'
                LEFT JOIN customlistzab_revenue_detail_status AS Status ON Status.id=Detail.custrecordzab_rd_status
                WHERE Detail.custrecord_hb_revenue_plan IS NULL AND Status.name != 'Inactive' AND Detail.CUSTRECORDZAB_RD_REVENUE_ELEMENT IS NOT NULL AND created >= '${fromDate}'
                `,
            })
            .asMappedResults();
        log.debug('Number of results', results.length);
        return results;
    };

    /**
     * Defines the function that is executed when the map entry point is triggered. This entry point is triggered automatically
     * when the associated getInputData stage is complete. This function is applied to each key-value pair in the provided
     * context.
     * @param {Object} mapContext - Data collection containing the key-value pairs to process in the map stage. This parameter
     *     is provided automatically based on the results of the getInputData stage.
     * @param {Iterator} mapContext.errors - Serialized errors that were thrown during previous attempts to execute the map
     *     function on the current key-value pair
     * @param {number} mapContext.executionNo - Number of times the map function has been executed on the current key-value
     *     pair
     * @param {boolean} mapContext.isRestarted - Indicates whether the current invocation of this function is the first
     *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
     * @param {string} mapContext.key - Key to be processed during the map stage
     * @param {string} mapContext.value - Value to be processed during the map stage
     * @since 2015.2
     */

    functions.map = (mapContext) => {
        const searchResult = JSON.parse(mapContext.value);
        const { revenuedetail, planid } = searchResult;
        updateRevenueDetail(revenuedetail, planid);
        log.debug(
            'Updating now',
            `Revenue Detail: ${revenuedetail}, Revenue Plan: ${planid}`
        );
    };

    /**
     * Defines the function that is executed when the reduce entry point is triggered. This entry point is triggered
     * automatically when the associated map stage is complete. This function is applied to each group in the provided context.
     * @param {Object} reduceContext - Data collection containing the groups to process in the reduce stage. This parameter is
     *     provided automatically based on the results of the map stage.
     * @param {Iterator} reduceContext.errors - Serialized errors that were thrown during previous attempts to execute the
     *     reduce function on the current group
     * @param {number} reduceContext.executionNo - Number of times the reduce function has been executed on the current group
     * @param {boolean} reduceContext.isRestarted - Indicates whether the current invocation of this function is the first
     *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
     * @param {string} reduceContext.key - Key to be processed during the reduce stage
     * @param {List<String>} reduceContext.values - All values associated with a unique key that was passed to the reduce stage
     *     for processing
     * @since 2015.2
     */
    // functions.reduce = (reduceContext) => {};

    /**
     * Defines the function that is executed when the summarize entry point is triggered. This entry point is triggered
     * automatically when the associated reduce stage is complete. This function is applied to the entire result set.
     * @param {Object} summaryContext - Statistics about the execution of a map/reduce script
     * @param {number} summaryContext.concurrency - Maximum concurrency number when executing parallel tasks for the map/reduce
     *     script
     * @param {Date} summaryContext.dateCreated - The date and time when the map/reduce script began running
     * @param {boolean} summaryContext.isRestarted - Indicates whether the current invocation of this function is the first
     *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
     * @param {Iterator} summaryContext.output - Serialized keys and values that were saved as output during the reduce stage
     * @param {number} summaryContext.seconds - Total seconds elapsed when running the map/reduce script
     * @param {number} summaryContext.usage - Total number of governance usage units consumed when running the map/reduce
     *     script
     * @param {number} summaryContext.yields - Total number of yields when running the map/reduce script
     * @param {Object} summaryContext.inputSummary - Statistics about the input stage
     * @param {Object} summaryContext.mapSummary - Statistics about the map stage
     * @param {Object} summaryContext.reduceSummary - Statistics about the reduce stage
     * @since 2015.2
     */
    functions.summarize = (summaryContext) => {
        log.audit('Finished updating revenue plans', summaryContext);
    };

    return functions;
});
