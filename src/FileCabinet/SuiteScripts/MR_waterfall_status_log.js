/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * *Author    Daniel Starkman - daniel@finance4.cloud
 */

define(['N/record', 'N/runtime', 'N/search', 'N/email', 'N/format', 'N/query', 'N/task','N/url','N/https'],
    function (record, runtime, search, email, format, query, task,url,https) {
        var exports = {}
        function getInputData(inputContext) {
            try {
                var script = runtime.getCurrentScript();
                var period = script.getParameter({ name: "custscript_waterfall_period" });
                const waterfall_data = search.load({
                    id: 'customsearch_waterfall_data'               
                })
                var waterfall_data_result = [];
                var resultset = waterfall_data.run();
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
                        var fx_amount = s[i].getValue({ name: 'fxamount'});
                        var exchange_rate = s[i].getValue({ name: 'exchangerate'});
                        var last_snapshot = s[i].getValue({ name: 'custbody_csl_last_snapshot_balance'});
                        var usd_amount = (fx_amount * exchange_rate).toFixed(2);
                        var last_snapshot_usd = (last_snapshot * exchange_rate).toFixed(2);
                        waterfall_data_result.push({
                            tran_id : s[i].id ,
                            fx_amount : fx_amount,
                            fx_amount_remain : s[i].getValue({ name: 'fxamountremaining'}),
                            old_snapshot_status : s[i].getValue({ name: 'custbody_csl_status'}),
                            currency : s[i].getValue({ name: 'currency'}),
                            state_id : s[i].getValue({ name: 'internalid', join: 'CUSTBODY_IL_TRANSACTION_STATE' }),
                            print_original : s[i].getValue({ name: 'custrecord_il_tranoriginal_printed', join: 'CUSTBODY_IL_TRANSACTION_STATE' }),
                            usd_amount : usd_amount,
                            last_snapshot_usd : last_snapshot_usd,
                            last_snapshot : last_snapshot,
                            days_overdue : s[i].getValue({ name: 'daysoverdue'}),
                            entity : s[i].getValue({ name: 'entity'}),
                            links : s[i].getValue({ name: 'custbody_csl_last_snapshot_lines_link'}),
                            exchange_rate : exchange_rate ,
                            tran_period : s[i].getValue({ name: 'custbody_csl_period'})
                        })
                    }
                }
                log.debug({
                    title : 'Data Length',
                    details : waterfall_data_result.length
                });
            return waterfall_data_result
            } catch (e) {
                log.error('error - getInputData', e);
            }

        }
        function map(mapContext) {
            try{
                var script = runtime.getCurrentScript();
                var period = script.getParameter({ name: "custscript_waterfall_period" });
                log.debug('Period Param',period);
                var ObjLine = JSON.parse(mapContext.value);
                if (ObjLine.tran_period == period){
                    return
                }
                var status_id = 2 
                if (ObjLine.days_overdue > 90 ){
                    status_id = 5
                }
                if (ObjLine.days_overdue < 90 && ObjLine.days_overdue >= 60){
                    status_id = 4
                }
                if (ObjLine.days_overdue < 60 && ObjLine.days_overdue >= 30){
                    status_id = 3
                }
                if (ObjLine.days_overdue == 0){
                    status_id = 1
                }
                var amount_paid_fx = 0
                log.debug('Current Status',status_id);
                log.debug('Line Data',ObjLine);
                if (ObjLine.print_original == true){
                    log.debug('Print False',ObjLine.Tran_ID);
                    SetIL(ObjLine.state_id,false)
                }
                var tran_rec = record.load({
                    type: 'invoice',
                    id: ObjLine.tran_id,
                    isDynamic: false,
                });
                var new_rec = true;
                var new_rec_application = false;
                var log_rec_status_created = null
                var data_lines = get_line_data(tran_rec,'links',['id','tranid','type','trandate','total'],period);
                if(!isNullOrEmpty(ObjLine.last_snapshot)){
                    new_rec = false	
                }else{
                    ObjLine.last_snapshot = ObjLine.fx_amount_remain
                }
                if (new_rec && ObjLine.fx_amount != ObjLine.fx_amount_remain){
                    new_rec = false
                    new_rec_application = true
                    ObjLine.last_snapshot = ObjLine.fx_amount
                    ObjLine.old_snapshot_status = 1
                }
                log.debug('log rec Status Created for rec ' + ObjLine.tran_id,ObjLine.links)
                //Snapshoot Status Record Creation
                if ( new_rec || ObjLine.old_snapshot_status == ObjLine.status_id ){
                    log.debug('Action for Rec '+ ObjLine.tran_id,'Snapshoot No Change');
                    var log_rec_status = record.create({
                        type: 'customrecord_collection_status_log',
                        isDynamic: true,
                    });
                    log_rec_status.setValue('custrecord_cls_transaction',tran_rec.id);
                    log_rec_status.setValue('custrecord_csl_status',ObjLine.status_id);
                    log_rec_status.setValue('custrecord_csl_customer',ObjLine.entity);
                    log_rec_status.setValue('custrecord_csl_period',period);
                    log_rec_status.setValue('custrecord_csl_type',1); // Snapshoot
                    log_rec_status.setValue('custrecord_csl_amount_open',ObjLine.fx_amount);
                    log_rec_status.setValue('custrecord_csl_open_amount_usd',ObjLine.usd_amount);
                    log_rec_status_created = log_rec_status.save();
                    log.debug('log rec Status Created for rec ' + ObjLine.tran_id, log_rec_status_created);
                }
                //Change in Amount 
                if ( !new_rec && ObjLine.fx_amount_remain != ObjLine.last_snapshot ){
                    log.debug('Action for Rec '+ ObjLine.tran_id,'Change in Amount');
                    log.debug('Data lines for Rec '+ ObjLine.tran_id,data_lines);
                    var diff_amount = ObjLine.last_snapshot - ObjLine.fx_amount_remain 
                    log.debug({
                        title: 'diff_amount',
                        details: diff_amount
                    });
                    var lines_change_link = check_diff_array(ObjLine.links,data_lines); 
                    log.audit('diff_array',lines_change_link);
                    for (var m = 0 ; m < lines_change_link.lines_old.length ; m++){
                        var line_old_obj =  lines_change_link.lines_old[m]
                        var tran_add_data_credit = query.runSuiteQL({
                            query:`
                            select  
                                tlk.foreignamount fx_amount, 
                                t.custbodycustbody_il_credit_reason 
                            from 
                                transaction t 
                                left join previoustransactionlinelink tlk on tlk.nextdoc = t.id 
                                and tlk.previousdoc = ${tran_rec.id} 
                            where 
                                t.id =   ${line_old_obj.id}
                            `
                        }).asMappedResults();
                        log.debug('tran_add_data_credit',tran_add_data_credit);
                        var log_rec_old_create = record.create({
                            type: 'customrecord_collection_status_log',
                            isDynamic: true,
                        });
                        log_rec_old_create.setValue('custrecord_cls_transaction',tran_rec.id);
                        log_rec_old_create.setValue('custrecord_csl_status',10);
                        log_rec_old_create.setValue('custrecord_csl_customer',ObjLine.entity);
                        log_rec_old_create.setValue('custrecord_csl_application_status',ObjLine.custbody_csl_status);
                        log_rec_old_create.setValue('custrecord_csl_type',2);//Transaction
                        log_rec_old_create.setValue('custrecord_csl_period',period);
                        log_rec_old_create.setValue('custrecord_csl_amount_open',tran_add_data_credit[0].fx_amount * -1);
                        log_rec_old_create.setValue('custrecord_csl_open_amount_usd', line_old_obj.total * -1 ) ;
                        log_rec_status_created = log_rec_old_create.save();
                        log.debug('log rec Status Created for rec ' + ObjLine.tran_id, log_rec_status_created);	
                        amount_paid_fx = amount_paid_fx - tran_add_data_credit[0].fx_amount 
                    }
                    for (var n = 0 ; n < lines_change_link.lines_new.length ; n++){
                        var line_new_obj =  lines_change_link.lines_new[n]
                        var obj_status = null ;
                        log.debug('Type',line_new_obj.type);
                        if (line_new_obj.type == 'Currency Revaluation'){
                            continue;
                        }else{
                            var tran_add_data = query.runSuiteQL({
                                query:`
                                select  
                                    tlk.foreignamount fx_amount, 
                                    t.custbodycustbody_il_credit_reason 
                                from 
                                    transaction t 
                                    left join previoustransactionlinelink tlk on tlk.nextdoc = t.id 
                                    and tlk.previousdoc = ${tran_rec.id} 
                                where 
                                    t.id =   ${line_new_obj.id}
                                `
                            }).asMappedResults();
                            log.debug('tran_add_data',tran_add_data);
                            if (line_new_obj.type == 'Payment'){
                                obj_status = 7
                            }
                            if (line_new_obj.type == 'Credit Memo'){
                                switch(tran_add_data[0].custbodycustbody_il_credit_reason){
                                    case "1" :
                                        obj_status = 9
                                        break;
                                    case "2" :
                                        obj_status = 9
                                        break;
                                    default :
                                        obj_status = 8
                                }
                            }
                        }
                        var log_rec_new_create = record.create({
                            type: 'customrecord_collection_status_log',
                            isDynamic: true,
                        });
                        log_rec_new_create.setValue('custrecord_csl_status',obj_status);	
                        log_rec_new_create.setValue('custrecord_cls_transaction',tran_rec.id);
                        log_rec_new_create.setValue('custrecord_csl_customer',ObjLine.entity);
                        log_rec_new_create.setValue('custrecord_csl_application_status',ObjLine.old_snapshot_status);
                        log_rec_new_create.setValue('custrecord_csl_period',period);
                        log_rec_new_create.setValue('custrecord_csl_type',2);//Transaction
                        log_rec_new_create.setValue('custrecord_csl_amount_open',tran_add_data[0].fx_amount );
                        log_rec_new_create.setValue('custrecord_csl_open_amount_usd',line_new_obj.total ) ;
                        log_rec_status_created = log_rec_new_create.save();
                        log.debug('log rec Status Created for rec ' + ObjLine.tran_id, log_rec_status_created);	
                        amount_paid_fx = amount_paid_fx + tran_add_data[0].fx_amount 
                    }
                }
                var amount_open = ObjLine.last_snapshot - amount_paid_fx;
                //Waterfall Status Changed
                if ( !new_rec && ObjLine.old_snapshot_status != ObjLine.status_id ){
                    if (!new_rec_application){
                        log.debug('Action for Rec '+ ObjLine.tran_id,'Snapshoot Status Change');
                        var log_rec_status_old = record.create({
                            type: 'customrecord_collection_status_log',
                            isDynamic: true,
                        });
                        log_rec_status_old.setValue('custrecord_cls_transaction',tran_rec.id);
                        log_rec_status_old.setValue('custrecord_csl_status',ObjLine.old_snapshot_status);
                        log_rec_status_old.setValue('custrecord_csl_customer',ObjLine.entity);
                        log_rec_status_old.setValue('custrecord_csl_period',period);
                        log_rec_status_old.setValue('custrecord_csl_amount_open', ObjLine.last_snapshot * -1 );
                        log_rec_status_old.setValue('custrecord_csl_type',1); // Snapshoot
                        log_rec_status_old.setValue('custrecord_csl_open_amount_usd',ObjLine.last_snapshot_usd * - 1);
                        log_rec_status_created = log_rec_status_old.save();
                        log.debug('log rec Status Created for rec ' + ObjLine.tran_id, log_rec_status_created);
                    }
                    if (new_rec_application){
                        log.debug('Action for Rec '+ ObjLine.tran_id,'New Rec Application');

                    }
                    var log_rec_status_new = record.create({
                        type: 'customrecord_collection_status_log',
                        isDynamic: true,
                    });
                    log_rec_status_new.setValue('custrecord_cls_transaction',tran_rec.id);
                    log_rec_status_new.setValue('custrecord_csl_status',status_id);
                    log_rec_status_new.setValue('custrecord_csl_period',period);
                    log_rec_status_new.setValue('custrecord_csl_customer',ObjLine.entity);
                    log_rec_status_new.setValue('custrecord_csl_type',1); // Snapshoot
                    log_rec_status_new.setValue('custrecord_csl_amount_open', amount_open);
                    log_rec_status_new.setValue('custrecord_csl_open_amount_usd', amount_open * ObjLine.exchange_rate );
                    log_rec_status_created = log_rec_status_new.save();
                    log.debug('log rec Status Created for rec ' + ObjLine.tran_id, log_rec_status_created);	
                }
                //Closed Transaction Case
                if (amount_open == 0){
                    tran_rec.setText('custbody_funnel_close','T');
                    status_id = 6
                }
                tran_rec.setValue('custbody_csl_status',status_id)
                tran_rec.setValue('custbody_csl_last_snapshot_balance',amount_open);
                tran_rec.setValue('custbody_csl_period',period);
                tran_rec.setValue('custbody_csl_last_snapshot_lines_link',JSON.stringify(data_lines));
                tran_rec.save();
                if (ObjLine.print_original == true){
                    log.debug('Print True',ObjLine.Tran_ID);
                    SetIL(ObjLine.state_id,true);
                }
            }catch(er){
                log.error("Error Creation for Rec : "+ObjLine.tran_id ,er.message);
            }
            return mapContext.value;
        }

        function summarize(context) { 
        }

     //--------------------------------------------------------------FUNCTIONS--------------------------------------------------------------
    function isNullOrEmpty(val) {
        if (typeof (val) == 'undefined' || val == null || (typeof (val) == 'string' && val.length == 0)) {
            return true;
        }
        return false;
    }
    function get_line_data (record,sublist,field_array,period){
		var result = [];
		log.debug('period', period);
		var line_link_count = record.getLineCount({
			sublistId: sublist
		});
		log.debug('sublist count', line_link_count);
		if (line_link_count > 0 ){
			for (var n = 0 ; n < line_link_count ; n++){
				var line_push = true
				var dataline = {};
				for (var i = 0 ; i < field_array.length ; i++){
					var field_name = field_array[i]
					var field_value = record.getSublistValue({
						sublistId: sublist,
						fieldId: field_name,
						line: n
					});
					dataline[field_name] = field_value
					if ((field_name == 'tranid' &&  isNullOrEmpty(field_value) )||(field_name == 'total' && isNullOrEmpty(field_value))){
						line_push = false
					}
                    if (field_name == 'id'){
                        var search_period = query.runSuiteQL({
                            query:`
                            select   
                                t.postingperiod	 
                            from 
                                transaction t  
                            where 
                                t.id =   ${field_value} and t.postingperiod	 <= ${period}
                            `
                        }).asMappedResults();
                        if (search_period.length == 0){
                            line_push = false
                        }
                    }
				}
				if (line_push){
					result.push(dataline);	
				}
			}
		}
		log.debug({
			title: 'Link Result for Rec'+ record.id ,
			details: result
		})	
		return result
	}
	function check_diff_array(old_array,new_array) {
		if(!isNullOrEmpty(old_array)){
			old_array = JSON.parse(old_array);
		}else{
			old_array = []
		}
		log.debug('old_array',old_array);
		log.debug('new_array',new_array);
		var res = {}
		var lines_old = [];
		var lines_new = [];
		for (var i = 0; i < old_array.length ; i++){
			var exist_2_array = false
			for( var n = 0 ; n < new_array.length ; n++){
				if (old_array[i].id == new_array[n].id && old_array[i].total == new_array[n].total){
					exist_2_array = true
				}

			}
			if (!exist_2_array){
				var old_rec = old_array[i]
				lines_old.push(old_rec);
			}
		}
		for (var m = 0 ; m < new_array.length ; m++){
			exist_2_array = false
			for (var l = 0 ; l < old_array.length ; l ++){
				if ( new_array[m].id == old_array[l].id && old_array[l].total == new_array[m].total){
					exist_2_array = true
				}
			}
			if (!exist_2_array){
				var new_rec = new_array[m]
				lines_new.push(new_rec);
			}
		}
		res.lines_old = lines_old
		res.lines_new = lines_new
		return res
	}
	function SetIL(Tran_ID,Status) {
        record.submitFields({
            type: 'customrecord_il_transaction_state',
            id:  Tran_ID,
            values: {custrecord_il_tranoriginal_printed:Status},
        })
    }
    exports.getInputData = getInputData
    exports.map = map
    return exports
 });