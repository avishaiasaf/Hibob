/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */
define(['N/record'],
    function (record) {

        function onRequest(context) {
            try {
                var parameters = context.request.parameters;
                log.debug({
                    title: 'parameters',
                    details: parameters
                })
                var recid = parameters.custparam_recid
                if (recid) {
                    var memoRec = record.load({
                        type: 'creditmemo',
                        id: recid,
                        isDynamic: true,
                    })
    
                    memoRec.setValue({
                        fieldId: 'custbody_ns_customer_approved',
                        value: true,
                    })
                    memoRec.save({
                        enableSourcing: true,
                        ignoreMandatoryFields: true
                    })
                }
               

            } catch (error) {
                log.debug('error', JSON.stringify(error));
            }
        }

        return {
            onRequest: onRequest
        }
    });
