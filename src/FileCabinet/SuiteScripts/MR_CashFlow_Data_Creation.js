/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
/*
Name                : MR Cashflow Data Creation.js 
Purpose             : Create Data for    
Created On          : 03/05/2023
Created By          : Daniel@finance4.cloud @Dsair92
 */
define(['N/record', 'N/search','N/query', 'N/runtime', 'N/format', 'N/currency'],
    function (record, search, query,runtime, format,  currency) {
        var exports = {}
        function getInputData() {
            try {
                var script = runtime.getCurrentScript();
                var search_cus = script.getParameter({ name: "custscript_cash_flow_search" });
                const search_data = search.load({
                    id: search_cus               
                })
                var resultset = search_data.run();
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
                log.debug('data',data);
                var rec_type = data.recordType ;
                var rec_id = data.id ;
                var res = null ;
                var create_rec = true ;
                switch (rec_type){
                    case 'deposit' :
                        res = Deposit(rec_id);
                        break;
                    case 'journalentry' :
                        res = Journal(rec_id);
                        break;
                    case 'customerpayment' :
                        res = Cust_Payment(rec_id);
                        break;
                    case 'customerrefund' :
                        res = Cust_Refund(rec_id);
                        break;
                    case 'vendorpayment' :
                        res = Vendor_Bill(rec_id);
                        break;
                    default :
                        res = rec_type
                        create_rec = false
                        log.error({
                            title: 'Rec ID Not Mapped: '+rec_id ,
                            details: res
                        })
                }
                log.debug({
                    title: 'Rec ID : '+rec_id ,
                    details: res
                })
                if (create_rec){
                    for (var n = 0; n < res.length ; n++){
                        var cash_rec = record.create({
                            type: 'customrecord_cf_tran',
                            isDynamic: true,
                        });
                        cash_rec.setValue('custrecord_cf_tran',res[n].custrecord_cf_tran);
                        cash_rec.setValue('custrecord_cf_tran_line',res[n].custrecord_cf_tran_line);
                        cash_rec.setValue('custrecord_cf_subsidiary',res[n].custrecord_cf_subsidiary);
                        cash_rec.setValue('custrecord_cf_currency',res[n].custrecord_cf_currency);
                        cash_rec.setValue('custrecord_cf_bank_account',res[n].custrecord_cf_bank_account);
                        cash_rec.setValue('custrecord_cf_opposite_account',res[n].custrecord_cf_opposite_account);
                        cash_rec.setValue('custrecord_cf_amount_usd',res[n].custrecord_cf_amount_usd);
                        cash_rec.setValue('custrecord_cf_amount_fx',res[n].custrecord_cf_amount_fx);
                        cash_rec.setValue('custrecord_cf_entity',res[n].custrecord_cf_entity);
                        cash_rec.setValue('custrecord_cf_category',res[n].custrecord_cf_category);
                        //cash_rec.setValue('custrecord_cf_date',res[n].custrecord_cf_date);
                        cash_rec.setValue('custrecord_cf_ref_doc_num',res[n].custrecord_cf_ref_doc_num);
                        cash_rec.setValue('custrecord_cf_posting_period',res[n].custrecord_cf_posting_period);
                        cash_rec.setValue('custrecord_cf_class',res[n].custrecord_cf_class);
                        cash_rec.setValue('custrecord_cf_department',res[n].custrecord_cf_department);
                        var rec_created = cash_rec.save();
                        log.debug('Rec Created Line Unikey : '+res[n].custrecord_cf_tran_line , rec_created);
                    }
                    var submitrec = record.submitFields({
                        type: rec_type,
                        id: rec_id,
                        values: {
                            custbody_cf_to_process: false
                        }
                    });
                    log.debug('Rec Finish Process' , submitrec);
                }
            }catch(e){
                log.audit(data,e);
            }
        }
        exports.getInputData = getInputData
        exports.map = map
        return exports
        // Custom Function
        function Cust_Payment(id){
            log.debug('function' + id , 'Cust_Payment');
            var sql = query.runSuiteQL({query:`                
                select
                    T.ID                              custrecord_cf_tran,
                    PTL.UNIQUEKEY                     custrecord_cf_tran_line,
                    TL.SUBSIDIARY                     custrecord_cf_subsidiary,
                    T.CURRENCY                        custrecord_cf_currency,
                    ACC.ID                            custrecord_cf_bank_account,
                    -- ACC.custrecord_bank_firm , Not In Prod
                    PACC.ID                           custrecord_cf_opposite_account,
                    PTLA.NETAMOUNT * -1               custrecord_cf_amount_usd,
                    PTL.FOREIGNAMOUNT * -1            custrecord_cf_amount_fx,
                    T.ENTITY                                                                        custrecord_cf_entity,
                    ACC.CUSTRECORD_CASH_FLOW_CATEGORY custrecord_cf_category,
                    T.TRANDATE                        custrecord_cf_date,
                    PT.TYPEBASEDDOCUMENTNUMBER        custrecord_cf_ref_doc_num,
                    T.POSTINGPERIOD                   custrecord_cf_posting_period,
                    PTL.CLASS                         custrecord_cf_class,
                    PTL.DEPARTMENT custrecord_cf_department
                from TRANSACTION T
                    inner join TRANSACTIONLINE TL on TL.TRANSACTION = T.ID
                    inner join TRANSACTIONACCOUNTINGLINE TLA
                                on TLA.TRANSACTIONLINE = TL.ID and TLA.ACCOUNTINGBOOK = 1 and TLA.TRANSACTION = T.ID
                    inner join ACCOUNT ACC on ACC.ID = TLA.ACCOUNT and ACC.ACCTTYPE = 'Bank'
                    inner join PREVIOUSTRANSACTIONLINELINK LINK on LINK.NEXTDOC = T.ID
                    Inner Join TRANSACTION PT on LINK.PREVIOUSDOC = PT.ID
                    inner join TRANSACTIONLINE PTL on LINK.PREVIOUSDOC = PTL.TRANSACTION
                    Inner JOIN TRANSACTIONACCOUNTINGLINE PTLA
                                on PTL.TRANSACTION = PTLA.TRANSACTION and PTL.ID = PTLA.TRANSACTIONLINE and PTLA.ACCOUNTINGBOOK = 1
                    inner join ACCOUNT PACC on PACC.ID = PTLA.ACCOUNT and PACC.ACCTTYPE <> 'AcctRec'
                where T.ID = ${id};
            `}).asMappedResults();
            return sql
        }
        function Cust_Refund(id){
            log.debug('function: '+id , 'cust_refund');
            var sql = query.runSuiteQL({query:`                
            select 
                T.ID                              custrecord_cf_tran,
                TL.UNIQUEKEY                      custrecord_cf_tran_line,
                TL.SUBSIDIARY                     custrecord_cf_subsidiary,
                T.CURRENCY                        custrecord_cf_currency,
                ACC.ID                            custrecord_cf_bank_account,
                -- ACC.custrecord_bank_firm , Not In Prod
                PACC.ID                           custrecord_cf_opposite_account,
                PTLA.NETAMOUNT                    custrecord_cf_amount_usd,
                nvl(PTL.FOREIGNAMOUNT, 0)         custrecord_cf_amount_fx,
                T.TYPE,
                T.ENTITY                                                                        custrecord_cf_entity,
                ACC.CUSTRECORD_CASH_FLOW_CATEGORY custrecord_cf_category,
                T.TRANDATE                        custrecord_cf_date,
                PT.TYPEBASEDDOCUMENTNUMBER        custrecord_cf_ref_doc_num,
                T.POSTINGPERIOD                   custrecord_cf_posting_period,
                PTL.CLASS                                       custrecord_cf_class,
                PTL.DEPARTMENT custrecord_cf_department
            from TRANSACTION T
                inner join TRANSACTIONLINE TL on T.ID = TL.TRANSACTION
                inner join TRANSACTIONACCOUNTINGLINE TLA
                            on TL.TRANSACTION = TLA.TRANSACTION and TL.ID = TLA.TRANSACTIONLINE and TLA.ACCOUNTINGBOOK = 1
                inner join ACCOUNT ACC on ACC.ID = TLA.ACCOUNT and ACC.ACCTTYPE = 'Bank'
                inner join PREVIOUSTRANSACTIONLINELINK LINK on LINK.PREVIOUSDOC = T.ID
                Inner Join TRANSACTION PT on LINK.NEXTDOC = PT.ID
                inner join TRANSACTIONLINE PTL on LINK.NEXTDOC = PTL.TRANSACTION
                Inner JOIN TRANSACTIONACCOUNTINGLINE PTLA
                            on PTL.TRANSACTION = PTLA.TRANSACTION and PTL.ID = PTLA.TRANSACTIONLINE and PTLA.ACCOUNTINGBOOK = 1
                inner join ACCOUNT PACC on PACC.ID = PTLA.ACCOUNT and PACC.ACCTTYPE <> 'AcctRec'
            where T.ID =  ${id};
            `}).asMappedResults();
            return sql
        }
        function Deposit(id){
            log.debug('function : '+id , 'Deposit');
            var sql = query.runSuiteQL({query:`                
            select
                T.ID                                                                          custrecord_cf_tran,
                NVL(INV_TL.UNIQUEKEY, TL.UNIQUEKEY)                                           custrecord_cf_tran_line,
                TL.SUBSIDIARY                                                                 custrecord_cf_subsidiary,
                T.CURRENCY                                                                    custrecord_cf_currency,
                Bank_Account                                                                  custrecord_cf_bank_account,
                -- ACC.custrecord_bank_firm , Not In Prod
                nvl(INV_ACC.ID, ACC.ID)                                                       custrecord_cf_opposite_account,
                nvl(Inv_TLA.NETAMOUNT, TLA.NETAMOUNT)    * -1                                      custrecord_cf_amount_usd,
                nvl(INV_TL.FOREIGNAMOUNT, TL.FOREIGNAMOUNT)   * -1                                 custrecord_cf_amount_fx,
                T.ENTITY                                                                        custrecord_cf_entity,
                nvl(INV_ACC.CUSTRECORD_CASH_FLOW_CATEGORY, ACC.CUSTRECORD_CASH_FLOW_CATEGORY) custrecord_cf_category,
                T.TRANDATE                                                                    custrecord_cf_date,
                nvl(INV_T.TYPEBASEDDOCUMENTNUMBER, T.TYPEBASEDDOCUMENTNUMBER)                 custrecord_cf_ref_doc_num,
                T.POSTINGPERIOD                                                               custrecord_cf_posting_period,
                nvl(INV_TL.CLASS, TL.CLASS)                                                   custrecord_cf_class,
                nvl(INV_TL.DEPARTMENT, TL.DEPARTMENT)                                         custrecord_cf_department
            from TRANSACTION T
                inner join TRANSACTIONACCOUNTINGLINE TLA on T.ID = TLA.TRANSACTION
                inner join TRANSACTIONLINE TL
                    on TLA.TRANSACTION = TL.TRANSACTION and TLA.TRANSACTIONLINE = TL.ID
                inner join ACCOUNT ACC on TLA.ACCOUNT = ACC.ID
                left join PREVIOUSTRANSACTIONLINELINK Pay_Link
                    on Pay_Link.NEXTDOC = TL.TRANSACTION and Pay_Link.NEXTLINE = TL.ID
                left join TRANSACTION Pay_Tran on Pay_Link.PREVIOUSDOC = Pay_Tran.ID
                left join NEXTTRANSACTIONLINELINK Inv_Link on Inv_Link.NEXTDOC = Pay_Link.PREVIOUSDOC
                left join TRANSACTIONACCOUNTINGLINE Inv_TLA
                    on Inv_Link.PREVIOUSDOC = Inv_TLA.TRANSACTION 
                    and Inv_TLA.ACCOUNTINGBOOK = 1 and Inv_TLA.NETAMOUNT <> 0
                left join TRANSACTIONLINE INV_TL
                   on Inv_TLA.TRANSACTION = INV_TL.TRANSACTION and Inv_TLA.TRANSACTIONLINE = INV_TL.ID
                Left Join ACCOUNT INV_ACC on INV_ACC.ID = Inv_TLA.ACCOUNT
                left join TRANSACTION INV_T on INV_T.ID = INV_TL.TRANSACTION
                left join (
                    select 
                        ACC.ID          Bank_Account,
                        TLA.TRANSACTION Tran_ID
                    from TRANSACTIONACCOUNTINGLINE TLA
                        inner join ACCOUNT ACC 
                            on ACC.ID = TLA.ACCOUNT and ACC.ACCTTYPE = 'Bank'
                            ) bank_Side on bank_Side.Tran_ID = T.ID
            where T.ID = ${id}
                AND case when ACC.ACCTTYPE = 'Bank' then 1 when INV_ACC.ACCTTYPE = 'AcctRec' then 1 else 0 end = 0
            `}).asMappedResults();
            return sql
        }
        function Journal(id){
            log.debug('function: '+ id , 'Interco');
            var sql = query.runSuiteQL({query:`                
                    select T.ID                       custrecord_cf_tran,
                    TL.UNIQUEKEY                      custrecord_cf_tran_line,
                    TL.SUBSIDIARY                     custrecord_cf_subsidiary,
                    T.CURRENCY                        custrecord_cf_currency,
                    ACC.ID                            custrecord_cf_bank_account,
                    -- ACC.custrecord_bank_firm , Not In Prod
                    PACC.ID                           custrecord_cf_opposite_account,
                    TLA.NETAMOUNT                     custrecord_cf_amount_usd,
                    TL.FOREIGNAMOUNT                  custrecord_cf_amount_fx,
                    T.TYPE,
                    T.ENTITY                                                                        custrecord_cf_entity,
                    ACC.CUSTRECORD_CASH_FLOW_CATEGORY custrecord_cf_category,
                    T.TRANDATE                        custrecord_cf_date,
                    T.TYPEBASEDDOCUMENTNUMBER         custrecord_cf_ref_doc_num,
                    T.POSTINGPERIOD                   custrecord_cf_posting_period,
                    TL.CLASS                             custrecord_cf_class,
                    TL.DEPARTMENT custrecord_cf_department
                from TRANSACTION T
                    inner join TRANSACTIONLINE TL on T.ID = TL.TRANSACTION
                    inner join TRANSACTIONACCOUNTINGLINE TLA
                        on TL.TRANSACTION = TLA.TRANSACTION and TL.ID = TLA.TRANSACTIONLINE and TLA.ACCOUNTINGBOOK = 1
                    inner join ACCOUNT ACC on ACC.ID = TLA.ACCOUNT and ACC.ACCTTYPE = 'Bank'
                    inner join TRANSACTIONACCOUNTINGLINE PTLA on T.ID = PTLA.TRANSACTION and PTLA.ACCOUNTINGBOOK = 1
                    inner join TRANSACTIONLINE PTL
                        on PTLA.TRANSACTIONLINE = PTL.ID and PTL.TRANSACTION = T.ID and PTL.SUBSIDIARY = TL.SUBSIDIARY
                    inner join ACCOUNT PACC
                        on PTLA.ACCOUNT = PACC.ID and PACC.ACCTTYPE <> 'Bank'
                where T.ID = ${id};
            `}).asMappedResults();
            return sql
        }
        function Vendor_Bill(id){
            log.debug('function'+ id  , 'Vendor_Bill');
            var sql = query.runSuiteQL({query:`                
                select 
                    T.ID                                              custrecord_cf_tran,
                    PTL.UNIQUEKEY                                     custrecord_cf_tran_line,
                    TL.SUBSIDIARY                                     custrecord_cf_subsidiary,
                    T.CURRENCY                                                                    custrecord_cf_currency,
                    ACC.ID                                            custrecord_cf_bank_account,
                    -- ACC.custrecord_bank_firm , Not In Prod
                    nvl(PTL.CUSTCOL_AMR_DESTINATION_ACCOUNT, PACC.ID) custrecord_cf_opposite_account,
                    PTLA.NETAMOUNT * -1                               custrecord_cf_amount_usd,
                    PTL.FOREIGNAMOUNT * -1                            custrecord_cf_amount_fx,
                    T.ENTITY                                                                        custrecord_cf_entity,
                    ACC.CUSTRECORD_CASH_FLOW_CATEGORY                 custrecord_cf_category,
                    T.TRANDATE                                        custrecord_cf_date,
                    PT.TYPEBASEDDOCUMENTNUMBER                        custrecord_cf_ref_doc_num,
                    T.POSTINGPERIOD                                   custrecord_cf_posting_period,
                    PTL.CLASS,
                    PTL.DEPARTMENT custrecord_cf_department
                from TRANSACTION T
                    inner join transactionline tl on T.ID = TL.TRANSACTION
                    inner join TRANSACTIONACCOUNTINGLINE tla
                    inner join ACCOUNT ACC on ACC.ID = TLA.ACCOUNT
                                on tl.transaction = tla.transaction and tl.id = tla.transactionline and tla.ACCOUNTINGBOOK = 1
                    left join nextTRANSACTIONLINELINK link on link.nextdoc = tl.transaction
                    left join transactionline ptl on ptl.transaction = link.previousdoc
                    inner join TRANSACTIONACCOUNTINGLINE ptla
                                on ptl.transaction = ptla.transaction and ptl.id = ptla.transactionline and ptla.ACCOUNTINGBOOK = 1
                    inner join ACCOUNT PACC on PTLA.ACCOUNT = PACC.ID and PACC.ACCTTYPE <> 'AcctPay'
                    inner join TRANSACTION PT on PT.ID = PTL.TRANSACTION
                where tl.transaction = ${id}
                    and tl.mainline = 'F'
            `}).asMappedResults();
            return sql
        }
    });	