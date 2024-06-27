    /**
     * @NApiVersion 2.1
     * @NScriptType ScheduledScript
     */
     define(['N/search', 'N/runtime', 'N/format', 'N/record','N/query', 'N/task'],
     function (search, runtime, format, record,query, task) {
 
        var exports = {};
        function execute(context) {
            var script = runtime.getCurrentScript();
            Triggerd_Rec = script.getParameter({ name: "custscript_amr_rec" });
            Triggerd_Rec_type = script.getParameter({name: 'custscript_amr_rec_type'})
            var ClearingQL = query.runSuiteQL({
                query:`select custrecord_default_clearing_acc as cl_account
                from customrecord_amortization_settings
                fetch first 1 rows only`
            }).asMappedResults();
            Clearing_account = ClearingQL[0].cl_account
            log.debug({
                title: 'Triggerd Data',
                details: Triggerd_Rec_type +','+Triggerd_Rec
            })
            var list_type = 'expense';
            if (Triggerd_Rec_type == 'journalentry'){
                 list_type = 'line';
             }
            var data_lines = []
            if (!isNullOrEmpty(Triggerd_Rec)){
                var Transaction  = record.load({
                    type: Triggerd_Rec_type,
                    id: Triggerd_Rec,
                    isDynamic: false,
                });
                var subsidiary = Transaction.getValue('subsidiary');
                var Tran_date = Transaction.getValue('trandate');
                var Entity = Transaction.getValue('entity');
                var Doc_number = Transaction.getValue('tranid');
                var sql = query.runSuiteQL({
                    query:`select tl.uniquekey,
                    tl.custcol_amr_destination_account,
                    tl.custcol_amr_temp,
                    tl.amortizstartdate,
                    tl.amortizationenddate,
                    tl.custcol_amr_data                as amr_data,
                    temp_b.custrecord_atlb_at          as amortization_template,
                    temp_b.custrecord_atlb_ab          as accounting_book_template,
                    temp_b.id                          as temp_book,
                    tla.amount                         as amount,
                    tla.account                        as account,
                    tl.department                      as department,
                    link.id                            as link_id,
                    link.custrecord_amr_dest_acc       as link_acc,
                    link.custrecord_amr_amount         as link_amount,
                    link.custrecord_amr_department     as link_department,
                    link.custrecord_amr_transaction    as link_je,
                    link.custrecord_amr_start_date     as link_start,
                    link.custrecord_amr_end_date       as link_end,
                    link.custrecord_amr_temp_link_book as link_temp_book,
                    sub_book.currency                  as book_currency
                        from transactionline as tl
                            left join transactionaccountingline as tla on tl.transaction = tla.transaction and tl.id = tla.transactionline
                            left join customrecord_atlb as temp_b on temp_b.custrecord_altb_atl = tl.custcol_amr_temp and
                                                                    tla.accountingbook = temp_b.custrecord_atlb_ab
                            left join customrecord_amr_link as link on tla.accountingbook = link.custrecord_amr_accounting_book and
                                                                        tl.uniquekey = link.custrecord_amr_source_line
                            left join AccountingBookSubsidiaries as sub_book
                                        on sub_book.accountingbook = temp_b.custrecord_atlb_ab and sub_book.subsidiary = ${subsidiary}
                    where tl.transaction = ${Triggerd_Rec}
                    and tla.account is not null
                    order by tl.uniquekey`
                }).asMappedResults();
                var lines = Transaction.getLineCount({sublistId: list_type});
                for (x = 0 ; x < lines ; x++){
                    var tran_line = Transaction.getSublistValue({sublistId: list_type,fieldId: 'lineuniquekey',line: x});
                    var amr_data = Transaction.getSublistValue({sublistId: list_type,fieldId: 'custcol_amr_data',line: x});
                    data_lines.push({
                    'tran_line' : tran_line,
                    'line' : x,
                    'Doc_number' : Doc_number,
                    'subsidiary': subsidiary,
                    'amr_data' : amr_data,
                   });
                }
                log.debug('SQL',sql);
                log.debug('Data',data_lines);
                for (i = 0 ; i < data_lines.length; i++){
                    if (data_lines[i].amr_data == 'Create' || data_lines[i].amr_data == 'Change'){//|| data_lines[i].amr_data == 'Complete'
                        log.debug({
                            title: 'Data_line : ' +i,
                            details: data_lines[i]
                        })
                        for (j = 0; j < sql.length; j++){
                            if(data_lines[i].tran_line == sql[j].uniquekey ){
                                log.debug({
                                    title: 'line : '+j ,
                                    details: sql[j]
                                })
                                var link = '';
                                var action = false;
                                var delete_action = false
                                if (isNullOrEmpty(sql[j].link_id)){
                                    log.debug({
                                        title: 'check new',
                                        details: isNullOrEmpty(sql[j].link_id)
                                    })
                                    link = record.create({type: 'customrecord_amr_link',isDynamic:false});
                                    action = true;
                                    log.debug({
                                        title: 'Rec_Created Line:',
                                        details: data_lines[i].tran_line
                                    })
                                };
                                if (sql[j].link_department != sql[j].department ){
                                    action = true;
                                    //log.debug({title: 'Department',details: sql[j].link_department + '-' + sql[j].department});
                                };
                                if (Number(sql[j].amount) != Number(sql[j].link_amount) ){
                                    action = true;
                                    //log.debug({title: 'Amount',details: sql[j].link_department + '-' + sql[j].department});
                                };
                                if (sql[j].custcol_amr_destination_account != sql[j].link_acc ){
                                    action = true;
                                    //log.debug({title: 'Account',details: sql[j].link_department + '-' + sql[j].department});
                                };
                                if (sql[j].amortizstartdate != sql[j].link_start){
                                    //log.debug({title: 'Start Date',details: sql[j].temp_book + '-' + sql[j].link_temp_book});
                                    action = true;
                                };
                                if (sql[j].amortizationenddate != sql[j].link_end ){
                                    //log.debug({title: 'End Date',details: sql[j].amortizationenddate  + '-' + sql[j].link_end});
                                    action = true;
                                };
                                if (sql[j].temp_book != sql[j].link_temp_book ){
                                    action = true;
                                    //log.debug({title: 'Book',details: sql[j].temp_book + '-' + sql[j].link_temp_book});
                                };
                                if (isNullOrEmpty(sql[j].amortization_template)){
                                    action = true;
                                    //log.debug({title: 'Book',details: sql[j].temp_book + '-' + sql[j].link_temp_book});
                                };
                                log.debug({
                                    title: 'Action',
                                    details: action
                                })
                                if (isNullOrEmpty(sql[j].custcol_amr_destination_account)){
                                    action = false
                                    var Delete = query.runSuiteQL({
                                        query:`select id link_id, custrecord_amr_transaction je_id from customrecord_amr_link 
                                        where custrecord_amr_source_t = ${Triggerd_Rec} and custrecord_amr_source_line = ${sql[j].uniquekey}  `
                                    }).asMappedResults();
                                    log.debug({
                                        title: 'Delete Query ',
                                        details: Delete
                                    });
                                    log.debug({
                                        title: 'Delete Query Lengh',
                                        details: Delete.length
                                    });


                                    for (x = 0 ;x < Delete.length ; x++ ){
                                        log.debug('Audit Delete Row: ' +x,Delete[x] )
                                        record.delete({type: 'journalentry',id: Delete[x].je_id });
                                        record.delete({type: 'customrecord_amr_link',id: Delete[x].link_id });
                                    }
                                }
                                if (action){
                                    if (isNullOrEmpty(link)){
                                        link = record.load({type:'customrecord_amr_link',id : sql[j].link_id , isDynamic : false });
                                    };
                                    var Start_Date = FormatDate(sql[j].amortizstartdate);
                                    var End_Date = FormatDate(sql[j].amortizationenddate);
                                    link.setValue('custrecord_amr_temp_link_book',sql[j].temp_book);
                                    link.setValue('custrecord_amr_source_t',Triggerd_Rec);
                                    link.setValue('custrecord_amr_source_line',data_lines[i].tran_line);
                                    link.setValue('custrecord_amr_start_date',Start_Date);
                                    link.setValue('custrecord_amr_end_date',End_Date);
                                    link.setValue('custrecord_amr_amount',sql[j].amount);
                                    link.setValue('custrecord_amr_source_doc_n',data_lines[i].Doc_number);
                                    link.setValue('custrecord_amr_accounting_book',sql[j].accounting_book_template);
                                    link.setValue('custrecord_amr_department',sql[j].department);
                                    link.setValue('custrecord_amr_dest_acc',sql[j].custcol_amr_destination_account);
                                    var savelink = link.save();
                                    log.debug({
                                        title: 'Save Link',
                                        details: savelink
                                    })
                                    if (!isNullOrEmpty(sql[j].link_je)){
                                        try{
                                        record.delete({type: 'journalentry',id: sql[j].link_je });
                                        }catch(e){
                                            log.debug({title: 'Delete Record Error: ' + sql[j].link_je,details: e});
                                            continue
                                        };
                                    }
                                    var JE = record.create({type: 'journalentry' ,isDynamic: true});
                                    JE.setValue('subsidiary',data_lines[i].subsidiary);
                                    JE.setValue('currency',sql[j].book_currency);
                                    JE.setValue('trandate',Tran_date);
                                    JE.setValue('accountingbook',sql[j].accounting_book_template);
                                    JE.setValue('exchangerate',1);
                                    JE.setText('bookje','T');
                                    JE.setValue('custbody_amr_link',savelink);
                                    JE.selectNewLine({sublistId: 'line'});
                                    JE.setCurrentSublistValue({sublistId: 'line',fieldId: 'account',value: sql[j].custcol_amr_destination_account});
                                    JE.setCurrentSublistValue({sublistId: 'line',fieldId: 'debit',value: sql[j].amount});
                                    JE.setCurrentSublistValue({sublistId: 'line',fieldId: 'memo',value: 'Destination'});
                                    JE.setCurrentSublistValue({sublistId: 'line',fieldId: 'entity',value: Entity});
                                    JE.setCurrentSublistValue({sublistId: 'line',fieldId: 'department',value: sql[j].department});
                                    JE.setCurrentSublistValue({sublistId: 'line',fieldId: 'schedule',value: sql[j].amortization_template});
                                    JE.setCurrentSublistValue({sublistId: 'line',fieldId: 'startdate',value: Start_Date});
                                    JE.setCurrentSublistValue({sublistId: 'line',fieldId: 'enddate',value: End_Date}); 
                                    JE.commitLine({sublistId: 'line'});
                                    JE.selectNewLine({sublistId: 'line'});
                                    JE.setCurrentSublistValue({sublistId: 'line',fieldId: 'account',value: Clearing_account});
                                    JE.setCurrentSublistValue({sublistId: 'line',fieldId: 'credit',value: sql[j].amount});
                                    JE.setCurrentSublistValue({sublistId: 'line',fieldId: 'memo',value: 'Source'});
                                    JE.setCurrentSublistValue({sublistId: 'line',fieldId: 'entity',value: Entity});
                                    JE.setCurrentSublistValue({sublistId: 'line',fieldId: 'department',value: sql[j].department});
                                    JE.commitLine({sublistId: 'line'});                    
                                    var JE_Created =  JE.save();
                                    log.debug({
                                        title: 'JE_Created',
                                        details: JE_Created
                                    })
                                    je_link = record.load({type:'customrecord_amr_link',id : savelink , isDynamic : false });
                                    je_link.setValue('custrecord_amr_transaction',JE_Created);
                                    var AMR = query.runSuiteQL({
                                        query : `select schedulenumber,  id from amortizationschedule where sourcetran = ${JE_Created}                                        `
                                    }).asMappedResults();
                                    je_link.setValue('custrecord_amr_amr_schedule_id',AMR[0].id);
                                    je_link.setValue('custrecord_amr_amr_schedule_name',AMR[0].schedulenumber);                                   
                                    je_link.save();    
                                }
                            }
                            /*
                           */
                        }
                    }
                    Transaction.setSublistValue({
                        sublistId: list_type,
                        fieldId: 'custcol_amr_data',
                        line: data_lines[i].line,
                        value: 'Complete'
                    });
                }
                Transaction.save();
                log.debug({
                    title: 'Amortization Created',
                        details: Triggerd_Rec
                });    
            }
        }
        function DateString(date){
            format_date = FormatDate(date)
            return  format_date.getDay() + '/'+ (format_date.getMonth() + 1) +'/'+(format_date.getYear() + 1900) 
        }
        function GetUsage() {
             var scriptObj = runtime.getCurrentScript();
             var remainingUsage = scriptObj.getRemainingUsage();
             return remainingUsage
         }
         function isNullOrEmpty(val) {
             if (typeof (val) == 'undefined' || val == null || (typeof (val) == 'string' && val.length == 0)) {
                 return true;
             }
         return false;
         }
            function FormatDate(date) {
             var parsedDate = format.parse({
                 value: date,
                 type: format.Type.DATE
                 });
         return parsedDate
         }
 
         function Reschedule() {
             var scriptTask = task.create({ taskType: task.TaskType.SCHEDULED_SCRIPT });
             scriptTask.scriptId = runtime.getCurrentScript().id;
             scriptTask.deploymentId = runtime.getCurrentScript().deploymentId;
             scriptTask.submit();
         }
         
         exports.execute = execute
         return exports
     }
     );
 