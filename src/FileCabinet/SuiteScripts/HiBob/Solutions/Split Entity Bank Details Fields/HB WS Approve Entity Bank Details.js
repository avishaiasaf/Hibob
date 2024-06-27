/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 */
define([
    'N/record',
    'N/runtime',
    'N/search',
    '../../Utilities/HB CM Server Utilities',
], /**
 * @param{record} record
 * @param{runtime} runtime
 * @param{search} search
 */ (record, runtime, search, serverUt) => {
    const {
        CUSTOM_RECORDS_TYPES,
        ENTITY_BANK_DETAILS_FI,
        SCRIPT_PARAMS,
        ENTITY_FIELDS,
    } = serverUt.enums;
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
    const onAction = ({ newRecord }) => {
        try {
            const updateVendor = serverUt.getScriptParam(
                SCRIPT_PARAMS.UPDATE_VENDOR
            );
            log.debug('Update Vendor or EBD', updateVendor);
            if (updateVendor) {
                const vendorId = newRecord.getValue({
                    fieldId: ENTITY_BANK_DETAILS_FI.VENDOR,
                });
                const values = {};

                values[ENTITY_FIELDS.FIRST_APPROVER] = null;
                values[ENTITY_FIELDS.SECOND_APPROVER] = null;
                values['custentity_hb_approval_redirect'] = true;
                log.debug('Updating Values', values);

                record.submitFields({
                    type: record.Type.VENDOR,
                    id: vendorId,
                    values: values,
                });
            } else {
                search
                    .create(
                        serverUt.reportingEnums.getEntityBankDetailsByVendor(
                            newRecord.id,
                            false
                        )
                    )
                    .run()
                    .each((entityBankDetails) => {
                        const id = serverUt.getSearchResultValue(
                            entityBankDetails,
                            0
                        );
                        const values = {};
                        values[ENTITY_BANK_DETAILS_FI.APPROVED] = true;

                        log.debug('Updating Values', values);

                        return record.submitFields({
                            type: CUSTOM_RECORDS_TYPES.FISPAN_BANK_DETAILS,
                            id,
                            values,
                        });
                    });
            }

            return 'Success';
        } catch (e) {
            return 'Error Occurred' + e;
        }
    };

    return { onAction };
});
