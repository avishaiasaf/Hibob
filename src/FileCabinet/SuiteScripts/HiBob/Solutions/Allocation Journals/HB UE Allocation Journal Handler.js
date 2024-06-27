/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define([
      'N/record',
      'N/query',
      'N/transaction',
      'N/search',
      './HB CM Allocation Void Function',
], /**
 * @param{record} record
 * @param{query} query
 * @param{transaction} transaction
 * @param{search} search
 */ (record, query, transaction, search, AVF) => {
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

      const getRelatedJournalEntries = (id, period) => {
            return query
                  .runSuiteQL({
                        query: `
                        SELECT t.id, tl.memo
                        FROM AllocationDetail AS ad
                        LEFT JOIN GeneralAllocationSchedule AS gas ON ad.parentschedule = gas.id
                        LEFT JOIN AllocationDetail AS ad_1 ON ad_1.parentschedule = gas.id AND ad_1.id <> ad.id
                        LEFT JOIN allocationDetailJournalMap AS map ON map.allocationdetail = ad_1.id 
                        LEFT JOIN Transaction AS t ON t.id = map.journal
			            LEFT JOIN TransactionLine AS tl ON t.id = tl.transaction AND tl.linesequencenumber = 0
                        WHERE ad.id = ${id} AND ad_1.postingperiod = ${period} AND tl.memo <> 'VOID'
                    `,
                  })
                  .asMappedResults()
                  .filter((item) => Boolean(item.id))
                  .map((item) => {
                        return item.id;
                  });
      };
      const voidTransactions = (trans) => {
            const voided = [];
            trans.forEach((tran) => {
                  const voidTran = transaction.void({
                        type: record.Type.JOURNAL_ENTRY,
                        id: tran,
                  });
                  voided.push(voidTran);
            });
            return voided;
      };
      /**
       * Defines the function definition that is executed after record is submitted.
       * @param {Object} scriptContext
       * @param {Record} scriptContext.newRecord - New record
       * @param {Record} scriptContext.oldRecord - Old record
       * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
       * @since 2015.2
       */
      EntryPoints.afterSubmit = ({ type, newRecord }) => {
            // AVF.allocationFunction(newRecord);
            // try {
            //       const ref = record.create({
            //             type: 'customrecord_hb_alloc_journal_ref',
            //       });
            //       ref.setValue({
            //             fieldId: 'custrecord_hb_je_ref',
            //             value: newRecord.id,
            //       });
            //       const refId = ref.save();
            //       log.debug('Journal Allocation Reference', refId);
            // } catch (e) {
            //       log.error('Error Occurred', e);
            // }
            // try {
            //       // if (type !== 'create') return;
            //       const allocationDetail = newRecord.getValue({
            //             fieldId: 'parentexpensealloc',
            //       });
            //       log.debug('allocationDetail', allocationDetail);
            //       if (!allocationDetail) {
            //             log.debug(
            //                   'Not an Allocation Journal Entry',
            //                   newRecord.id
            //             );
            //             return;
            //       }
            //       const period = newRecord.getValue({
            //             fieldId: 'postingperiod',
            //       });
            //       log.debug(
            //             `Allocation Journal Entry : ${newRecord.id}`,
            //             `Posting Period : ${period}`
            //       );
            //       const relatedJournalEntries = getRelatedJournalEntries(
            //             allocationDetail,
            //             period
            //       );
            //       log.debug('Related Journals', relatedJournalEntries);
            //       const voided = voidTransactions(relatedJournalEntries);
            //       log.debug('Previous Transactions Voided', voided);
            // } catch (e) {
            //       log.error('Error Occurred::', e);
            // }
      };

      return EntryPoints;
});
