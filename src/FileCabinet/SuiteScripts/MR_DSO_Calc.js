/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
/*
Name                : MR Subscription indication.js 
Purpose             : Create Indication for first invoice from zab subscritpion for approval flow BOB-1251   
Created On          : 19/04/2023
Created By          : Daniel@finance4.cloud @Dsair92
 */
define(['N/record', 'N/search','N/query', 'N/runtime', 'N/format', 'N/currency'],
    function (record, search, query,runtime, format,  currency) {
        var exports = {}
        function getInputData() {
            try {
                var script = runtime.getCurrentScript();
                var search_cus = script.getParameter({ name: "custscript_dso_search_cust" });
                log.debug('Triggerd_FF', search_cus)              
                const FF_Search = search.load({
                    id: search_cus               
                })
                var IB = [];
                var resultset = FF_Search.run();
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
                    log.debug('debug',s);
                    return s 
                }
            }
            catch (e) {
                log.error('error', e)
            }
        }

        function map(context) {
            try {
                var data = JSON.parse(context.value);
                var numerator = query.runSuiteQL({query:`                
                select 
                    t.entity,
                    sum(FOREIGNTOTAL / calc_totat * case when (DUEDATE - TRANDATE) = 0 then 1 else (DUEDATE - TRANDATE)  end ) calc_per 
                        from TRANSACTIOn T
                            left join (
                                select
                                    entity Cust,
                                    sum(FOREIGNTOTAL) calc_totat
                                        from TRANSACTIOn
                                    where trandate >= sysdate - 365 and TYPE = 'CustInvc' and posting = 'T'
                                group by entity) Total on Total.Cust = T.ENTITY
                            where T.TYPE = 'CustInvc'
                            and t.ENTITY = ${data.id}
                            and t.trandate >= sysdate - 365
                            and t.posting = 'T'
                        group by t.entity 
            `}).asMappedResults();
            var base  = query.runSuiteQL({query:`        
            select 
                    id,
                    db.*
                from customer c
                  left join (
                    select t.entity                                               cus,
                    sum(round(FOREIGNTOTAL / total_amt_fx, 4) * case when DAYSOPEN = 0 then 1 else DAYSOPEN end)         calc
                        from TRANSACTIOn T
                            left join (
                                select entity            Cust,
                                sum(FOREIGNTOTAL) total_amt_fx
                                    from TRANSACTIOn
                                        where trandate >= sysdate - 365
                                        and TYPE = 'CustInvc'
                                        and POSTING = 'T'
                                   group by entity) total
                                on total.cust = T.ENTITY
                            where T.TYPE = 'CustInvc'
                            and t.trandate >= sysdate - 365
                            and T.POSTING = 'T'
                    group by t.entity) db on db.cus = c.id
                where c.id =  ${data.id}        
            `}).asMappedResults();
            if (numerator.length > 0 && base.length > 0){
                var num = numerator[0].calc_per ;
                var bas = base[0].calc ; 
                var calc_dso = (num / bas) *100
                if (!isNullOrEmpty(num) && !isNullOrEmpty(bas)){
                    log.debug({
                        title: data.id ,
                        details: 'numerator : ' + num + " - base : " + bas + " calc : " + calc_dso.toFixed(0)
                    })
                    var Customer  = record.load({
                        type: 'customer',
                        id : data.id ,
                        isDynamic: false

                    });
                    Customer.setValue('custentity_mis_dso_rating',calc_dso.toFixed(0));
                    Customer.save();

                }
            }
         
           
            }catch(e){
                log.audit(data,e);
            }
        }
        exports.getInputData = getInputData
        exports.map = map
        return exports
        function isNullOrEmpty(val) {
            if (typeof (val) == 'undefined' || val == null || (typeof (val) == 'string' && val.length == 0)) {
                return true;
            }
            return false;
        }
        
    });	