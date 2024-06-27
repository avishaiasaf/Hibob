/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 */
define(['N/record', 'N/search', '../../Utilities/HB CM Server Utilities'], /**
 * @param{record} record
 * @param{search} search
 */ (record, search, serverUt) => {
    const { CUSTOM_RECORDS_TYPES, ZAB_REVENUE_EVENT } = serverUt.enums;
    const createRevenueEvent = (revenueDetail) => {
        const revenueEvent = record.create({
            type: CUSTOM_RECORDS_TYPES.ZAB_REVENUE_EVENT,
        });
        revenueEvent.setValue({
            fieldId: ZAB_REVENUE_EVENT.CUMULATIVE_PERCENT_COMPLETE,
            value: serverUt.getScriptParam('custscript_hb_perc_complete'),
        });
        revenueEvent.setValue({
            fieldId: ZAB_REVENUE_EVENT.EVENT_DATE,
            value: serverUt.getScriptParam('custscript_hb_event_date'),
        });
        revenueEvent.setValue({
            fieldId: ZAB_REVENUE_EVENT.REVENUE_DETAIL,
            value: revenueDetail,
        });
        return revenueEvent.save();
    };
    /**
     * Defines the WorkflowAction script trigger point.
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.workflowId - Internal ID of workflow which triggered this action
     * @param {string} scriptContext.type - Event type
     * @param {Form} scriptContext.form - Current form that the script uses to interact with the record
     * @since 2016.1
     */
    const onAction = (scriptContext) => {
        return serverUt.monitoredFunction(
            () => {
                const id = serverUt.getScriptParam('custscript_hb_zab_si_id');
                log.debug('Record ID', id);
                const revenueDetails = [];
                search
                    .create(
                        serverUt.reportingEnums.getRevenueDetailsBySubscriptionItems(
                            id
                        )
                    )
                    .run()
                    .each((revenueDetail) => {
                        revenueDetails.push(
                            serverUt.getSearchResultValue(revenueDetail, 0)
                        );
                        return true;
                    });
                log.debug('Revenue Details', JSON.stringify(revenueDetails));
                const revenueEvents = [];
                revenueDetails.forEach((revenueDetail) => {
                    revenueEvents.push(createRevenueEvent(revenueDetail));
                });
                const returnVal = revenueEvents.length ? 'SUCCESS' : 'FAILURE';
                log.debug(
                    'Revenue Events Created',
                    JSON.stringify(revenueEvents)
                );
                log.debug('Return Value', returnVal);
                return returnVal;
            },
            'HB WA Create PS Revenue Event.js',
            'onAction'
        );
    };

    return { onAction };
});
