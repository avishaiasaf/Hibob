/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/ui/message', 'N/search', 'N/file', 'N/record'], (
      message,
      search,
      file,
      record
) => {
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
      EntryPoints.beforeLoad = ({ form, newRecord, type }) => {
            try {
                  log.debug('Vendor Status');
                  log.debug(
                        'Form',
                        form.getButton({ id: 'custpageworkflow724' })
                  );
                  if (type === 'view') {
                        const htmlFld = form.addField(
                              {
                                    id: 'custpage_client_script',
                                    type: 'INLINEHTML',
                                    label: 'HTML',
                              }

                              // 'customscript_hb_vendor_approval_refresh'
                        );
                        htmlFld.defaultValue = `
                                  <script>
                                  const bt  = document.getElementById('custpageworkflow724'); 
                                  const approvalStatus = nlapiGetFieldText('custentitymis_approval_status'); 
                                  console.log('refreshing', bt, approvalStatus); //location.reload();
                                  </script>`;
                        log.debug('Added Field', htmlFld);
                  }

                  const isCC = newRecord.getText({
                        fieldId: 'custentity_il_vendor_pay_method',
                  });
                  if (isCC !== 'Credit Card') {
                        // const isApproved = query
                        //       .runSuiteQL({
                        //             query: `SELECT id FROM vendor WHERE id = ${newRecord.id} AND BUILTIN.DF(custentitymis_approval_status) = 'Approved'`,
                        //       })
                        //       .asMappedResults();
                        let isApproved = false;
                        let ebdId;
                        search.create({
                              type: 'vendor',
                              filters: [
                                    [
                                          // [
                                          //       'custrecord_fispan_vbd_vendor.custrecord_hb_approval_status',
                                          //       'noneof',
                                          //       '3',
                                          // ],
                                          // 'AND',
                                          ['internalid', 'anyof', newRecord.id],
                                    ],
                                    // ['workflow.currentstate', 'anyof', '266'],
                                    // 'AND',
                                    // [
                                    //       'custentitymis_approval_status',
                                    //       'anyof',
                                    //       '3',
                                    // ],
                                    // 'AND',
                                    // ['internalid', 'anyof', newRecord.id],
                              ],
                              columns: [
                                    // {
                                    //       name: 'entityid',
                                    // },
                                    {
                                          name: 'internalid',
                                          join: 'CUSTENTITY_HB_EBD_RECORD',
                                    },
                                    {
                                          name: 'custrecord_hb_approval_status',
                                          join: 'CUSTENTITY_HB_EBD_RECORD',
                                    },
                              ],
                        })
                              .run()
                              .each((result) => {
                                    isApproved = result.getText(
                                          result.columns[1]
                                    );
                                    ebdId = result.getValue(result.columns[0]);
                              });
                        log.debug('is approved', isApproved);
                        if (isApproved.toLowerCase() === 'approved') {
                              form.addPageInitMessage({
                                    type: message.Type.CONFIRMATION,
                                    message: 'FISPAN Vendor Bank Details Are Approved',
                                    duration: 120000,
                              });
                        } else if (ebdId) {
                              form.addPageInitMessage({
                                    type: message.Type.WARNING,
                                    message: `FISPAN Vendor Bank Details Are Not Approved - <a href="/app/common/custom/custrecordentry.nl?id=${ebdId}&rectype=1992&whence=" target=”_blank”><b>View</b></a>`,
                                    duration: 120000,
                              });
                              // const approvalStatus = search.lookupFields({
                              //       type: 'vendor',
                              //       id: newRecord.id,
                              //       columns: ['custentitymis_approval_status'],
                              // })['custentitymis_approval_status'][0].text;
                              // if (approvalStatus.toLowerCase() === 'approved') {
                              //       record.submitFields({
                              //             type: 'vendor',
                              //             id: newRecord.id,
                              //             values: {
                              //                   custentitymis_approval_status: 1,
                              //                   custentity_hb_ebd_changed: false,
                              //             },
                              //       });
                              // }
                        }
                  }
            } catch (e) {
                  log.error('Error Occurred', e);
            }
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
      EntryPoints.afterSubmit = ({ newRecord }) => {
            try {
                  const bankDetailFile = newRecord.getValue({
                        fieldId: 'custentity_hb_ven_bank_det_doc',
                  });
                  log.debug('bankDetailFile', bankDetailFile);
                  if (bankDetailFile) {
                        const bankDetailFileObj = file.load({
                              id: bankDetailFile,
                        });
                        const fileUrl = bankDetailFileObj.url;
                        log.debug('File URL', fileUrl);
                        record.submitFields({
                              type: newRecord.type,
                              id: newRecord.id,
                              values: {
                                    custentity_hb_ven_bank_detail_url: fileUrl,
                              },
                        });
                  }
            } catch (e) {
                  log.error('Error Occurred', e);
            }
      };

      return EntryPoints;
});
