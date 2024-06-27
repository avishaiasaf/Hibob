/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
/*
Name                : BOB_MR_Cash_App.js 
Purpose             : Create Customer Payments for direct Match Invoices and in case if direct match is not there then source best guessed transaction      
Created On          : 12/17/2021
Change Request      : NA
 */
define(['N/record', 'N/search', 'N/runtime', 'N/format', './BOB_lib_constants', 'N/currency'],

    function (record, search, runtime, format, constants, currency) {
        function getInputData() {
            try {

                return customrecord_hb_ar_bank_filesSearchObj = search.create({
                    type: "customrecord_hb_ar_bank_files",
                    filters:
                        [
                            ["isinactive", "is", "F"],
                            "AND",
                            ["custrecord_hb_cashapp_process_status", "anyof", [constants.cashAppStatus.PendingCashApp, constants.cashAppStatus.CreateUnappliedPayment]]
                        ],
                    columns:
                        [
                            search.createColumn({ name: "custrecord_hb_deposit_account" }),
                            search.createColumn({ name: "custrecord_hb_bank_deposit_date" }),
                            search.createColumn({ name: "custrecord_hb_file_batch_no" }),
                            search.createColumn({ name: "custrecord_hb_sequence_no" }),
                            search.createColumn({ name: "custrecord_hb_remitter_name" }),
                            search.createColumn({ name: "custrecord_hb_invoice_no" }),
                            search.createColumn({ name: "custrecord_hb_invoice_amount" }),
                            search.createColumn({ name: "custrecord_hb_payment_amount" }),
                            search.createColumn({ name: "custrecord_hb_cashapp_process_status" }),
                            search.createColumn({ name: "custrecord_hb_bank_file_name" }),
                            search.createColumn({ name: "custrecord_hb_check_number" }),
                            search.createColumn({ name: "custrecord_hb_best_guess_transaction" }),
                            search.createColumn({ name: "custrecord_hb_bank_account_no" })
                        ]
                });
            }
            catch (e) {
                log.error('error', e)
            }
        }

        function map(context) {
            try {

                var bankData = JSON.parse(context.value);
                log.debug('Map Stage', bankData);

                var childID = bankData.id;
                var bankDetails = bankData.values;
                log.audit("childID", childID)
                log.audit("BANK DATA", bankDetails);
                var remitterName = bankData.values.custrecord_hb_remitter_name;
                log.debug('remitterName', remitterName)
                var invNumber = bankData.values.custrecord_hb_invoice_no;
                var depositDate = bankData.values.custrecord_hb_bank_deposit_date;
                if (depositDate) {
                    depositDate = format.parse({ value: depositDate, type: format.Type.DATE });
                }

                var depositAcct = bankData.values.custrecord_hb_deposit_account;
                var bankFileName = bankData.values.custrecord_hb_bank_file_name;
                var checkNo = bankData.values.custrecord_hb_check_number;

                var batchNo = bankData.values.custrecord_hb_file_batch_no;
                var seqNo = bankData.values.custrecord_hb_sequence_no;
                var bank_acc_num = bankData.values.custrecord_hb_bank_account_no;
			

                var invAmount = Number(bankData.values.custrecord_hb_payment_amount);
                //	var payAmount = Number(bankData.values.custrecord_hb_payment_amount);
                var deposit_amount = Number(bankData.values.custrecord_hb_payment_amount);

                var bestGuessID = bankData.values.custrecord_hb_best_guess_transaction
                var transID = null;

                var cashAppStatus = bankData.values.custrecord_hb_cashapp_process_status.value;
                var bank_ref = bankAccountReference(bank_acc_num)
                var account = bank_ref['account']
                var bank_currency = bank_ref['currency']
                var reclass_required = bank_ref['reclass_required']
                var exchange_rate;
                log.debug('account', account)
                log.debug('reclass_required', reclass_required)

                if (cashAppStatus == constants.cashAppStatus.PendingCashApp) {
                    if (invNumber) {


                        var directMatchCount = 0;

                        //to check if only Numbers are not provided in invoice numbers
                        if (invNumber.substring(0, 3).toUpperCase() == "INV") {
                            log.debug("Direct Match Process")
                            var directMatch = DirectSearch(remitterName, invNumber);
                            directMatchCount = directMatch.runPaged().count;
                            log.debug("direct match result count", directMatchCount);

                            if (directMatchCount == 1) {
                                directMatch.run().each(function (result) {
                                    var invID = result.getValue('internalid');
                                    log.debug('CREATING PAYMENT FOR INVOICE', invID);

                                    // If the invoice currency and the payment currency is different - then failed no match
                                    if (bank_currency != result.getValue('currency')) {
                                        record.submitFields({
                                            type: 'customrecord_hb_ar_bank_files', id: childID,
                                            values: {
                                                custrecord_hb_matching_logic_notes: "Payment currency is different than Invoice currency",
                                                custrecord_hb_cashapp_process_status: constants.cashAppStatus.FailedNoMatch,
                                            }
                                        });
                                        return;
                                    }
									else { // Clear the macthing note from the previous execution if any. 
										record.submitFields({
                                            type: 'customrecord_hb_ar_bank_files', id: childID,
                                            values: {
                                                custrecord_hb_matching_logic_notes: ''
                                            }
									   });
									}

                                    var invAmountDue = result.getValue('fxamountremaining');
                                    var paymentMinRange = Number(invAmount * 0.95).toFixed(2);
                                    var paymentMaxRange = Number(invAmount * 1.05).toFixed(2);

                                    log.debug('invAmountDue', invAmountDue);
                                    log.debug('paymentMinRange' + paymentMinRange, 'paymentMaxRange' + paymentMaxRange);

                                    if(Number(invAmountDue) >= paymentMaxRange){  //Under Payment manually apply
                                        record.submitFields({
                                            type: 'customrecord_hb_ar_bank_files', id: childID,
                                            values: {
                                                custrecord_hb_cashapp_process_status: constants.cashAppStatus.MatchedUnderPayment,
                                            }
                                        });
                                        return;
                                    }
                                    else if(Number(invAmountDue) <= paymentMinRange) {  //Over Payment manually apply
                                        record.submitFields({
                                            type: 'customrecord_hb_ar_bank_files', id: childID,
                                            values: {
                                                custrecord_hb_cashapp_process_status: constants.cashAppStatus.MatchedOverPayment,
                                            }
                                        });
                                        return;
                                    }
                                    else {
                                        //var custPayment = record.create({ type: record.Type.CUSTOMER_PAYMENT, isDynamic: true });
                                        var custPayment = record.transform({
                                            fromType: 'invoice',
                                            fromId: invID,
                                            toType: 'customerpayment'
                                        });

                                        if (depositDate)
                                            custPayment.setValue('trandate', depositDate);


                                        if (account && !reclass_required) {
                                            log.debug('defaulting Account on customer Payment', account)
                                            custPayment.setValue('account', account);
                                        }
                                        else if (account && reclass_required) {
                                            exchange_rate = result.getValue('custbody_il_exchangerate')

                                            invAmount = invAmount / exchange_rate;

                                            log.debug("exchange_rate" + exchange_rate, "invAmount" + invAmount)

                                        }

                                        custPayment.setValue('externalid', new Date().toISOString() + '_' + childID);
                                        custPayment.setValue('paymentmethod', constants.paymentMethod.wire);

                                        custPayment.setValue('custbody_hb_bankdeposit_account', depositAcct)
                                        custPayment.setValue('custbody_hb_remitter_name', remitterName)
                                        custPayment.setValue('custbody_hb_bank_record_source', childID);
                                        custPayment.setValue('memo', bankFileName + ":" + childID);

                                        var applyLines = custPayment.getLineCount('apply')
                                        log.debug('applyLines', applyLines);
                                        for (var i = 0; i < applyLines; i++) {
                                            var apply = custPayment.getSublistValue({ sublistId: 'apply', fieldId: 'apply', line: i })
                                            var amount = custPayment.getSublistValue({ sublistId: 'apply', fieldId: 'total', line: i });
                                            var amountDue = custPayment.getSublistValue({ sublistId: 'apply', fieldId: 'due', line: i });

                                            if (apply) {

                                                log.debug('apply', i)
                                                if (amountDue < invAmount) {

                                                    custPayment.setSublistValue({ sublistId: 'apply', fieldId: 'amount', line: i, value: amountDue });
                                                }
                                                else {
                                                    custPayment.setSublistValue({ sublistId: 'apply', fieldId: 'amount', line: i, value: invAmount });
                                                }

                                                log.debug("Amount Due" + amountDue, "Amount" + amount)

                                                if (invAmount > amount || invAmount > amountDue) {
                                                    log.debug('Amount due is less than Payment Amount', 'defaulting Header Payment')
                                                    custPayment.setValue('payment', invAmount);
                                                }

                                            }
                                        }


                                        try {
                                            transID = custPayment.save();

                                            /*****Create Bank Deposit***/
                                            if (account && reclass_required && transID) {
                                                createBankDeposit(account, transID, depositDate, deposit_amount)
                                            }


                                            /******************/
                                        }
                                        catch (e) {
                                            log.error('error', e);
                                            record.submitFields({
                                                type: 'customrecord_hb_ar_bank_files', id: childID,
                                                values: {
                                                    custrecord_hb_cashapp_process_status: constants.cashAppStatus.PaymentCreationFailed,
                                                    custrecord_hb_transaction_link: invID,
                                                    custrecord_hb_matching_logic_notes: e
                                                }
                                            })

                                            return;
                                        }

                                        log.audit('TRANSACTION ID', transID);
                                        // Get Unapplied Amount from Customer Payment
                                        var customerpaymentSearchObj = search.create({
                                            type: "customerpayment",
                                            filters:
                                                [
                                                    ["type", "anyof", "CustPymt"],
                                                    "AND",
                                                    ["internalidnumber", "equalto", transID],
                                                    "AND",
                                                    ["amountremaining", "isnotempty", ""]
                                                ],
                                            columns:
                                                [search.createColumn({ name: "amountremaining" }),
                                                search.createColumn({ name: "exchangerate" }),

                                                ]
                                        });
                                        var searchResultCount = customerpaymentSearchObj.runPaged().count;
                                        log.debug("customerpaymentSearchObj result count", searchResultCount);
                                        customerpaymentSearchObj.run().each(function (res) {
                                            var unappliedAmount = res.getValue('amountremaining') / res.getValue('exchangerate');
                                            log.debug("UNAPPLIED AMOUNT", unappliedAmount)
                                            var invRemainingAmtObj = search.lookupFields({ type: 'invoice', id: invID, columns: 'amountremaining' })
                                            log.debug('invRemainingAmtObj', invRemainingAmtObj);
                                            var amtRemaining = invRemainingAmtObj.amountremaining / res.getValue('exchangerate')
                                            log.debug('REMAINING AMOUNT ON INVOICE', amtRemaining);

                                            //updated Transaction field mapping from Payment to Invoice
                                            UpdateLockBoxChild(childID, invID, amtRemaining, unappliedAmount, invAmount)


                                        });
                                    }
                                })
                                return;
                            }
                            else {
                                record.submitFields({
                                    type: 'customrecord_hb_ar_bank_files', id: childID,
                                    values: {
                                        custrecord_hb_cashapp_process_status: constants.cashAppStatus.FailedNoMatch,
                                    }
                                })

                            }
                        }

                        // convert the amount in case of reclass for best guess search
                        if (account && reclass_required) {
                            exchange_rate = currency.exchangeRate({
                                source: bank_currency,
                                target: constants.nscurrency.USD,
                                date: depositDate || ''
                            });

                            invAmount = exchange_rate * invAmount;

                            log.debug("exchange_rate" + exchange_rate, "invAmount" + invAmount)

                        }

                        if (directMatchCount == 0 && remitterName) {

                            var remitter_info = RemitterReferenceCheck(remitterName);
                            log.debug('FORMAT', invNumber);

                            var invDoc = 'INV' + remitter_info['tran_prefix'] || '';

                            log.debug('After FORMAT', invDoc);
                            log.debug("Best Guess Process")

                            // Case : only numbers , no INV added to Document Number 
                            if (invNumber.substring(0, invDoc.length).toUpperCase() != invDoc) {
                                var newInvNum1 = invDoc + invNumber;
                                log.debug('newInvNum1', newInvNum1);

                                var bestGuess1 = BestGuessSearch(null, newInvNum1, null, null, bank_currency);
                                if (bestGuess1.runPaged().count == 0) {
                                    if (currencyValidation(bank_currency, remitterName, childID)) return; // Check customer primary currency and bank currency are same else stop the process.
                                    RemitterCheck(remitterName, invAmount, childID, bank_currency);

                                }
                                else {
                                    var guessID = GetTransactionID(bestGuess1);
                                    log.debug('guessID-bestGuess1', guessID);
                                    if (guessID) {
                                        record.submitFields({
                                            type: 'customrecord_hb_ar_bank_files', id: childID,
                                            values: {
                                                custrecord_hb_best_guess_transaction: guessID,
                                                custrecord_hb_cashapp_process_status: constants.cashAppStatus.PendingConfirmationGuess,
                                            }
                                        });
                                    }
                                }
                            }

                            // Case : Remove '-' from #Invoice if present
                            else if (invNumber.indexOf('-') != -1) {
                                var newInvNum = invNumber.replace(/-/g, "");
                                var bestGuess = BestGuessSearch(null, newInvNum.toUpperCase(), null, null, bank_currency);
                                if (bestGuess.runPaged().count == 0) {
                                    if (currencyValidation(bank_currency, remitterName, childID)) return; // Check customer primary currency and bank currency are same else stop the process.
                                    RemitterCheck(remitterName, invAmount, childID, bank_currency);
                                }
                                else {
                                    var guessID = GetTransactionID(bestGuess);
                                    log.debug('guessID-bestGuess', guessID);
                                    if (guessID) {
                                        record.submitFields({
                                            type: 'customrecord_hb_ar_bank_files', id: childID,
                                            values: {
                                                custrecord_hb_best_guess_transaction: guessID,
                                                custrecord_hb_cashapp_process_status: constants.cashAppStatus.PendingConfirmationGuess,
                                            }
                                        })
                                    }
                                    else {
                                        record.submitFields({
                                            type: 'customrecord_hb_ar_bank_files', id: childID,
                                            values: {
                                                custrecord_hb_cashapp_process_status: constants.cashAppStatus.FailedNoMatch,
                                            }
                                        })
                                    }
                                }

                            }
                            else if (remitterName) {
                                log.debug('Invoice Number Invalid', 'RemitterCheck called');
                                if (currencyValidation(bank_currency, remitterName, childID)) return; // Check customer primary currency and bank currency are same else stop the process.
                                RemitterCheck(remitterName, invAmount, childID, bank_currency);

                            }
                            else {
                                record.submitFields({
                                    type: 'customrecord_hb_ar_bank_files', id: childID,
                                    values: {
                                        custrecord_hb_cashapp_process_status: constants.cashAppStatus.FailedNoMatch,
                                    }
                                })
                            }
                        }
                        else {
                            record.submitFields({
                                type: 'customrecord_hb_ar_bank_files', id: childID,
                                values: {
                                    custrecord_hb_cashapp_process_status: constants.cashAppStatus.FailedNoMatch,
                                }
                            })
                        }


                    }
                    else if (remitterName && !invNumber) {

                        // convert the amount in case of reclass for best guess search

                        if (account && reclass_required) {
                            exchange_rate = currency.exchangeRate({
                                source: bank_currency,
                                target: constants.nscurrency.USD,
                                date: depositDate || ''
                            });

                            invAmount = exchange_rate * invAmount;

                            log.debug("exchange_rate" + exchange_rate, "invAmount" + invAmount)

                        }

                        log.debug('REMIT AND NO INV', invNumber);

                        if (currencyValidation(bank_currency, remitterName, childID)) return; // Check customer primary currency and bank currency are same else stop the process.

                        RemitterCheck(remitterName, invAmount, childID, bank_currency);
                    }
                    else {
                        record.submitFields({
                            type: 'customrecord_hb_ar_bank_files', id: childID,
                            values: {
                                custrecord_hb_cashapp_process_status: constants.cashAppStatus.FailedNoMatch,
                            }
                        })
                    }
                }
                else if (cashAppStatus == constants.cashAppStatus.CreateUnappliedPayment) {

                    log.debug("Unapplied Payment Creation")
                    var customer = RemitterReferenceCheck(remitterName)['customer_id'];

                    var custPayment = record.create({ type: record.Type.CUSTOMER_PAYMENT });

                    custPayment.setValue('customer', customer);

                    if (account && !reclass_required) {
                        custPayment.setValue('account', account);
                        custPayment.setValue('currency', bank_currency);

                    }
                    else if (account && reclass_required) {
                        exchange_rate = currency.exchangeRate({
                            source: bank_currency,
                            target: constants.nscurrency.USD,
                            date: depositDate || ''
                        });

                        invAmount = exchange_rate * invAmount;
                        custPayment.setValue('currency', constants.nscurrency.USD);
                        log.debug("exchange_rate" + exchange_rate, "invAmount" + invAmount)

                    }
                    custPayment.setValue('externalid', new Date().toISOString() + '_' + childID);
                    custPayment.setValue('paymentmethod', constants.paymentMethod.wire);
                    if (depositDate)
                        custPayment.setValue('trandate', depositDate);
                    custPayment.setValue('custbody_hb_bankdeposit_account', depositAcct)
                    custPayment.setValue('custbody_hb_remitter_name', remitterName)
                    custPayment.setValue('custbody_hb_bank_record_source', childID);
                    custPayment.setValue('memo', bankFileName + ":" + childID);
                    custPayment.setValue('payment', invAmount);
                    try {
                        transID = custPayment.save();

                        log.audit('TRANSACTION ID', transID);
                        /*****Create Bank Deposit***/
                        if (account && reclass_required && transID) {
                            createBankDeposit(account, transID, depositDate, deposit_amount)
                        }

                    }
                    catch (e) {
                        log.error('error', e);
                        record.submitFields({
                            type: 'customrecord_hb_ar_bank_files', id: childID,
                            values: {
                                custrecord_hb_cashapp_process_status: constants.cashAppStatus.PaymentCreationFailed,
                                custrecord_hb_matching_logic_notes: e
                            }
                        })

                        return;
                    }
                    record.submitFields({
                        type: 'customrecord_hb_ar_bank_files', id: childID,
                        values: {
                            custrecord_hb_cashapp_process_status: constants.cashAppStatus.UnappliedPaymentCreated,
                            custrecord_hb_transaction_link: transID
                        }
                    })
                }
            }
            catch (e) {
                log.error('error', e)
            }
        }

        // Direct Match on Invoice
        function DirectSearch(remitterName, invNumber) {
            log.debug('remit name', remitterName)
            var filters = [];
            var columns = [];
            filters.push(['type', 'anyof', ["CustInvc"]], "AND",
                ['mainline', 'is', 'T'], "AND",
                ['status', 'anyof', ["CustInvc:A"]], "AND",
                [['tranid', 'is', invNumber]]
            );

            columns.push(search.createColumn({ name: 'datecreated', sort: search.Sort.DESC }));
            columns.push(search.createColumn({ name: 'internalid' }));
            columns.push(search.createColumn({ name: 'type' }));
            columns.push(search.createColumn({ name: 'tranid' }))
            columns.push(search.createColumn({ name: "companyname", join: "customer" }));
            columns.push(search.createColumn({ name: 'amount' }));
            columns.push(search.createColumn({ name: 'recordtype' }));
            columns.push(search.createColumn({ name: 'amountremaining' }));
            columns.push(search.createColumn({ name: 'custbody_il_exchangerate' }));
            columns.push(search.createColumn({ name: 'currency' }));
            columns.push(search.createColumn({ name: 'fxamountremaining' }));

            var directMatchObj = search.create({ type: "transaction", filters: filters, columns: columns });
            return directMatchObj;

        }
        // Updating LockBox Child record
        function UpdateLockBoxChild(childID, transID, amtRemaining, unappliedAmt, invAmount) {


            if ((amtRemaining == 0.00 && !unappliedAmt) || unappliedAmt == amtRemaining) {
                record.submitFields({
                    type: 'customrecord_hb_ar_bank_files', id: childID,
                    values: {
                        custrecord_hb_transaction_link: transID,
                        custrecord_hb_cashapp_process_status: constants.cashAppStatus.SucessMatched,
						custrecord_hb_matching_logic_notes: ''
                    }
                })
            }
            else if (amtRemaining > 0) {
                record.submitFields({
                    type: 'customrecord_hb_ar_bank_files', id: childID,
                    values: {
                        custrecord_hb_transaction_link: transID,
                        custrecord_hb_cashapp_process_status: constants.cashAppStatus.MatchedUnderPayment,
                        custrecord_hb_matching_logic_notes: 'Under Payment by' + ' ' + amtRemaining.toFixed(2)
                    }
                });
            }
            else if (unappliedAmt != parseFloat(0.00) || amtRemaining < 0) {
                if (unappliedAmt) {
                    record.submitFields({
                        type: 'customrecord_hb_ar_bank_files', id: childID,
                        values: {
                            custrecord_hb_transaction_link: transID,
                            custrecord_hb_cashapp_process_status: constants.cashAppStatus.MatchedOverPayment,
                            custrecord_hb_matching_logic_notes: 'Over Payment by' + ' ' + unappliedAmt.toFixed(2)
                        }
                    })
                }

            }
        }

        function BestGuessSearch(remitterName, invNumber, minrange, maxrange, bank_currency) {
            log.debug('remit name', remitterName);
            log.debug('invNumber', invNumber);
            var filters = [];
            var columns = [];
            if (remitterName) {
                var remitRef = RemitterReferenceCheck(remitterName)['companyname'];
            }
            log.debug('remitRef', remitRef);
            filters.push(['type', 'anyof', ["CustInvc"]], "AND", ['mainline', 'is', 'T'], "AND",
                ['status', 'anyof', ["CustInvc:A"]], "AND", ['currency', 'anyof', bank_currency], "AND");
            if (remitterName) {
                if (!remitRef) {
                    filters.push(['customer.companyname', 'is', remitterName], "AND");
                }
                else {
                    filters.push(['customer.companyname', 'is', remitRef], "AND");
                }
                filters.push(['fxamountremaining', 'between', [minrange, maxrange]]);
            }
            if (invNumber) {
                filters.push(['tranid', 'is', invNumber]);

            }

            columns.push(search.createColumn({ name: 'datecreated', sort: search.Sort.ASC }));
            columns.push(search.createColumn({ name: 'internalid' }));
            columns.push(search.createColumn({ name: 'type' }));
            columns.push(search.createColumn({ name: 'tranid' }))
            //columns.push(search.createColumn({ name: "companyname", join: "customermain" }));
            columns.push(search.createColumn({ name: 'amount' }));
            columns.push(search.createColumn({ name: 'recordtype' }));
            columns.push(search.createColumn({ name: 'amountremaining' }));
            var bestGuessObj = search.create({ type: "transaction", filters: filters, columns: columns });
            return bestGuessObj;

        }

        // Get Transaction ID for best guess search
        function GetTransactionID(bestGuessObj) {
            if (!bestGuessObj)
                return false;
            var internalID;
            bestGuessObj.run().each(function (result) {
                log.debug('id', result.getValue('internalid'))
                internalID = result.getValue('internalid');
                return true;
            });
            return internalID;
        }

        // Check with +/- 5 % threshold on Invoice Amount
        function RemitterCheck(remitterName, invAmount, childID, bank_currency) {
            var minRange = Number(invAmount * 0.95).toFixed(2);
            var maxRange = Number(invAmount * 1.05).toFixed(2);
            log.debug('THRESHOLD VALUES', 'MIN RANGE' + '>' + minRange + ' ' + 'MAX RANGE' + '>' + maxRange);
            var bestGuess = BestGuessSearch(remitterName, null, minRange, maxRange, bank_currency);
            log.debug('count', bestGuess.runPaged().count)

            if (bestGuess.runPaged().count > 0) {

                var internalIDs;
                bestGuess = bestGuess.run().getRange({
                    start: 0,
                    end: 1
                });
                if (bestGuess && bestGuess.length > 0) {
                    internalIDs = bestGuess[0].id;
                    log.debug('internalIDs', internalIDs)
                    record.submitFields({
                        type: 'customrecord_hb_ar_bank_files', id: childID,
                        values: {
                            custrecord_hb_best_guess_transaction: internalIDs,
                            custrecord_hb_cashapp_process_status: constants.cashAppStatus.PendingConfirmationGuess,
                        }
                    })

                }
                else {
                    record.submitFields({
                        type: 'customrecord_hb_ar_bank_files', id: childID,
                        values: {
                            custrecord_hb_cashapp_process_status: constants.cashAppStatus.FailedNoMatch,
                        }
                    });
                }

            }
            else {
                record.submitFields({
                    type: 'customrecord_hb_ar_bank_files', id: childID,
                    values: {
                        custrecord_hb_cashapp_process_status: constants.cashAppStatus.FailedNoMatch,
                    }
                })
            }
            return true;


        }

        // Remitter Refernce Custom record check 
        function RemitterReferenceCheck(remitterName) {
            log.debug('remitterName', remitterName)
            var customrecord_remitter_netsuite_cross_refSearchObj = search.create({
                type: "customrecord_remitter_netsuite_cross_ref",
                filters:
                    [
                        ["isinactive", "is", "F"], "AND", ["custrecord_crossref_remitter_name", "is", remitterName]
                    ],
                columns:
                    [
                        search.createColumn({ name: "id" }),
                        search.createColumn({ name: "custrecord_crossref_netsuite_companyname" }),
                        search.createColumn({ name: "tranprefix", join: "custrecord_crossref_customer_subsidiary" }),
                        search.createColumn({ name: "custrecord_crossref_netsuite_customer" }),
                        search.createColumn({ name: "currency", join: "custrecord_crossref_netsuite_customer" })
                    ]
            });
            var searchResultCount = customrecord_remitter_netsuite_cross_refSearchObj.runPaged().count;
            var companyName;
            var tran_prefix;
            var customer_ID;
            var customer_Currency;
            log.debug("customrecord_remitter_netsuite_cross_refSearchObj result count", searchResultCount);
            customrecord_remitter_netsuite_cross_refSearchObj.run().each(function (result) {
                companyName = result.getValue('custrecord_crossref_netsuite_companyname');
                customer_ID = result.getValue('custrecord_crossref_netsuite_customer');
                tran_prefix = result.getValue({ name: "tranprefix", join: "custrecord_crossref_customer_subsidiary" });
                customer_Currency = result.getValue({ name: "currency", join: "custrecord_crossref_netsuite_customer" });
                return true;
            });

            var RemitterReferenceInfo = new Array()
            RemitterReferenceInfo['companyname'] = companyName;
            RemitterReferenceInfo['tran_prefix'] = tran_prefix;
            RemitterReferenceInfo['customer_id'] = customer_ID;
            RemitterReferenceInfo['customer_Currency'] = customer_Currency;

            return RemitterReferenceInfo;
        }

        //Bank Reference custom record check to get Bank Account
        function bankAccountReference(bank_acc_num) {
            log.debug('bank check', bank_acc_num);
            var bankRef = {};
            var customrecord_bank_acc_ref_mapperSearchObj = search.create({
                type: "customrecord_bankaccount_cross_ref",
                filters:
                    [
                        ["custrecord_bankaccount_number", "is", bank_acc_num]
                    ],
                columns:
                    [
                        search.createColumn({ name: "custrecord_netsuite_bank_account" }),
                        search.createColumn({ name: "custrecord_bankaccount_currency" }),
                        search.createColumn({ name: "custrecord_bankaccount_reclass_req" }),

                    ]
            });
            var searchResultCount = customrecord_bank_acc_ref_mapperSearchObj.runPaged().count;
            log.debug("customrecord_bank_acc_ref_mapperSearchObj result count", searchResultCount);
            customrecord_bank_acc_ref_mapperSearchObj.run().each(function (result) {

                var bankaccount = result.getValue('custrecord_netsuite_bank_account');
                var bankcurrency = result.getValue('custrecord_bankaccount_currency');
                var reclass_required = result.getValue('custrecord_bankaccount_reclass_req');

                bankRef['account'] = bankaccount;
                bankRef['currency'] = bankcurrency;
                bankRef['reclass_required'] = reclass_required;

                return true;
            });
            return bankRef;
        }

        // Create Bank Deposit
        function createBankDeposit(account, transID, depositDate, invAmount) {
            /*****Create Bank Deposit***/

            log.debug('deposit Creation')
            var deposit_rec = record.create({
                type: record.Type.DEPOSIT,
                defaultValues: {
                    'account': account,
                    'deposits': transID,
                },
                isDynamic: true
            });
            if (depositDate)
                deposit_rec.setValue('trandate', depositDate);


            if (deposit_rec.getSublistValue('payment', 'id', 0) == transID) {
                deposit_rec.selectLine({ sublistId: 'payment', line: 0 });
                deposit_rec.setCurrentSublistValue({ sublistId: 'payment', fieldId: 'paymentamount', value: invAmount });
                deposit_rec.setCurrentSublistValue({ sublistId: 'payment', fieldId: 'deposit', value: true });
                deposit_rec.commitLine({ sublistId: 'payment' });

                var deposite_recid = deposit_rec.save();

                log.audit('deposite_recid', deposite_recid)
            }

            /******************/
        }

        function currencyValidation(bank_currency, remitterName, childID) {

            var customerPrimaryCurrency = RemitterReferenceCheck(remitterName)['customer_Currency'];
			log.debug('bank_currency', bank_currency);
			log.debug('customerPrimaryCurrency', customerPrimaryCurrency);
			
            if (bank_currency != customerPrimaryCurrency) {
                log.debug('Currency Check', 'Payment currency is different than Remitter currency');
                record.submitFields({
                    type: 'customrecord_hb_ar_bank_files',
                    id: childID,
                    values: {
                        custrecord_hb_matching_logic_notes: "Payment currency is different than Remitter currency",
                        custrecord_hb_cashapp_process_status: constants.cashAppStatus.FailedNoMatch,
                    }
                });
                return true;
            }
			else{ // Clear the macthing note from the previous execution if any. 	
				record.submitFields({
						type: 'customrecord_hb_ar_bank_files', id: childID,
						values: {
						custrecord_hb_matching_logic_notes: ''
						}
				});
			}
            return false;
        }

        return {
            getInputData: getInputData,
            map: map
        };

    });