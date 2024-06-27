/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
/*
Name                : BOB_MR_Cash_App.js 
Purpose             : Create Customer Payments for direct Match Invoices and in case if direct match is not there then source best guessed transaction      
Created On          : 10/01/2023
Created By          : Daniel@finance4.cloud @Dsair92
 */
define(['N/record', 'N/search','N/query', 'N/runtime', 'N/format', 'N/currency'],
    function (record, search, query,runtime, format,  currency) {
        var exports = {}
        function getInputData() {
            try {
                var sql = query.runSuiteQL({query:`                
                select
                bank.custrecord_hb_cashapp_process_status bank_status ,
                bank.id bank_payment_id,
                bank.custrecord_hb_invoice_no inv_doc,
                bank.custrecord_hb_payment_date payment_date ,
                bank.custrecord_hb_bank_deposit_date deposit_date ,
                bank.custrecord_hb_payment_amount bank_payment_fx_amount ,
                bank.custrecord_hb_remitter_name bank_ref,
		        bank.custrecord_hb_best_guess_transaction bank_guess_tran ,
                bank.custrecord_hb_matched_cust bank_matched_cus ,
                bank.custrecord_hb_subsidiary sub_id ,
                bank.custrecord_hb_payer_account_no bank_ref_code,
		        tg.foreignamountunpaid guess_remain_amt ,
                round(tg.foreignamountunpaid * tg.custbody_il_exchangerate,2) guess_remain_amt_il,
                tg.custbody_il_exchangerate il_exchange_rate,
                acc.currency acc_cur,
                acc.id  acc_id ,
                ref.custrecord_crossref_netsuite_customer ref_cust_id,
                ref.id ref_id ,
		        ref.custrecord_crossref_status_cashapp ref_default_status , 
                t.id tran_id,
		        t.trandate tran_date , 
		        t.entity tran_cust_id,
                t.foreignamountunpaid tran_amount_fx_open,
                t.currency tran_currency ,
                t.duedate tran_due_date ,
                t.status tran_status ,
                bank.custrecord_hb_payment_date - t.t.trandate diff_date_creation , 
                thold.custrecord_catc_min_threshold thold_min      
                from 
                customrecord_hb_ar_bank_files bank 
                inner join account acc on acc.id = bank.custrecord_hb_bank_account_id and bank.custrecord_hb_cashapp_process_status in (1 , 111 , 113, 114,116,117,118,119,120)
                left join customrecord_cash_app_threshold_currency thold on thold.custrecord_catc_currency = acc.currency
                left join customrecord_remitter_netsuite_cross_ref ref on lower(trim(ref.custrecord_crossref_remitter_name)) = lower(trim(bank.custrecord_hb_remitter_name))  and ref.isinactive = 'F' 
                left join transaction t on t.tranid = bank.custrecord_hb_invoice_no 
                left join transaction tg on tg.id = bank.custrecord_hb_best_guess_transaction 
                order by bank.custrecord_hb_payment_date 
                `}).asMappedResults();
                log.audit({title: 'Data Count',details: sql.length});
                return sql //status Filter 1 - Pending Cash Application | 111 - Pending Matching - Approved Guess with fee || 113 - Pending Matching - Approved Guess without fee || 114 - Pending Cash - Customer Matched Manually	 || 116 - Over Payment - Approved For Posting	
            }
            catch (e) {
                log.error('error', e)
            }
        }

        function map(context) {
            try {
                var Data = JSON.parse(context.value);
                var script = runtime.getCurrentScript();
                var period_id = null;
                var Search_Res = null;
                var Transfer = null;
                var remitter_not_relevant = false;
                var Customer_ID = Data.ref_cust_id; 
                var fee_account = Number(script.getParameter({ name: "custscript_fee_account" }));
                var Rec_Index = 'Rec ID :' + Data.bank_payment_id;
                //Posting Period Logic
                if (Data.payment_date != Data.deposit_date && !isNullOrEmpty(Data.deposit_date)){
                    var period_search = query.runSuiteQL({query:`                
                    select id from accountingperiod
                    where '${Data.deposit_date}' between startdate and enddate and isquarter = 'F' and isyear = 'F'
                    `}).asMappedResults();
                    period_id = period_search[0].id;      
                }
                var diff_amount = null
                if (!isNullOrEmpty(Data.tran_id)){
                    diff_amount = Number(Data.tran_amount_fx_open).toFixed(2) - Number(Data.bank_payment_fx_amount).toFixed(2)
                }
                var Audit_rec = {};
                var bank_update = {};
                var payment_res = null;
                Audit_rec.action = 'Data';
                Audit_rec.value = Data;
                log.audit(Rec_Index, Audit_rec);
                //Default Status Matched by Remitter
                if (!isNullOrEmpty(Data.ref_default_status)){
                    Audit_rec.action = 'Default Status By Remitter';
                    Audit_rec.value = 'Default Status : '+ Data.ref_default_status;
                    bank_update.custrecord_hb_matching_logic_notes = 'Default Status By Remitter'
                    bank_update.custrecord_hb_cross_currency = true
                    bank_update.custrecord_hb_cashapp_process_status = Data.ref_default_status ;
                    Update_Bank(Data.bank_payment_id,bank_update,'Default Status By Remitter',Rec_Index);
                    log.audit(Rec_Index, Audit_rec);   
                    return
                }
                //Customer Matched Manually
                if (Data.bank_status == '114'||Data.bank_status == '117'){
                    log.audit(Rec_Index, 'Retry Manullay Mapped or Matched by Account');
                    remitter_not_relevant = true
                    Customer_ID = Data.bank_matched_cus
                    if(Data.acc_cur == 6 && Data.sub_id == 4 && !isNullOrEmpty(Customer_ID)){
                        log.debug('IL Flow',Data.bank_payment_id);
                        Search_Res = Get_Open_Inv(Customer_ID,Data.bank_payment_fx_amount,'1',Data.payment_date,Data.inv_doc,Rec_Index,true);
                    }
                }
                //OverPayemnt Application
                if (Data.bank_status == '116'){
                    log.audit(Rec_Index, 'Over Payment - Approved Manually');
                    var over_payment =  Data.bank_payment_fx_amount - Data.guess_remain_amt
                    var Inv_Array = []
                    Inv_Array.push({
                        Tran_ID : Data.bank_guess_tran
                    });
                    log.debug('Inv_Array' ,Inv_Array)
                    Audit_rec.action = 'OverPayment Application - Approved by user';
                    Audit_rec.value = 'Bank Payment : '+ Data.bank_payment_fx_amount + ' , Inv Amount : '+ Data.guess_remain_amt ;
                    log.audit(Rec_Index, Audit_rec);
                    var JE_Fee = CreateJE(Data.payment_date,over_payment,Data.acc_cur,Data.sub_id,fee_account,Data.acc_id);
                    log.debug({
                        title: 'Fee',
                        details: JE_Fee
                    })
                    payment_res = Create_MultiPayment(Inv_Array,Data.acc_id,Data.bank_payment_id,Data.bank_matched_cus,Data.acc_cur,Data.payment_date,Data.guess_remain_amt,period_id); // payment
                    bank_update.custrecord_hb_matching_logic_notes = 'Matched by Guess - Approved by User with Over Payment '
                    bank_update.custrecord_hb_cashapp_process_status = 3 ;
                    bank_update.custrecord_hb_fee_applied = - over_payment ;
                    bank_update.custrecord_hb_je_overpayment = JE_Fee ;
                    bank_update.custrecord_hb_payment_created = payment_res.Paym_id ;
                    Update_Bank(Data.bank_payment_id,bank_update,'Matched by Guess - Approved by User',Rec_Index);
                    Audit_rec.action = 'Matched by Guess - Approved by User' ;
                    Audit_rec.value = payment_res.Paym_id ;
                    log.audit(Rec_Index, Audit_rec);   
                    return
                    
                }
                //Cross Currency Issue Found
                if (Data.acc_cur != Data.tran_currency && !isNullOrEmpty(Data.tran_currency)){
                    if(Data.sub_id == 4 && Data.acc_cur == 6){
                        Search_Res = Get_Open_Inv(Customer_ID,Data.bank_payment_fx_amount,'1',Data.payment_date,Data.inv_doc,Rec_Index,true,Data.tran_id);
                    }else{
                        Audit_rec.action = 'Cross Currency Issue Found';
                        Audit_rec.value = 'Account Currency :'+ Data.acc_cur + ' Tran Currency :' + Data.tran_currency;
                        bank_update.custrecord_hb_matching_logic_notes = 'Cross Currency Issue Found'
                        bank_update.custrecord_hb_cashapp_process_status = 2 ;
                        bank_update.custrecord_hb_matched_cust = Data.tran_cust_id ;
                        bank_update.custrecord_hb_cross_currency = 'T' ;
                        Update_Bank(Data.bank_payment_id,bank_update,'Cross Currency Issue Found',Rec_Index);
                        log.audit(Rec_Index, Audit_rec);   
                        return
                    }
                }
                //Approved Best Guess By User with Fee
                if (Data.bank_status == '111'){
                    var fee = Data.guess_remain_amt - Data.bank_payment_fx_amount
                    var Inv_Array = []
                    Inv_Array.push({
                        Tran_ID : Data.bank_guess_tran
                    });
                    log.debug('Inv_Array' ,Inv_Array)
                    Audit_rec.action = 'Guess Application - Approved by user';
                    Audit_rec.value = 'Bank Payment : '+ Data.bank_payment_fx_amount + ' , Inv Amount : '+ Data.guess_remain_amt ;
                    log.audit(Rec_Index, Audit_rec);
                    Create_MultiPayment(Inv_Array,fee_account,Data.bank_payment_id,Data.bank_matched_cus,Data.acc_cur,Data.payment_date,fee,period_id); // fee
                    payment_res = Create_MultiPayment(Inv_Array,Data.acc_id,Data.bank_payment_id,Data.bank_matched_cus,Data.acc_cur,Data.payment_date,Data.bank_payment_fx_amount,period_id); // payment
                    bank_update.custrecord_hb_matching_logic_notes = 'Matched by Guess - Approved by User with Fee '
                    bank_update.custrecord_hb_cashapp_process_status = 3 ;
                    bank_update.custrecord_hb_fee_applied = fee ;
                    bank_update.custrecord_hb_payment_created = payment_res.Paym_id ;
                    Update_Bank(Data.bank_payment_id,bank_update,'Matched by Guess - Approved by User',Rec_Index);
                    Audit_rec.action = 'Matched by Guess - Approved by User' ;
                    Audit_rec.value = payment_res.Paym_id ;
                    log.audit(Rec_Index, Audit_rec);   
                    return
                }
                //Approved Best Guess By User without Fee
                if (Data.bank_status == '113'){
                    var Inv_Array = []
                    Inv_Array.push({
                        Tran_ID : Data.bank_guess_tran
                    });
                    log.debug('Inv_Array' ,Inv_Array)
                    Audit_rec.action = 'Guess Application - Approved by user';
                    Audit_rec.value = 'Bank Payment : '+ Data.bank_payment_fx_amount + ' , Inv Amount : '+ Data.guess_remain_amt ;
                    log.audit(Rec_Index, Audit_rec);
                    payment_res = Create_MultiPayment(Inv_Array,Data.acc_id,Data.bank_payment_id,Data.bank_matched_cus,Data.acc_cur,Data.payment_date,Data.bank_payment_fx_amount,period_id); // payment
                    bank_update.custrecord_hb_matching_logic_notes = 'Matched by Guess - Approved by User'
                    bank_update.custrecord_hb_cashapp_process_status = 3 ;
                    bank_update.custrecord_hb_payment_created = payment_res.Paym_id ;
                    Update_Bank(Data.bank_payment_id,bank_update,'Matched by Guess - Approved by User',Rec_Index);
                    Audit_rec.action = 'Matched by Guess - Approved by User' ;
                    Audit_rec.value = payment_res.Paym_id ;
                    log.audit(Rec_Index, Audit_rec);   
                    return
                }
                //Approved Best Guess By User with Over Payment IL
                if (Data.bank_status == '120'){
                    var fee_IL = (Data.bank_payment_fx_amount - Data.guess_remain_amt_il) 
                    var fee = fee_IL / Data.il_exchange_rate
                    var amount_payment_ILS = Data.guess_remain_amt * Data.il_exchange_rate
                    log.debug('Fee Calc' ,fee)
                    Audit_rec.action = 'Guess Application - Approved by user IL with Fee';
                    Audit_rec.value = 'Bank Payment : '+ Data.bank_payment_fx_amount + ' , Inv Amount : '+ Data.guess_remain_amt_il ;
                    log.audit(Rec_Index, Audit_rec);
                    payment_res = Create_Direct_Payment(Data.bank_guess_tran,Data.payment_date,1609,Data.bank_payment_id,period_id); // payment
                    Transfer = TransferFunds(1609,Data.acc_id,Data.payment_date,Data.guess_remain_amt,amount_payment_ILS.toFixed(2),Data.bank_payment_id,payment_res);
                    var over_payment_JE = CreateJE(Data.payment_date,fee_IL,6,Data.sub_id,fee_account,Data.acc_id)  
                    bank_update.custrecord_hb_matching_logic_notes = 'Matched by Guess - Approved by User with Over Payment IL';
                    bank_update.custrecord_hb_transfer_founds = Transfer ;
                    bank_update.custrecord_hb_je_overpayment = over_payment_JE ;
                    bank_update.custrecord_hb_cashapp_process_status = 3 ;
                    bank_update.custrecord_hb_best_guess_transaction = null ;
                    bank_update.custrecord_hb_fee_applied = fee.toFixed(2) ;
                    bank_update.custrecord_hb_fee_applied_il = fee_IL ;
                    bank_update.custrecord_hb_payment_created = payment_res.Paym_id ;
                    Update_Bank(Data.bank_payment_id,bank_update,'Guess Application - Approved by user IL with Fee',Rec_Index);
                    Audit_rec.action = 'Guess Application - Approved by user IL with Fee' ;
                    Audit_rec.value = payment_res.Paym_id ;
                    log.audit(Rec_Index, Audit_rec);   
                    return
                }
                //Approved Best Guess By User with Fee IL
                if (Data.bank_status == '119'){
                    var fee_IL = (Data.guess_remain_amt_il - Data.bank_payment_fx_amount) 
                    var fee = fee_IL / Data.il_exchange_rate
                    var Inv_Array = []
                    Inv_Array.push({
                        Tran_ID : Data.bank_guess_tran
                    });
                    var amount_payment_usd = Data.bank_payment_fx_amount / Data.il_exchange_rate
                    log.debug('Fee Calc' ,fee)
                    Audit_rec.action = 'Guess Application - Approved by user IL with Fee';
                    Audit_rec.value = 'Bank Payment : '+ Data.bank_payment_fx_amount + ' , Inv Amount : '+ Data.guess_remain_amt_il ;
                    log.audit(Rec_Index, Audit_rec);
                    Create_MultiPayment(Inv_Array,fee_account,Data.bank_payment_id,Data.bank_matched_cus,1,Data.payment_date,fee.toFixed(2),period_id); // fee
                    payment_res = Create_Direct_Payment(Data.bank_guess_tran,Data.payment_date,1609,Data.bank_payment_id,period_id); // payment
                    Transfer = TransferFunds(1609,Data.acc_id,Data.payment_date,amount_payment_usd.toFixed(2),Data.bank_payment_fx_amount,Data.bank_payment_id,payment_res);
                    bank_update.custrecord_hb_matching_logic_notes = 'Matched by Guess - Approved by User with Fee IL';
                    bank_update.custrecord_hb_transfer_founds = Transfer ;
                    bank_update.custrecord_hb_cashapp_process_status = 3 ;
                    bank_update.custrecord_hb_best_guess_transaction = null ;
                    bank_update.custrecord_hb_fee_applied = fee.toFixed(2) ;
                    bank_update.custrecord_hb_fee_applied_il = fee_IL ;
                    bank_update.custrecord_hb_payment_created = payment_res.Paym_id ;
                    Update_Bank(Data.bank_payment_id,bank_update,'Matched by Guess - Approved by User',Rec_Index);
                    Audit_rec.action = 'Matched by Guess - Approved by User' ;
                    Audit_rec.value = payment_res.Paym_id ;
                    log.audit(Rec_Index, Audit_rec);   
                    return
                }
                //Approved Best Guess By User without Fee IL
                if (Data.bank_status == '118'){
                    var Inv_Array = []
                    Inv_Array.push({
                        Tran_ID : Data.bank_guess_tran
                    });
                    var amount_payment_usd = Data.bank_payment_fx_amount / Data.il_exchange_rate
                    log.debug('Inv_Array' ,Inv_Array)
                    Audit_rec.action = 'Guess Application - Approved by user';
                    Audit_rec.value = 'Bank Payment : '+ Data.bank_payment_fx_amount + ' , Inv Amount : '+ Data.guess_remain_amt ;
                    log.audit(Rec_Index, Audit_rec);
                    payment_res = Create_MultiPayment(Inv_Array,1609,Data.bank_payment_id,Data.bank_matched_cus,1,Data.payment_date,amount_payment_usd.toFixed(2),period_id); // payment
                    Transfer = TransferFunds(1609,Data.acc_id,Data.payment_date,amount_payment_usd.toFixed(2),Data.bank_payment_fx_amount,Data.bank_payment_id,payment_res);
                    bank_update.custrecord_hb_transfer_founds = Transfer ;
                    bank_update.custrecord_hb_matching_logic_notes = 'Matched by Guess - Approved by User IL'
                    bank_update.custrecord_hb_cashapp_process_status = 3 ;
                    bank_update.custrecord_hb_best_guess_transaction = null 
                    bank_update.custrecord_hb_payment_created = payment_res.Paym_id ;
                    Update_Bank(Data.bank_payment_id,bank_update,'Matched by Guess - Approved by User',Rec_Index);
                    Audit_rec.action = 'Matched by Guess - Approved by User' ;
                    Audit_rec.value = payment_res.Paym_id ;
                    log.audit(Rec_Index, Audit_rec);   
                    return
                }
                // Invoice Paid
                if (Data.tran_status == 'B'){
                    bank_update.custrecord_hb_cashapp_process_status = 110 ;
                    bank_update.custrecord_hb_matching_logic_notes = 'Invoice Already Paid / Credited'
                    bank_update.custrecord_hb_matched_cust = Data.tran_cust_id ;
                    Update_Bank(Data.bank_payment_id,bank_update,'Invoice Already Paid / Credited',Rec_Index);
                    return
                }
                //Best Case
                if (diff_amount == 0 && Data.acc_cur == Data.tran_currency && Data.diff_date_creation >=0 && Data.tran_status == 'A'){
                    payment_res = Create_Direct_Payment(Data.tran_id,Data.payment_date,Data.acc_id,Data.bank_payment_id,period_id);
                    bank_update.custrecord_hb_matched_cust = payment_res.Cust_id ;
                    bank_update.custrecord_hb_cashapp_process_status = 3 ;
                    bank_update.custrecord_hb_matching_logic_notes = 'Invoice Matched - Single Invoices' ;
                    bank_update.custrecord_hb_payment_created = payment_res.Paym_id;
                    Update_Bank(Data.bank_payment_id,bank_update,'Its a Match!',Rec_Index);
                    Audit_rec.action = 'Direct Match - Invoice' ;
                    Audit_rec.value = payment_res.Paym_id ;
                    log.audit(Rec_Index, Audit_rec);
                    if (isNullOrEmpty(Data.ref_cust_id) && !isNullOrEmpty(Data.bank_ref)){
                        Data.ref_id = Create_Remitter(Data.bank_ref,Data.bank_payment_id,payment_res.Cust_id,Data.sub_id,Data.bank_ref_code);
                        Audit_rec.action = 'Create Remitter By Invoices' ;
                        Audit_rec.value = Data.ref_id ;
                        log.audit(Rec_Index, Audit_rec);        
                    }
                    return      
                }
                //Fee Treshhold
                if ( Data.acc_cur == Data.tran_currency && Data.diff_date_creation >=0 ){
                    var Min_T = Number(Data.tran_amount_fx_open) - Number(Data.thold_min) 
                    var Inv_Array = []
                    Inv_Array.push({
                        Tran_ID : Data.tran_id
                    }); // review all logic by lilach new 
                    Audit_rec.action = 'Fee treshold data validation';
                    Audit_rec.value = 'Bank Payment : '+Data.bank_payment_fx_amount + ' , Inv Amount : '+ Data.tran_amount_fx_open + ' Min : ' + Min_T;
                    log.audit(Rec_Index, Audit_rec);        
                    if (Min_T < Number(Data.bank_payment_fx_amount) && Number(Data.bank_payment_fx_amount) <  Number(Data.tran_amount_fx_open)){
                        var fee = Number(Data.tran_amount_fx_open) - Number(Data.bank_payment_fx_amount);
                        Create_MultiPayment(Inv_Array,fee_account,Data.bank_payment_id,Data.tran_cust_id,Data.tran_currency,Data.payment_date,fee,period_id); // fee
                        payment_res = Create_MultiPayment(Inv_Array,Data.acc_id,Data.bank_payment_id,Data.tran_cust_id,Data.tran_currency,Data.payment_date,Data.bank_payment_fx_amount,period_id); // payment
                        bank_update.custrecord_hb_matching_logic_notes = 'Matched payment and create record fee'
                        bank_update.custrecord_hb_cashapp_process_status = 3 ;
                        bank_update.custrecord_hb_matched_cust = Data.tran_cust_id ;
                        bank_update.custrecord_hb_payment_created = payment_res.Paym_id ;
                        bank_update.custrecord_hb_fee_applied = fee ;
                        Update_Bank(Data.bank_payment_id,bank_update,'Underpayment matched by treshhold Logic',Rec_Index);
                        Audit_rec.action = 'Fee Treshhold Matching' ;
                        Audit_rec.value = payment_res.Paym_id ;
                        log.audit(Rec_Index, Audit_rec);
                        if (isNullOrEmpty(Data.ref_cust_id)&&!isNullOrEmpty(Data.bank_ref) ){
                            Data.ref_id = Create_Remitter(Data.bank_ref,Data.bank_payment_id,payment_res.Cust_id,Data.sub_id,Data.bank_ref_code);
                            Audit_rec.action = 'Create Remitter By Invoices' ;
                            Audit_rec.value = Data.ref_id ;
                            log.audit(Rec_Index, Audit_rec);        
                        }
                        return      
                    }
                }
                //New Remitter
                if (isNullOrEmpty(Data.ref_id)&& !isNullOrEmpty(Data.bank_ref) && remitter_not_relevant == false){
                    log.audit({title: Rec_Index ,details: 'Create Remitter'});
                    var remitter = Create_Remitter(Data.bank_ref,Data.bank_payment_id,null,Data.sub_id,Data.bank_ref_code);
                    log.debug('remitter',remitter);
                    if (!isNullOrEmpty(remitter.cust_id)){
                        Customer_ID = remitter.cust_id
                        bank_update.custrecord_hb_matching_logic_notes = 'Remitter Matched Customer - Retry'
                    }else{
                        bank_update.custrecord_hb_cashapp_process_status = 2 ;
                        bank_update.custrecord_hb_matching_logic_notes = 'Remitter Not Found'
                    }
                    Update_Bank(Data.bank_payment_id,bank_update,'New Remitter Flow ',Rec_Index);
                }
                payment_res = GetBankStatus(Data.bank_payment_id);
                //Remitter Logic
                if(((!isNullOrEmpty(Customer_ID) && isNullOrEmpty(Data.tran_id)) || !isNullOrEmpty(Data.tran_id) )&& isNullOrEmpty(payment_res)){
                    log.audit(Rec_Index ,'Get Open Inv');
                    if (isNullOrEmpty(Customer_ID)){
                        Customer_ID = Data.tran_cust_id
                    }
                    if (isNullOrEmpty(Search_Res)){
                        Search_Res = Get_Open_Inv(Customer_ID,Data.bank_payment_fx_amount,Data.acc_cur,Data.payment_date,Data.inv_doc,Rec_Index,false);
                    }
                    log.debug({
                        title: 'Search_Res',
                        details: Search_Res
                    });
                    Audit_rec.action = 'Search Inv Result' ;
                    Audit_rec.value = JSON.stringify(Search_Res)  ;
                    log.audit(Rec_Index,Audit_rec);
                    if (isNullOrEmpty(Search_Res)){
                        bank_update.custrecord_hb_matched_cust = Customer_ID ,
                        bank_update.custrecord_hb_cashapp_process_status = 2 ;
                        bank_update.custrecord_hb_matching_logic_notes ='Remitter Matched - Invoices Not found';
                        Update_Bank(Data.bank_payment_id,bank_update,'Remitter Matched',Rec_Index);
                        return
                    }
                    if (Search_Res.Action == 'Invoice_match'){
                        if(Search_Res.IL_flow == true){
                            log.audit({title: Rec_Index ,details: 'Invoice Match - Search - IL Flow'});
                            payment_res = Create_Direct_Payment(Search_Res.Tran_ID,Data.payment_date,1609,Data.bank_payment_id,period_id);
                            Transfer = TransferFunds(1609,Data.acc_id,Data.payment_date,Search_Res.USD_amt,Data.bank_payment_fx_amount,Data.bank_payment_id,payment_res);
                            bank_update.custrecord_hb_transfer_founds = Transfer ;
                        }else{
                            log.audit({title: Rec_Index ,details: 'Invoice Match - Search'});
                            payment_res = Create_Direct_Payment(Search_Res.Tran_ID,Data.payment_date,Data.acc_id,Data.bank_payment_id,period_id);
                        }
                        bank_update.custrecord_hb_matched_cust = payment_res.Cust_id;
                        bank_update.custrecord_hb_cashapp_process_status = 3;
                        bank_update.custrecord_hb_matching_logic_notes ='Remitter Matched - Single invoice matched'; 
                        bank_update.custrecord_hb_payment_created = payment_res.Paym_id;
                        Update_Bank(Data.bank_payment_id,bank_update,'Its a Match!',Rec_Index);
                        return           
                    }
                    if (Search_Res.Action == 'Invoice_guess_IL'){
                        bank_update.custrecord_hb_matched_cust = Customer_ID ,
                        bank_update.custrecord_hb_cashapp_process_status = 6;
                        bank_update.custrecord_hb_matching_logic_notes ='Guess By Invoice - IL Flow'; 
                        bank_update.custrecord_hb_best_guess_transaction = Search_Res.Tran_ID;
                        Update_Bank(Data.bank_payment_id,bank_update,'Guess By Invoice - IL Flow',Rec_Index);
                    }
                    if (Search_Res.Action == 'Tran_Array'){
                        if(Search_Res.IL_flow == true){
                            var amount_payment_calc_usd = 0
                            for (var q = 0; q < Search_Res.Tran_Array.length ; q++){
                                amount_payment_calc_usd = amount_payment_calc_usd + Search_Res.Tran_Array[q].Tran_Amount_USD
                            }
                            payment_res = Create_MultiPayment(Search_Res.Tran_Array,1609,Data.bank_payment_id,Customer_ID,1,Data.payment_date,amount_payment_calc_usd,period_id,Search_Res.IL_flow);
                            Transfer = TransferFunds(1609,Data.acc_id,Data.payment_date,amount_payment_calc_usd,Data.bank_payment_fx_amount,Data.bank_payment_id,payment_res);
                            bank_update.custrecord_hb_transfer_founds = Transfer ;
                        }else{
                            payment_res = Create_MultiPayment(Search_Res.Tran_Array,Data.acc_id,Data.bank_payment_id,Customer_ID,Data.acc_cur,Data.payment_date,Data.bank_payment_fx_amount,period_id,Search_Res.IL_flow);
                        }
                        log.audit(Rec_Index,'Batch Invocies Match')
                        bank_update.custrecord_hb_matched_cust = payment_res.Cust_id ;
                        bank_update.custrecord_hb_matching_logic_notes ='Remitter Matched - Multi invoices matched' 
                        bank_update.custrecord_hb_cashapp_process_status = 3 ;
                        bank_update.custrecord_hb_payment_created = payment_res.Paym_id;
                        Update_Bank(Data.bank_payment_id,bank_update,'Its a Match!',Rec_Index);
                        return
                    }
                    if (Search_Res.Action == 'Tran_Array_IL'){
                        var amount_payment_calc_usd = 0
                        for (var q = 0; q < Search_Res.Tran_Array.length ; q++){
                                amount_payment_calc_usd = amount_payment_calc_usd + Search_Res.Tran_Array[q].Tran_Amount_USD
                        }
                        payment_res = Create_MultiPayment(Search_Res.Tran_Array,1609,Data.bank_payment_id,Customer_ID,1,Data.payment_date,amount_payment_calc_usd,period_id,Search_Res.IL_flow);
                        Transfer = TransferFunds(1609,Data.acc_id,Data.payment_date,amount_payment_calc_usd,Data.bank_payment_fx_amount,Data.bank_payment_id,payment_res);
                        bank_update.custrecord_hb_transfer_founds = Transfer ;
                        log.audit(Rec_Index,'Batch Invocies Match IL');
                        bank_update.custrecord_hb_matched_cust = payment_res.Cust_id ;
                        bank_update.custrecord_hb_matching_logic_notes ='Remitter Matched - Multi invoices matched IL Flow' 
                        bank_update.custrecord_hb_cashapp_process_status = 3 ;
                        bank_update.custrecord_hb_payment_created = payment_res.Paym_id;
                        Update_Bank(Data.bank_payment_id,bank_update,'Its a Match!',Rec_Index);
                        return
                    }
                    if (Search_Res.Action == 'Guess'){
                        log.audit(Rec_Index,'Best Guess')  
                        bank_update.custrecord_hb_matched_cust = Customer_ID;
                        bank_update.custrecord_hb_best_guess_transaction = Search_Res.Tran_ID ;
                        bank_update.custrecord_hb_matching_logic_notes = Search_Res.Log ;
                        bank_update.custrecord_hb_cashapp_process_status = Search_Res.Bank_Rec_Status ;
                        payment_res = Search_Res.Tran_ID
                        Update_Bank(Data.bank_payment_id,bank_update,Search_Res.Log,Rec_Index);
                    }
                    if (isNullOrEmpty(payment_res)){
                        log.audit(Rec_Index,'Not Found Logic')   
                        bank_update.custrecord_hb_matched_cust = Customer_ID ;
                        bank_update.custrecord_hb_matching_logic_notes = 'Remitter Matched' ;
                        bank_update.custrecord_hb_cashapp_process_status = 109 ;
                        payment_res = Search_Res.Customer_ID
                        Update_Bank(Data.bank_payment_id,bank_update,'Best Guess',Rec_Index);
                    }
                }
                //Not Found  
                if(isNullOrEmpty(payment_res)){ // Logic Not Found
                    bank_update.custrecord_hb_cashapp_process_status = 2 ;
                    bank_update.custrecord_hb_matching_logic_notes = 'Remitter Not Found'
                    Update_Bank(Data.bank_payment_id,bank_update,'Remitter Not Found',Rec_Index);
                }
            }catch(e){
                log.audit(Rec_Index,e);
            }
        }
        exports.getInputData = getInputData
        exports.map = map
        return exports
        //Custom Function
        function Create_Remitter (name,bank_id,cust_id,sub_id,bank_ref_code) {
            var debug = {
                'Bank_Ref' : name,
                'Payment_ID' : bank_id,
                'Cust_Payment' : cust_id,
                'Sub ID' : sub_id,
                'Ref_Bank' : bank_ref_code
            }
            log.audit('Value Remitter' , JSON.stringify(debug))
            var res = {}
            var customrecord_remitter_netsuite_cross_refSearchObj = search.create({
                type: "customrecord_remitter_netsuite_cross_ref",
                filters:
                [
                   ["custrecord_crossref_remitter_name","is",name]
                ],
                columns:
                ["scriptid"]
            });
            var Remitter_count_search = customrecord_remitter_netsuite_cross_refSearchObj.runPaged().count;
            log.audit({
                title: 'Search Count For ' + name,
                details: Remitter_count_search
            })
            var Rec_Created = null
            if(Remitter_count_search == 0){
                var Remitter = record.create({
                    type: 'customrecord_remitter_netsuite_cross_ref',
                    isDynamic: false,
                });
                Remitter.setValue({fieldId: 'custrecord_crossref_remitter_name',value: name,ignoreFieldChange: false});
                Remitter.setValue({fieldId: 'custrecord_crossref_created_from',value: bank_id,ignoreFieldChange: false})
                Remitter.setValue({fieldId: 'custrecord_ref_bank_ref_code',value: bank_ref_code ,ignoreFieldChange: false})
                if (isNullOrEmpty(cust_id)){
                    var searchcus =  search.create({
                        type: "customer",
                        filters:
                        [
                           ["companyname","contains",name] ,
                            "AND", 
                            ["subsidiary","anyof",sub_id],
                            "AND", 
                            ["isinactive","is","F"]
                        ],
                        columns:
                        [
                            "internalid"
                        ]
                    });
                    var searchcusCount = searchcus.runPaged().count;
                    if (searchcusCount == 1 ) {
                        searchcus.run().each(function(result){
                            cust_id = result.id
                        });
                    }
                    if (isNullOrEmpty(cust_id)){
                        var shortname = name.split(" ")[0];
                        shortname = shortname.replace(',','');
                        var searchcus_short =  search.create({
                            type: "customer",
                            filters:
                            [
                                [["companyname","contains",shortname],"OR",["companyname","startswith",shortname]],
                                "AND", 
                                ["subsidiary","anyof",sub_id],
                                "AND", 
                                ["isinactive","is","F"]
                            ],
                            columns:
                            [
                                "internalid"
                            ]
                        });
                        var searchcus_shortCount = searchcus_short.runPaged().count;
                        if (searchcus_shortCount == 1 ) {
                            searchcus_short.run().each(function(result){
                                cust_id = result.id
                            });
                        }
                    }
                }
                if(!isNullOrEmpty(cust_id)){
                    Remitter.setValue({fieldId: 'custrecord_crossref_netsuite_customer',value: cust_id,ignoreFieldChange: false});
                }
                log.debug({title: 'customer check',details: cust_id})
                Rec_Created = Remitter.save();
            }
            log.debug({title: 'Remitter Created',details: Rec_Created})
            res.rec_created = Rec_Created ;
            res.cust_id = cust_id  ;
            return res
        }
        function Update_Bank (id,value,message,Rec_Index){
            record.submitFields({type: 'customrecord_hb_ar_bank_files',id: id,values: value});
            log.audit({ title: Rec_Index ,details: 'Update Bank '+ message})
        }
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
        function Create_Direct_Payment(inv,date,account,bank_rec,period_id){
            var result = {}
            var Cust_Payment = record.transform({fromType: 'invoice',fromId: inv ,toType: 'customerpayment',isDynamic: true});
            Cust_Payment.setValue('trandate', formatDate(date));
            Cust_Payment.setValue('account',account);
            if(!isNullOrEmpty(period_id)){
                Cust_Payment.setValue('postingperiod',period_id);
            }
            Cust_Payment.setValue('custbody_hb_bank_record_source', bank_rec);
            var Cust_Payment_ID = Cust_Payment.save();
            var Cust_ID_Payment = search.lookupFields({type: search.Type.CUSTOMER_PAYMENT,id: Cust_Payment_ID, columns: ['entity']})
            result.Cust_id = Cust_ID_Payment.entity[0].value
            result.Paym_id = Cust_Payment_ID
            return result
        }
        function Get_Open_Inv (entity,amount,bank_currency,date,Doc_Num,Rec_Index,il,tran_cust) {
            var Result = {}
            var Audit_rec = {}         
            var min_amt_nis = amount - 2
            var max_amt_nis = amount + 2
            if(il){
                log.debug('IL Flow '+bank_currency, Rec_Index);
                Result.IL_flow = true
                var SearchInv = query.runSuiteQL({query:`                
                SELECT 
                    T.currency       tran_cur,
                    TLA.amountunpaid fx_amount,
                    T.foreignamountunpaid usd_amount,
                    T.id             tran_id,
                    T.trandate,
                    T.status,
                    t.tranid         doc_num
                FROM   TRANSACTION T
                    INNER JOIN transactionaccountingline TLA
                            ON T.id = TLA.TRANSACTION
                                AND TLA.transactionline = 0
                                AND TLA.accountingbook = 2
                    WHERE    t.entity = ${entity}
                        AND      t.foreignamountunpaid > 0
                        AND      t.trandate <= '${date}'
                ORDER  BY t.trandate `}).asMappedResults();
            }else{
                log.debug('Non IL Flow', Rec_Index);
                Result.IL_flow = false
                var SearchInv = query.runSuiteQL({query:`                
                SELECT
                    t.currency            tran_cur,
                    t.foreignamountunpaid fx_amount,
                    t.id                  tran_id,
                    t.trandate ,
                    t.status ,
                    t.tranid doc_num
                FROM     TRANSACTION T
                WHERE    t.entity = ${entity}
                    AND      t.foreignamountunpaid > 0
                    AND      t.trandate <= '${date}'
                ORDER BY t.trandate
                `}).asMappedResults();
            }
            Audit_rec.action = 'Search Open Invoice Result' ;
            Audit_rec.value = SearchInv ;
            log.audit(Rec_Index, Audit_rec); 
            var Tran_Array = []
            var Total_Amount_FX = 0
            for (var y = 0 ; y < SearchInv.length ; y++){
                if (bank_currency == SearchInv[y].tran_cur && SearchInv[y].status == 'A'){
                    var tran_amount = SearchInv[y].fx_amount
                    log.debug('Bank = Tran',amount + ' - ' + tran_amount);
                    if (amount == tran_amount){
                        log.debug('Exact Matched',SearchInv[y].tran_id);
                        Result.Action = 'Invoice_match'
                        Result.Tran_ID = SearchInv[y].tran_id
                        if(il){
                            Result.USD_amt = SearchInv[y].usd_amount
                        } 
                        return Result
                    }
                    if (il && tran_amount <= max_amt_nis && tran_amount >= min_amt_nis ){
                        Result.Action = 'Invoice_match'
                        Result.Tran_ID = SearchInv[y].tran_id
                        Result.USD_amt = SearchInv[y].usd_amount
                        return Result
                    }
                    if (il && tran_cust == SearchInv[y].tran_id){
                        Result.Action = 'Invoice_guess_IL'
                        Result.Tran_ID = SearchInv[y].tran_id
                        Result.USD_amt = SearchInv[y].usd_amount
                        return Result
                    }
                    Total_Amount_FX = Total_Amount_FX + SearchInv[y].fx_amount
                    if(il){
                        Tran_Array.push({
                            Tran_ID : SearchInv[y].tran_id,
                            Tran_Amount : SearchInv[y].fx_amount,
                            Tran_Date : SearchInv[y].trandate,
                            Tran_Doc_Num : SearchInv[y].doc_num,
                            Tran_Amount_USD : SearchInv[y].usd_amount
                        });
                    }else{
                        Tran_Array.push({
                            Tran_ID : SearchInv[y].tran_id,
                            Tran_Amount : SearchInv[y].fx_amount,
                            Tran_Date : SearchInv[y].trandate,
                            Tran_Doc_Num : SearchInv[y].doc_num
                        });
                    }
                    log.debug('Total Amount',Total_Amount_FX);
                    log.debug('Tran_Array',Tran_Array);
                }
                if (amount == Total_Amount_FX.toFixed(2)){
                    Result.Action = 'Tran_Array'
                    Result.Tran_Array =  Tran_Array
                    log.audit(Rec_Index,'Tran_New Array');
                    return Result
                }
                if (il && Total_Amount_FX <= max_amt_nis && Total_Amount_FX >= min_amt_nis ){
                    Result.Action = 'Tran_Array_IL'
                    Result.Tran_Array =  Tran_Array
                    log.audit(Rec_Index,'Tran_New Array IL');    
                    return Result
                }
            }
            if (Tran_Array.length > 0 ){
                Audit_rec.action = 'Guess Check - Data Inv Same Currency' ;
                Audit_rec.value = Tran_Array
                log.audit(Rec_Index, Audit_rec); 
                return GuessMatch(Tran_Array,bank_currency,amount,date,Doc_Num);
            }  
        }
        function Create_MultiPayment(invoices,account,bank_rec,Cust,currency,date,fx_amount,period_id,il){
            var result = {}
            var Payment = record.create({type: 'customerpayment', isDynamic: true})
            var amount_usd = 0;
            Payment.setValue('customer',Cust);
            Payment.setValue('currency',currency);
            Payment.setValue('trandate',formatDate(date));
            Payment.setValue('account',account);
            if(!isNullOrEmpty(period_id)){
                Payment.setValue('postingperiod',period_id);
            }
            Payment.setValue('payment',fx_amount);
            Payment.setValue('custbody_hb_bank_record_source', bank_rec);
            var Line_Count = Payment.getLineCount('apply');
            for (var i = 0; i < Line_Count; i++) {
                var line = Payment.selectLine({sublistId: 'apply',line: i});
                var tran_id = line.getCurrentSublistValue({ sublistId: 'apply', fieldId: 'internalid', line: i });
                for (var a = 0 ; a < invoices.length ; a++){
                    if (invoices[a].Tran_ID == tran_id ){
                        line.setCurrentSublistText({ sublistId: 'apply', fieldId: 'apply', line: i , text: 'T' });
                        line.commitLine({sublistId: 'apply'});
                        if(il){
                            amount_usd = amount_usd + invoices[a].USD_amt;
                        }
                    }
                }
            }
            result.Paym_id = Payment.save();
            result.Cust_id = Cust;
            result.usd_amount = amount_usd;
            log.debug('result', result);
            return result
        }
        function GuessMatch(Invoices,Currency,Amount,Date,Doc_Num){
            log.debug('Invoices' , Invoices)
            log.debug('Currecy' , Currency)
            var Result = {}
            var Min_P = 0.95 * Amount
            var Max_P = 1.05 * Amount
            log.debug('Min - Max', Min_P + ' - ' + Max_P)
            for (var i = 0; i < Invoices.length ; i++){
                if ( formatDate(Invoices[i].Tran_Date) <= formatDate(Date)){
                    if (Doc_Num == Invoices[i].Tran_Doc_Num){
                        log.debug('Matched Inv', Doc_Num);
                        Result.Action = 'Guess';
                        Result.Tran_ID = Invoices[i].Tran_ID;
                        if (Min_P < Invoices[i].Tran_Amount && Invoices[i].Tran_Amount < Max_P){
                            Result.Bank_Rec_Status = 6
                            Result.Tran_ID = Invoices[i].Tran_ID ;
                            Result.Log = 'Best Guess By Invoice Ref'
                        }
                        if (Invoices[i].Tran_Amount > Max_P){
                            Result.Bank_Rec_Status = 5 ; 
                            Result.Log = 'Best Guess - By Invoice Ref Underpayment'
                        }if(Invoices[i].Tran_Amount < Min_P ){
                            Result.Bank_Rec_Status = 4 ; 
                            Result.Log = 'Best Guess - By Invoice Ref OverPayment'
                        }
                        return Result
                    }
                }
            }
            for (var i = 0; i < Invoices.length ; i++){
                if (Min_P < Invoices[i].Tran_Amount && Invoices[i].Tran_Amount < Max_P ){
                    log.debug('Tran matched', Invoices[i].Tran_ID)
                    Result.Action = 'Guess';
                    Result.Bank_Rec_Status = 6
                    Result.Tran_ID = Invoices[i].Tran_ID ;
                    Result.Log = 'Best Guess'
                    return Result
                }
            }
        }
        function GetBankStatus(rec_id){
            var bank_data  = search.lookupFields({
                type: 'customrecord_hb_ar_bank_files',
                id: rec_id,
                columns: 'custrecord_hb_payment_created'
            })
            if (!isNullOrEmpty(bank_data.custrecord_hb_payment_created[0].value)){
               return bank_data.custrecord_hb_payment_created[0].value
            }
            return null
        }
        function CreateJE(date,amount,currency,subsidiary,fee_acc,bank_acc){
            var JE = record.create({type: 'journalentry' ,isDynamic: true});
            JE.setValue('subsidiary',subsidiary);
            JE.setValue('currency',currency);
            JE.setValue('trandate',formatDate(date));
            JE.selectNewLine({sublistId: 'line'});
            JE.setCurrentSublistValue({sublistId: 'line',fieldId: 'account',value: fee_acc});
            JE.setCurrentSublistValue({sublistId: 'line',fieldId: 'credit',value: amount});
            JE.commitLine({sublistId: 'line'});
            JE.selectNewLine({sublistId: 'line'});
            JE.setCurrentSublistValue({sublistId: 'line',fieldId: 'account',value: bank_acc});
            JE.setCurrentSublistValue({sublistId: 'line',fieldId: 'debit',value: amount});
            JE.commitLine({sublistId: 'line'});                    
            var JE_Created =  JE.save();
            return JE_Created
        }
        function TransferFunds(from_acc,to_acc,date,from_amt,to_amt,bank_payment,payment){
            log.debug('Bank Payment',bank_payment);
            var Transfer = record.create({type: 'customrecord_cashapp_transfer_funds', isDynamic: true});
            Transfer.setValue('custrecord_catf_from_account',from_acc);
            Transfer.setValue('custrecord_catf_to_account',to_acc);
            Transfer.setValue('custrecord_caft_bank_payment_related',bank_payment);
            Transfer.setValue('custrecord_caft_payment_related',payment.Paym_id);
            Transfer.setValue('custrecord_catf_date',formatDate(date));
            Transfer.setValue('custrecord_catf_from_amt',from_amt);
            Transfer.setValue('custrecord_catf_to_amt',to_amt);
            //Transfer.setValue('memo','');
            var rec_created = Transfer.save();
            return rec_created;
        }
    }
);	