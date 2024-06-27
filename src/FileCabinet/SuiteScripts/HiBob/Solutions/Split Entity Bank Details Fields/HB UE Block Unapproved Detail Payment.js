/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/search', '../../Utilities/HB CM Server Utilities'], /**
 * @param{record} record
 * @param{search} search
 */ (search, serverUt) => {
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
    // EntryPoints.beforeLoad = (scriptContext) => {};

    /**
     * Defines the function definition that is executed before record is submitted.
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
     * @since 2015.2
     */
    EntryPoints.beforeSubmit = (scriptContext) => {
        log.debug('Type', scriptContext.type);
        if (['create', 'edit'].indexOf(scriptContext.type) >= 0) {
            const billPayment = scriptContext.newRecord;
            const vendor = billPayment.getValue({ fieldId: 'entity' });
            const entityBankDetails = search
                .create(
                    serverUt.reportingEnums.getEntityBankDetailsByVendor(vendor)
                )
                .run()
                .getRange({ start: 0, end: 1 });
            log.debug('Entity Bank Details ', entityBankDetails);
            if (entityBankDetails.length) {
                log.debug('Entity Bank Details approved');
                return true;
            }
            log.debug('Entity Bank Details not approved');
            throw 'Vendor Entity Bank Details are not approved';
        }
    };

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
