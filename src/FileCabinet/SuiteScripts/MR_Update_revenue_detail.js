/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
/*
Name                : Update Revenue Detail.js 
Purpose             : Update revenue detail     
Created On          : 20/03/2023
Created By          : Daniel@finance4.cloud @Dsair92
 */
define(['N/record', 'N/search','N/query', 'N/runtime', 'N/format', 'N/currency'],
    function (record, search, query,runtime, format,  currency) {
        var exports = {}
        function getInputData() {
            try {
                var rev_detail_search = search.create({
                    type: "customrecordzab_revenue_detail",
                    filters:
                    [
                       ["custrecordzab_rd_status","anyof","3"]
                    ],
                    columns:
                    [
                       "custrecordzab_rd_customer",
                       "scriptid",
                       "custrecordzab_rd_parent",
                       "custrecordzab_rd_status",
                       "custrecordzab_rd_accounting_book",
                       "custrecordzab_rd_item",
                       "custrecordzab_rd_quantity",
                       "custrecordzab_rd_description",
                       "custrecordzab_rd_sales_amount",
                       "custrecordzab_rd_disc_sales_amount",
                       "custrecordzab_rd_revenue_type",
                       "custrecordzab_rd_revenue_date",
                       "custrecordzab_rd_start_date",
                       "custrecordzab_rd_end_date",
                       "custrecordzab_rd_revenue_element",
                       "custrecordzab_rd_system_generated",
                       "custrecordzab_rd_bill_to_customer",
                       "custrecordzab_rd_department",
                       "custrecordzab_rd_location",
                       "custrecordzab_rd_class"
                    ]
                 });
                var rev_detail_array = [];
                var rev_detail_filter = [];
                rev_detail_filter.push("record","anyof")
                var resultset = rev_detail_search.run();
                var s = [];
                var searchid = 0;
                do {
                    var resultslice = resultset.getRange(searchid, searchid + 1000);
                    for (var rs in resultslice) {
                        s.push(resultslice[rs]);
                        searchid++;
                    } 
                } while (resultslice != null && resultslice.length >= 1000); 
                if (s != null) {
                    for (var i = 0; i < s.length; i++) {
                        rev_detail_array.push({
                            rd_id : s[i].id,
                            rd_quantity: s[i].getValue({ name: 'custrecordzab_rd_quantity' }),
                            rd_sales_amount: s[i].getValue({ name: 'custrecordzab_rd_sales_amount' }),
                        });
                    }
                }
                var rd_count = rev_detail_array.length 
                log.debug({
                    title: 'rev_detail_count',
                    details:  rd_count
                });               
                log.debug({
                    title: 'rev_detail',
                    details: rev_detail_array
                });
                return rev_detail_array
            }
            catch (e) {
                log.error('error', e)
            }
        }

        function map(context) {
            try {
                var data = JSON.parse(context.value);
                log.debug({
                    title: context.key,
                    details: data
                })
                var billingrevenueeventSearchObj = search.create({
                    type: "billingrevenueevent",
                    filters:
                    [
                       ["eventtype","anyof","1"], 
                       "AND", 
                       ["eventpurpose","anyof","ACTUAL"], 
                       "AND", 
                       ["record","anyof",data.rd_id], 
                    ],
                   
                });
                var billing_event_rs = billingrevenueeventSearchObj.run().getRange(0,1);
                    
                    log.debug({
                        title: 'billing_event_rs',
                        details: billing_event_rs[0]
                    })
                record.submitFields({
                    type: record.Type.BILLING_REVENUE_EVENT,
                    id:  billing_event_rs[0].id,
                    values: {
                        quantity : data.rd_quantity,
                        amount : Number(data.rd_sales_amount)
                    }
                });
                record.submitFields({
                    type: 'customrecordzab_revenue_detail',
                    id:  data.rd_id ,
                    values: {
                        custrecordzab_rd_status : 5
                    }
                });
                log.debug({
                    title: 'all Done',
                    details: data.rd_id
                })
                
            }catch(e){
                log.error('error',e);
            }
        }
        exports.getInputData = getInputData
        exports.map = map
        return exports
        //Custom Function
        function isNullOrEmpty(val) {
            if (typeof (val) == 'undefined' || val == null || (typeof (val) == 'string' && val.length == 0)) {
                return true;
            }
            return false;
        }
        function formatDate(value){
            var responseDate=format.parse({value:value,type:format.Type.DATE});
            return responseDate
        }
    }
);	