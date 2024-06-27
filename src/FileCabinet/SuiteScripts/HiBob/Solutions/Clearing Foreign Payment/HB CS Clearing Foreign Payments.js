/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define([
      'N/record',
      'N/search',
      'N/currentRecord',
      'N/https',
      'N/url',
      '../../Utilities/HB CM Client Utilities',
], function (record, search, currentRecord, https, url, clientUt) {
      const EntryPoints = {};
      const { CLEARING_FOREIGN_PAYMENTS_SUITELET } = clientUt.enums;

      const getSublistValue = (rec, sublistId, line) => {
            return (fieldId) => {
                  return rec.getSublistValue({
                        sublistId,
                        fieldId,
                        line,
                  });
            };
      };
      const getSelectedLines = () => {
            const { SUBLIST_ID } = CLEARING_FOREIGN_PAYMENTS_SUITELET;
            const rec = currentRecord.get();
            const lineCount = rec.getLineCount({
                  sublistId: SUBLIST_ID,
            });

            const sublistFields =
                  CLEARING_FOREIGN_PAYMENTS_SUITELET.SUBLIST_FIELDS;

            const lineValues = [];
            for (let i = 0; i < lineCount; i++) {
                  const getValue = getSublistValue(rec, SUBLIST_ID, i);
                  let selected = getValue(sublistFields[0].ID);
                  if (selected) {
                        let payment = getValue(sublistFields[1].ID);
                        let docNum = getValue(sublistFields[2].ID);
                        let amount = getValue(sublistFields[3].ID);
                        let invoiceAmount = getValue(sublistFields[4].ID);
                        let date = getValue(sublistFields[5].ID);
                        let customer = getValue(sublistFields[6].ID);

                        lineValues.push({
                              payment,
                              amount,
                              invoiceAmount,
                              line: i,
                              date,
                              customer,
                              docNum,
                        });
                  }
            }
            return lineValues;
      };
      const generateTransferFunds = ({
            amount,
            invoiceAmount,
            payment,
            date,
            customer,
            docNum,
      }) => {
            const fromAccount = '331';
            const toAccount = '321';
            const transferFunds = record.create({ type: 'transfer' });
            transferFunds.setValue({
                  fieldId: 'fromaccount',
                  value: fromAccount,
            });
            transferFunds.setValue({ fieldId: 'toaccount', value: toAccount });
            transferFunds.setValue({
                  fieldId: 'toamount',
                  value: invoiceAmount,
            });
            transferFunds.setValue({ fieldId: 'fromamount', value: amount });
            transferFunds.setValue({ fieldId: 'trandate', value: date });
            transferFunds.setValue({
                  fieldId: 'memo',
                  value: `${docNum} | ${customer}`,
            });
            const transferId = transferFunds.save();
            log.debug('Created Transfer Funds', transferId);
            console.log('Created Transfer Funds', transferId);

            const t = record.load({ type: 'transfer', id: transferId });
            t.setValue({ fieldId: 'fromamount', value: amount });
            t.save();
            console.log('update payment', payment);
            record.submitFields({
                  type: record.Type.CUSTOMER_PAYMENT,
                  id: payment,
                  values: {
                        custbody_hb_transfered: true,
                        custbody_trasnfer_funds_related: transferId,
                  },
            });
            return transferId;
      };

      const loopSelectField = (check) => {
            const rec = currentRecord.get();
            const lineCount = rec.getLineCount({
                  sublistId: 'custscript_payment_for_clearing',
            });
            for (let i = 0; i < lineCount; i++) {
                  rec.selectLine({
                        sublistId: 'custscript_payment_for_clearing',
                        line: i,
                  });
                  const isSelected = rec.getCurrentSublistValue({
                        sublistId: 'custscript_payment_for_clearing',
                        fieldId: 'custscript_transfer_payment',
                  });
                  if (isSelected !== check) {
                        rec.setCurrentSublistValue({
                              sublistId: 'custscript_payment_for_clearing',
                              fieldId: 'custscript_transfer_payment',
                              value: check,
                        });
                        rec.commitLine({
                              sublistId: 'custscript_payment_for_clearing',
                        });
                  }
            }
      };

      EntryPoints.fieldChanged = ({ fieldId, line, sublistId }) => {
            if (fieldId === 'custscript_transfer_payment') {
                  const rec = currentRecord.get();
                  const isSelected = rec.getSublistValue({
                        fieldId,
                        line,
                        sublistId,
                  });
                  console.log('selected line', line);
                  const currentEstimate =
                        rec.getValue({
                              fieldId: 'custpage_transfer_balance',
                        }) || 0;
                  const amount = rec.getSublistValue({
                        fieldId: 'custscript_payment_amount',
                        line,
                        sublistId,
                  });
                  const newEstimate = isSelected
                        ? parseFloat(currentEstimate) + parseFloat(amount)
                        : parseFloat(currentEstimate) - parseFloat(amount);
                  console.log('amount', amount, currentEstimate);
                  console.log('new estimate', newEstimate);
                  rec.setValue({
                        fieldId: 'custpage_transfer_balance',
                        value: newEstimate.toFixed(2),
                  });
            }
      };

      EntryPoints.markAll = () => {
            console.log('markall');
            loopSelectField(true);
      };

      EntryPoints.unMarkAll = () => {
            console.log('unmarkall');
            loopSelectField(false);
      };

      EntryPoints.estimate = () => {
            const rec = currentRecord.get();
            const lineCount = rec.getLineCount({
                  sublistId: 'custscript_payment_for_clearing',
            });
            let estimate = 0;
            for (let i = 0; i < lineCount; i++) {
                  let selected = rec.getSublistValue({
                        sublistId: 'custscript_payment_for_clearing',
                        fieldId: 'custscript_transfer_payment',
                        line: i,
                  });
                  if (selected) {
                        const lineAmount = rec.getSublistValue({
                              fieldId: 'custscript_invoice_amount',
                              line: i,
                              sublistId: 'custscript_payment_for_clearing',
                        });
                        estimate += lineAmount;
                  }
            }
            console.log('estimate', estimate);
            rec.setValue({
                  fieldId: 'custpage_transfer_balance',
                  value: estimate,
            });
      };

      EntryPoints.removeSelected = () => {
            const lineValues = getSelectedLines();
            lineValues.forEach((line) => {
                  console.log('removing', line);
            });

            const payments = lineValues
                  .map((item) => {
                        return item.payment;
                  })
                  .join(',');
            console.log('payment ids', payments);

            const suiteletUrl = url.resolveScript({
                  scriptId: 'customscript_hb_sl_clear_payments',
                  deploymentId: 'customdeploy_hb_sl_clear_payments',
                  returnExternalUrl: false,
                  params: {
                        payments,
                  },
            });
            console.log('url', suiteletUrl);
            const response = https.post({
                  url: suiteletUrl,
                  body: JSON.stringify(lineValues),
            });
            console.log('Response', response);
            clientUt.refreshPage();
      };

      EntryPoints.createTransferFunds = () => {
            // const { SUBLIST_ID } = CLEARING_FOREIGN_PAYMENTS_SUITELET;
            // const rec = currentRecord.get();
            // const lineCount = rec.getLineCount({
            //     sublistId: SUBLIST_ID,
            // });
            //
            // const sublistFields = CLEARING_FOREIGN_PAYMENTS_SUITELET.SUBLIST_FIELDS;
            //
            // log.debug('line Count', lineCount);
            // console.log('line Count', lineCount, sublistFields);
            // const lineValues = [];
            // for (let i = 0; i < lineCount; i++) {
            //     let selected = rec.getSublistValue({
            //         sublistId: SUBLIST_ID,
            //         fieldId: sublistFields[0].ID,
            //         line: i,
            //     });
            //     if (selected) {
            //         let payment = rec.getSublistValue({
            //             sublistId: SUBLIST_ID,
            //             fieldId: sublistFields[1].ID,
            //             line: i,
            //         });
            //
            //         let docNum = rec.getSublistValue({
            //             sublistId: SUBLIST_ID,
            //             fieldId: sublistFields[2].ID,
            //             line: i,
            //         });
            //         let amount = rec.getSublistValue({
            //             sublistId: SUBLIST_ID,
            //             fieldId: sublistFields[3].ID,
            //             line: i,
            //         });
            //
            //         let invoiceAmount = rec.getSublistValue({
            //             sublistId: SUBLIST_ID,
            //             fieldId: sublistFields[4].ID,
            //             line: i,
            //         });
            //
            //         let date = rec.getSublistValue({
            //             sublistId: SUBLIST_ID,
            //             fieldId: sublistFields[5].ID,
            //             line: i,
            //         });
            //
            //         let customer = rec.getSublistText({
            //             sublistId: SUBLIST_ID,
            //             fieldId: sublistFields[6].ID,
            //             line: i,
            //         });
            //
            //         lineValues.push({
            //             payment,
            //             amount,
            //             invoiceAmount,
            //             line: i,
            //             date,
            //             customer,
            //             docNum,
            //         });
            //     }
            // }
            // log.debug('transfer lines', lineValues);
            // console.log('transfer lines', lineValues);
            const lineValues = getSelectedLines();
            if (lineValues.length) {
                  const userAction = confirm(
                        `NOTICE!\nCreating ${lineValues.length} Transfer Funds \nDo not exit page before refresh \nClick OK to continue`
                  );
                  if (!userAction) return;
            } else {
                  alert('No payment records were selected');
                  return;
            }

            lineValues.forEach((line) => {
                  console.log('Transfer funds details', line);
                  const transferId = generateTransferFunds(line);
                  // rec.selectLine({
                  //     sublistId: 'custscript_payment_for_clearing',
                  //     line: line.line,
                  // });
                  // rec.setCurrentSublistValue({
                  //     sublistId: 'custscript_payment_for_clearing',
                  //     fieldId: 'custscript_transfer_funds',
                  //     value: transferId,
                  // });
                  // rec.commitLine({ sublistId: 'custscript_payment_for_clearing' });
                  // nlapiGetContext().getRemainingUsage = function () {
                  //     return 1000;
                  // };
            });
            clientUt.refreshPage();
      };

      EntryPoints.saveRecord = ({ currentRecord }) => {
            EntryPoints.createTransferFunds();
      };
      return EntryPoints;
});
