/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 */
define(['N/record', 'N/query', 'N/runtime'], /**
 * @param{record} record
 * @param{query} query
 * @param{runtime} runtime
 */ (record, query, runtime) => {
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
            try {
                  log.debug(
                        'Start - Remaining Units',
                        runtime.getCurrentScript().getRemainingUsage()
                  );
                  const vendorId = runtime
                        .getCurrentScript()
                        .getParameter({ name: 'custscript_hb_ven_id' });
                  const hold = runtime
                        .getCurrentScript()
                        .getParameter({ name: 'custscript_hb_hold' });
                  const relatedBills = query
                        .runSuiteQL({
                              query: `SELECT id, type, BUILTIN.DF(status) AS Status FROM Transaction WHERE type = 'VendBill' AND entity = ${vendorId} AND BUILTIN.DF(status) <> 'Bill : Paid In Full'`,
                        })
                        .asMappedResults();

                  relatedBills.forEach((bill) => {
                        log.debug(
                              'Update Related Bill',
                              `Bill: ${bill.id}, Payment Hold: ${!!hold}`
                        );
                        record.submitFields({
                              type: 'vendorbill',
                              id: bill.id,
                              values: { paymenthold: !!hold },
                        });
                        log.debug(
                              'End - Remaining Units',
                              runtime.getCurrentScript().getRemainingUsage()
                        );
                  });
                  log.debug(
                        'End - Remaining Units',
                        runtime.getCurrentScript().getRemainingUsage()
                  );
            } catch (e) {
                  log.error('Error Occurred', e);
            }
      };

      return { onAction };
});
