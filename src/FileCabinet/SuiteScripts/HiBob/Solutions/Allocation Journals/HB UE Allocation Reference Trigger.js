/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', './HB CM Allocation Void Function'], /**
 * @param{record} record
 */ (record, AVF) => {
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
      // EntryPoints.beforeSubmit = (scriptContext) => {};

      /**
       * Defines the function definition that is executed after record is submitted.
       * @param {Object} scriptContext
       * @param {Record} scriptContext.newRecord - New record
       * @param {Record} scriptContext.oldRecord - Old record
       * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
       * @since 2015.2
       */
      EntryPoints.afterSubmit = ({ type, newRecord }) => {
            try {
                  const journalId = newRecord.getValue({
                        fieldId: 'custrecord_hb_je_ref',
                  });
                  const journal = record.load({
                        type: 'journalentry',
                        id: journalId,
                  });
                  const {
                        isAllocation,
                        period,
                        voided,
                        schedule,
                        parentRef,
                        override,
                  } = AVF.allocationFunction(journal, newRecord.id);
                  const values = {
                        custrecord_hb_is_allocation: isAllocation,
                        custrecord_hb_voided_journals: voided,
                        custrecord_hb_posting_period: period,
                        custrecord_hb_allocation_schedule: schedule,
                        custrecord_hb_parent_alloc_ref: parentRef,
                        custrecord_hb_allocation_override: override,
                  };
                  log.debug('Updating Values', values);
                  record.submitFields({
                        type: newRecord.type,
                        id: newRecord.id,
                        values,
                  });
            } catch (e) {
                  log.error('Error Occurred', e);
            }
      };

      return EntryPoints;
});
