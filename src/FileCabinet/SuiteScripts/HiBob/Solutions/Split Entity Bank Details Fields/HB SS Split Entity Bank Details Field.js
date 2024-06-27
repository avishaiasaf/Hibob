/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 * Author: Avishai Asaf
 */
define([
    'N/search',
    'N/record',
    './HB CM Split Bank Detail Action',
    '../../Utilities/HB CM Server Utilities',
], (search, record, splitModule, serverUt) => {
    /**
     * Defines the Scheduled script trigger point.
     * @param {Object} scriptContext
     * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
     * @since 2015.2
     */
    const { SAVED_SEARCH_IDS, CUSTOM_RECORDS_TYPES } = serverUt.enums;
    const execute = (scriptContext) => {
        log.debug('Start parsing Entity Bank Details');
        search
            .load({
                type: CUSTOM_RECORDS_TYPES.FISPAN_BANK_DETAILS,
                id: SAVED_SEARCH_IDS.FISPAN_BANK_DETAILS_REPORT,
            })
            .run()
            .each((bankDetail) => {
                const id = bankDetail.getValue(bankDetail.columns[1]);
                const rec = record.load({
                    id,
                    type: CUSTOM_RECORDS_TYPES.FISPAN_BANK_DETAILS,
                });
                log.debug('Parsing Record ', id);
                splitModule.splitAction(rec);
                return true;
            });
        log.debug('Finished Parsing');
    };

    return { execute };
});
