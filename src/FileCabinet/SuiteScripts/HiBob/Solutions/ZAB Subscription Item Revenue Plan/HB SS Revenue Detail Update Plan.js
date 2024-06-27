/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define([
    'N/query',
    'N/record',
    ' N/runtime',
    '../../Utilities/HB CM Server Utilities',
], /**
 * @param{query} query
 * @param{record} record
 */ (query, record, runtime, serverUt) => {
    const { CUSTOM_RECORDS_TYPES, SAVED_SEARCH_IDS, ZAB_REVENUE_DETAIL } =
        serverUt.enums;
    const updateRevenueDetail = (revenueDetail, revenuePlanId) => {
        let revenuePlanField = ZAB_REVENUE_DETAIL.REVENUE_PLAN;
        let values = {};
        values[revenuePlanField] = revenuePlanId;
        record.submitFields({
            type: CUSTOM_RECORDS_TYPES.ZAB_REVENUE_DETAIL,
            id: revenueDetail,
            values: values,
        });
    };
    /**
     * Defines the Scheduled script trigger point.
     * @param {Object} scriptContext
     * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
     * @since 2015.2
     */
    const execute = (scriptContext) => {
        const results = query
            .runSuiteQL({
                query: `
                SELECT Detail.id AS RevenueDetail, Detail.CUSTRECORDZAB_RD_REVENUE_ELEMENT AS RevenueElement, Plan.id AS PlanId, Plan.revenueplantype
                FROM customrecordzab_revenue_detail AS Detail
                LEFT JOIN revenueplan as Plan ON CUSTRECORDZAB_RD_REVENUE_ELEMENT=Plan.createdfrom AND Plan.revenueplantype = 'ACTUAL'
                WHERE Detail.custrecord_hb_revenue_plan IS NULL AND Detail.CUSTRECORDZAB_RD_REVENUE_ELEMENT IS NOT NULL AND created>= SYSDATE - 4
        `,
            })
            .asMappedResults();
        results.forEach((result, i) => {
            log.debug(
                `Updateing Revenue Detail: ${result['revenuedetail']} with plan: ${result['planid']}`,
                `number ${i}, of total (${results.length}) results`
            );
            updateRevenueDetail(result['revenuedetail'], result['planid']);
            const script = runtime.getCurrentScript();
            script.percentComplete = (i * 100) / results.length;
        });
    };

    return { execute };
});
