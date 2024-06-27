/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @Author: Avishai Asaf
 */
define(['N/record', 'N/query', './HB CM Split Bank Detail Action'], /**
 * @param{record} record
 */ (record, query, splitModule) => {
      const EntryPoints = {};

      const conditionalBlock = (condition) => {
            if (!condition)
                  throw 'Creating more then one Entity Bank Details per vendor is prohibited';
      };

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
      EntryPoints.beforeSubmit = ({ newRecord, type }) => {
            //Get Entity Bank Details for the same vendor
            const vendor = newRecord.getValue({
                  fieldId: 'custrecord_fispan_vbd_vendor',
            });
            const vendorEBD = query
                  .runSuiteQL({
                        query: `
                                  SELECT id, name
                                    FROM customrecord_fispan_vendor_bank_details
                                    WHERE custrecord_fispan_vbd_vendor = ${vendor}
                      `,
                  })
                  .asMappedResults();
            log.debug('Before Submit', vendorEBD);
            //If another EBD exist - block creation
            if (type === 'create') {
                  log.debug('create', vendorEBD.length === 0);
                  conditionalBlock(vendorEBD.length === 0);
                  // return vendorEBD.length === 0;
            } else if (type !== 'delete') {
                  log.debug('update', vendorEBD.length === 1);
                  conditionalBlock(vendorEBD.length === 1);
                  // return vendorEBD.length === 1;
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
      EntryPoints.afterSubmit = ({ newRecord, oldRecord, type }) => {
            splitModule.splitAction(newRecord);
            if (type !== 'delete') {
                  const values = {};
                  const payData = newRecord.getValue({
                        fieldId: 'custrecord_fispan_vbd_payment_data',
                  });

                  const vendor = newRecord.getValue({
                        fieldId: 'custrecord_fispan_vbd_vendor',
                  });
                  const ebdName = newRecord.getValue({ fieldId: 'name' });
                  values['custentity_hb_ebd_pay_data'] = payData;
                  values['custentity_hb_allow_ebd_approval'] = Boolean(ebdName);

                  // if (type === 'create') {
                  values['custentity_hb_ebd_record'] = newRecord.id;
                  // }
                  if (type !== 'create') {
                        const oldPayData = oldRecord.getValue({
                              fieldId: 'custrecord_fispan_vbd_payment_data',
                        });

                        if (oldPayData !== payData) {
                              values['custentity_hb_ebd_changed'] = true;
                              log.debug(
                                    'Payment Data Changed',
                                    oldPayData !== payData
                              );
                        }
                  }

                  // const vendorRec = record.load({ type: 'vendor', id: vendor });
                  // Object.entries(values).forEach((update) => {
                  //       vendorRec.setValue({
                  //             fieldId: update[0],
                  //             value: update[1],
                  //       });
                  // });

                  // vendorRec.save({ ignoreMandatoryFields: true });
                  record.submitFields({
                        id: vendor,
                        type: 'vendor',
                        values,
                  });
            }
      };

      return EntryPoints;
});
