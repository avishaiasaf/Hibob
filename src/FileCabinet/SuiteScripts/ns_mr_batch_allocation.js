/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(
    [
        'N/record',
        'N/search',
        'N/runtime',
        'N/file',
        'N/error'
    ],
    /**
 * @param{record} record
 * @param{search} search
 * @param{runtime} runtime
 * @param{file} file
 * @param{error} error
 */
    (record, search, runtime, file, error) => {

        const getInputData = (inputContext) => {
            var intJobFileId = runtime.getCurrentScript().getParameter({name: 'custscript_ns_payment_file_id'});
            log.debug('getTransactionToProcess', 'intJobFileId: ' + intJobFileId);
            var objJobFile = file.load({
                id: intJobFileId
            })
            var objJobFileContent = JSON.parse(objJobFile.getContents());
            log.debug('getInputData ', "objJobFile:" +JSON.stringify(objJobFileContent));

            log.debug('getInputData', 'arrPaymentsProcessGroupedByCustomer: ' + JSON.stringify(arrPaymentsProcessGroupedByCustomer));

            return arrPaymentsProcessGroupedByCustomer;
        }


/*{
  "customerId": "1289",
  "apply": [
    {
      "strTransactionReferenc": "Invoice_grp_0001",
      "intAccountId": "1761",
      "intARAccountId": "1761",
      "fltPaymentAmount": "1600",
      "fltApplyAmount": "750.00",
      "intCustomerId": "1289",
      "objCurrentLineJsonData": {
        "ID": "3659183",
        "GROUP Ref ": "Invoice_grp_0001",
        "Type": "Sales Invoice",
        "Date": "9/7/2023",
        "Amount": "750.00",
        "Amount Paid": ".00",
        "Amount Remaining": "750.00",
        "Period": "Jul 2023",
        "Tax Period": "Jul 2023",
        "Document Number": "INV_024608",
        "Name": "CUS_000214 Beijing Institute Of Technology",
        "Customer_ID_HIDDEN": "1289"
      }
    },
    {
      "strTransactionReferenc": "Invoice_grp_0001",
      "intAccountId": "1761",
      "intARAccountId": "1761",
      "fltPaymentAmount": "1600",
      "fltApplyAmount": "850.00",
      "intCustomerId": "1289",
      "objCurrentLineJsonData": {
        "ID": "3659184",
        "GROUP Ref ": "Invoice_grp_0001",
        "Type": "Sales Invoice",
        "Date": "9/7/2023",
        "Amount": "850.00",
        "Amount Paid": ".00",
        "Amount Remaining": "850.00",
        "Period": "Jul 2023",
        "Tax Period": "Jul 2023",
        "Document Number": "INV_024609",
        "Name": "CUS_000214 Beijing Institute Of Technology",
        "Customer_ID_HIDDEN": "1289"
      }
    }
  ]
}*/
        const map = (mapContext) => {
            var objCustomerPayment = JSON.parse(mapContext.value);
            log.debug('getTransactionToProcess - transactionObj', objCustomerPayment);
            var intCustomerId = objCustomerPayment.customerId;
            var arrApplyTransaction = objCustomerPayment.apply;

            var strTransactionReferenc = arrApplyTransaction[0].strTransactionReferenc;
            var intAccountId = arrApplyTransaction[0].intAccountId;
            var intARAccountId = arrApplyTransaction[0].intARAccountId;
            var strCustomerName = arrApplyTransaction[0].objCurrentLineJsonData.Name;
            var flTotalAmountToApply = 0;
            for (var index in arrApplyTransaction) {
                flTotalAmountToApply += parseFloat(arrApplyTransaction[index].fltApplyAmount);
                log.debug('getTransactionToProcess - flTotalAmountToApply_' + index, flTotalAmountToApply);

                var objCustomerPaymentRec = record.create({
                    type: record.Type.CUSTOMER_PAYMENT,
                    isDynamic: true
                });
            }

            log.debug('getTransactionToProcess - flTotalAmountToApply', flTotalAmountToApply);

            objCustomerPaymentRec.setValue({fieldId: 'customer', value: intCustomerId});
            objCustomerPaymentRec.setValue({fieldId: 'account', value: intAccountId});
            objCustomerPaymentRec.setValue({fieldId: 'aracct', value: intARAccountId});
            objCustomerPaymentRec.setValue({fieldId: 'payment', value: flTotalAmountToApply});
            objCustomerPaymentRec.setValue({fieldId: 'memo', value: strTransactionReferenc});
            log.debug('getTransactionToProcess - intARAccountId', intARAccountId);
            log.debug('getTransactionToProcess - intARAccountId', intARAccountId);

            objCustomerPaymentRec.setValue({fieldId: 'intARAccountId', value: intARAccountId});

            // Selecting Invoices logic
            var flTotalAmountApplied = 0;
            var intLineCount = objCustomerPaymentRec.getLineCount({ sublistId: 'apply'});
            for (var k = 0; k < intLineCount; k++) {
                var intInvoiceId = objCustomerPaymentRec.getSublistValue({
                    sublistId: 'apply',
                    fieldId: 'internalid',
                    line: k
                });

                for (var index in arrApplyTransaction) {
                    var objCurrentInvoice = arrApplyTransaction[index];
                    var objCurrentInvoiceId = objCurrentInvoice.objCurrentLineJsonData.ID;
                    var fltApplyAmount = objCurrentInvoice.fltApplyAmount;

                    if (intInvoiceId == objCurrentInvoiceId) {
                        log.debug('getTransactionToProcess - stInvoiceId', "fltApplyAmount: " + fltApplyAmount + ", objCurrentInvoiceId: " + objCurrentInvoiceId+ ", intInvoiceId: " + intInvoiceId);
                        objCustomerPaymentRec.selectLine({
                            sublistId: 'apply',
                            line: k
                        });

                        objCustomerPaymentRec.setCurrentSublistValue({
                            sublistId: 'apply',
                            fieldId: 'apply',
                            value: true
                        });
                        objCustomerPaymentRec.setCurrentSublistValue({
                            sublistId: 'apply',
                            fieldId: 'amount',
                            value: fltApplyAmount
                        });
                        objCustomerPaymentRec.commitLine({sublistId: 'apply'});

                        flTotalAmountApplied += objCustomerPaymentRec.getSublistValue({
                            sublistId: 'apply',
                            fieldId: 'amount',
                            line: k
                        });

                    }
                }
            }
            // -------------------

            var intSavedCustomerPaymentId = objCustomerPaymentRec.save();
            var objPaymentsFields = search.lookupFields({
                type: search.Type.CUSTOMER_PAYMENT,
                id: intSavedCustomerPaymentId,
                columns: ['tranid']
            });
            var strPaymentTranId = objPaymentsFields.tranid
            updateJobStatusFile({
                intPaymentId: intSavedCustomerPaymentId,
                intPaymentTranId: strPaymentTranId,
                flTotalAmountApplied: flTotalAmountApplied,
                strCustomerName: strCustomerName
            })

            log.debug('END, intSavedCustomerPaymentId: ' +intSavedCustomerPaymentId);
        }





        function updateJobStatusFile(result) {

            var intJobFileId = runtime.getCurrentScript().getParameter({name: 'custscript_ns_payment_file_id'});
            log.debug('getTransactionToProcess', 'intJobFileId: ' + intJobFileId);
            var objJobFile = file.load({
                id: intJobFileId
            })
            var objJobFileContent = JSON.parse(objJobFile.getContents());
            if(objJobFileContent.results){
                objJobFileContent.results.push(result);
                objJobFile.contents = JSON.stringify(objJobFileContent);
                objJobFile.save();
                log.debug('getTransactionToProcess', 'objJobFile.folder: ' + objJobFile.folder +', objJobFile.name: ' + objJobFile.name);

                var objNewJobFile = file.create({
                    folder: objJobFile.folder,
                    name: objJobFile.name,
                    fileType: file.Type.PLAINTEXT,
                    contents: JSON.stringify(objJobFileContent),
                });

                var intNewJobFileId = objNewJobFile.save();
                log.debug('getTransactionToProcess', 'JobFile Saved: ' + intNewJobFileId);

            }
        }
        const summarize = (summaryContext) => {
            handleErrorIfAny(summaryContext);
        }

        function handleErrorIfAny(summary) {
            var inputSummary = summary.inputSummary;
            var mapSummary = summary.mapSummary;
            var reduceSummary = summary.reduceSummary;

            if (inputSummary.error)
            {
                var e = error.create({
                    name: 'INPUT_STAGE_FAILED',
                    message: inputSummary.error
                });
                handleErrorAndSendNotification(e, 'getInputData');
            }

            handleErrorInStage('map', mapSummary);
            handleErrorInStage('reduce', reduceSummary);
        }
        function handleErrorInStage(stage, summary) {
            var errorMsg = [];
            summary.errors.iterator().each(function(key, value){
                var msg = 'Failure to reduce: ' + key + '. Error was: ' + JSON.parse(value).message + '\n';
                errorMsg.push(msg);
                return true;
            });
            if (errorMsg.length > 0)
            {
                var e = error.create({
                    name: 'ERRROR',
                    message: JSON.stringify(errorMsg)
                });
                handleErrorAndSendNotification(e, stage);
            }
        }
        function handleErrorAndSendNotification(e, stage) {
            log.error('Stage: ' + stage + ' failed', e);
            return;
        }

        return {getInputData, map, summarize}

    });
