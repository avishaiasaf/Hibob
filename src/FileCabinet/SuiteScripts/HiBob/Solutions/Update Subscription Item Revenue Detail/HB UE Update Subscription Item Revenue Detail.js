/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * Author: Avishai Asaf
 */
define(['N/record', '../../Utilities/HB CM Server Utilities'], /**
 * @param{record} record
 * @param{search} search
 */ (record, serverUt) => {
    const EntryPoints = {};
    const { ZAB_REVENUE_DETAIL, ZAB_SUBSCRIPTION_ITEM, CUSTOM_RECORDS_TYPES } =
        serverUt.enums;

    /**
     * Defines the function definition that is executed before record is loaded.
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
     * @param {Form} scriptContext.form - Current form
     * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
     * @since 2015.2
     */
    // EntryPoints.beforeLoad = (scriptContext) => {};

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
    EntryPoints.afterSubmit = ({ newRecord }) => {
        serverUt.monitoredFunction(
            ((newRecord) => {
                const zabSubscriptionItem = newRecord.getValue({
                    fieldId: ZAB_REVENUE_DETAIL.REVENUE_EVENT_SUBSCRIPTION_ITEM,
                });
                const isInactive = newRecord.getValue({
                    fieldId: 'isinactive',
                });
                if (isInactive) {
                    log.debug('Revenue Detail is inactive', 'aborting');
                    return;
                }
                const zabRevenueDetailId = newRecord.id;
                log.debug({
                    title: `Updating Subscription Item for ZAB Revenue Detail - ${zabRevenueDetailId}`,
                    details: `Subscription Item - ${zabSubscriptionItem}`,
                });
                const subscriptionItem = record.load({
                    type: CUSTOM_RECORDS_TYPES.ZAB_SUBSCRIPTION_ITEM,
                    id: zabSubscriptionItem,
                });
                subscriptionItem.setValue({
                    fieldId: ZAB_SUBSCRIPTION_ITEM.ZAB_REVENUE_DETAIL,
                    value: zabRevenueDetailId,
                });
                subscriptionItem.save();
            }).bind(this, newRecord)
        );
        return true;
    };
    return EntryPoints;
});
