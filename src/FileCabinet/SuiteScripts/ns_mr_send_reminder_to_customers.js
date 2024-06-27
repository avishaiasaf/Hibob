/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/search', 'N/email'], function (search, email) {

    function getInputData() {
        try {
            var creditmemoSearchObj = search.create({
                type: "creditmemo",
                filters:
                    [
                        ["type", "anyof", "CustCred"],
                        "AND",
                        [["trandate", "onorbefore", "fivedaysago"], "AND", ["trandate", "onorafter", "01/01/2023"]],
                        "AND",
                        ["mainline", "is", "T"]
                    ],
                columns:
                    [
                        search.createColumn({ name: "internalid", label: "internalid" }),
                        search.createColumn({ name: "entity", label: "Customer" }),
                    ]
            });
            return creditmemoSearchObj;
        } catch (err) {
            log.error('Get Input ERROR', err);
        }
    }

    function map(context) {
        try {

            var objData = JSON.parse(context.value);
            log.debug({
                title: 'objData',
                details: objData
            })

            log.debug({
                title: 'entity',
                details: objData.values.entity.value
            })
            var customerid = objData.values.entity.value
            var companyName = getCustomerCompany(objData.id)
            var trxName = getTrxName(objData.id)
            var customerEmail = getCustomerEmail(customerid)
            var emailBody = 'Dear ' + companyName + '<br />'
            emailBody += '<br />'
            emailBody += 'Gentle reminder to approve the following Credit memo ' + trxName + '<br />'
            emailBody += 'Best regards.<br />'
            email.send({
                author: 233077,
                body: emailBody,
                recipients: customerEmail,
                // cc: [''],
                subject: 'Approval Reminder',
                // relatedRecords: {
                //     entityId: recipient,
                //     transactionId: invId
                // }
            })
        } catch (err) {
            log.error('Map ERROR', err);
        }
    }

    function reduce(context) {

    }

    function summarize(summary) {
        log.debug('COMPLETE', summary);
    }

    function getCustomerCompany(id) {
        var searchObj = search.create({
            type: "transaction",
            filters: ["internalid", "is", id],
            columns: [
                search.createColumn({
                    name: "companyname",
                    join: "customer",
                    label: "Company Name"
                })
            ],
        }).run();

        var searchResult = searchObj.getRange(0, 1);
        if (searchResult.length > 0) {
            return searchResult[0].getValue({
                name: "companyname",
                join: "customer",
            });
        }

    }
    function getCustomerEmail(id) {
        var searchObj = search.create({
            type: "customer",
            filters: ["internalid", "is", id],
            columns: [
                search.createColumn({
                    name: "email",
                    label: "email"
                })
            ],
        }).run();

        var searchResult = searchObj.getRange(0, 1);
        if (searchResult.length > 0) {
            return searchResult[0].getValue({
                name: "email",
            });
        }

    }
    function getTrxName(id) {
        var searchObj = search.create({
            type: "transaction",
            filters: ["internalid", "is", id],
            columns: [
                search.createColumn({
                    name: "tranid",
                }),
            ],
        }).run();

        var searchResult = searchObj.getRange(0, 1);
        if (searchResult.length > 0) {
            return searchResult[0].getValue({
                name: "tranid",
            });
        }

    }

    return {
        getInputData: getInputData,
        map: map,
        // reduce: reduce,
        summarize: summarize
    }
});
