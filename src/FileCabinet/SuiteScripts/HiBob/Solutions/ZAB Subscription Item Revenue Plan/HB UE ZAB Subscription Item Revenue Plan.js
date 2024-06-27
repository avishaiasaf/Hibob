/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * Author: Avishai Asaf
 */
define(['N/search', 'N/record', '../../Utilities/HB CM Server Utilities'], (
    search,
    record,
    serverUt
) => {
    const { ZAB_SUBSCRIPTION_ITEM, CUSTOM_RECORDS_TYPES, ZAB_REVENUE_DETAIL } =
        serverUt.enums;

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
    EntryPoints.beforeLoad = ({ newRecord }) => {
        try {
            log.debug('server', serverUt);
            const revPlan = newRecord.getValue({
                fieldId: ZAB_SUBSCRIPTION_ITEM.REVENUE_PLAN,
            });
            const revOrder = newRecord.getValue({
                fieldId: ZAB_SUBSCRIPTION_ITEM.REVENUE_ORDER,
            });
            if (revPlan || !revOrder) {
                log.audit(
                    'Revenue Plan Populated or no Revenue Order reference',
                    `Aborting ${newRecord.id}`
                );
                return;
            }
            const ZABRevenueDetail = newRecord.getValue({
                fieldId: ZAB_SUBSCRIPTION_ITEM.ZAB_REVENUE_DETAIL,
            });
            log.debug('ZABRevenueDetail', ZABRevenueDetail);

            if (!ZABRevenueDetail) return;

            const ZABRevenueElement = search.lookupFields({
                type: CUSTOM_RECORDS_TYPES.ZAB_REVENUE_DETAIL,
                id: ZABRevenueDetail,
                columns: [ZAB_REVENUE_DETAIL.REVENUE_ELEMENT],
            })[ZAB_REVENUE_DETAIL.REVENUE_ELEMENT][0].value;
            log.debug('ZABRevenueElement', ZABRevenueElement);
            let revPlanId;
            search
                .create(
                    serverUt.reportingEnums.getRevenuePlanByElement(
                        ZABRevenueElement
                    )
                )
                .run()
                .each((result) => {
                    log.debug(result);
                    revPlanId = serverUt.getSearchResultValue(result, 1);
                    return true;
                });
            log.debug(
                `revenue detail: ${ZABRevenueDetail}, Revenue Plan: ${revPlanId}`
            );

            const rec = record.load({
                type: newRecord.type,
                id: newRecord.id,
            });
            rec.setValue({
                fieldId: ZAB_SUBSCRIPTION_ITEM.REVENUE_PLAN,
                value: revPlanId,
            });
            rec.save();
        } catch (e) {
            serverUt.onError(
                'HB UE ZAB Subscription Item Revenue Plan.js',
                'beforeLoad',
                e
            );
        }

        return true;
    };

    /**
     * Defines the function definition that is executed before record is submitted.
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
     * @since 2015.2
     */
    // EntryPoints.beforeSubmit = (scriptContext) => {};

    /**
     * Defines the function definition that is executed after record is submitted.
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
     * @since 2015.2
     */
    // EntryPoints.afterSubmit = (scriptContext) => {};

    return EntryPoints;
});
