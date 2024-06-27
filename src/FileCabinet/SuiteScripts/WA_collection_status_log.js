/**
 * @NApiVersion 2.1
 * @NScriptType workflowactionscript
 */

/*******************************************************************
 * Name 		: Collection status Log
 * Purpose 		: create a log of status for each Invoice for the Collection overview.
 * Script Type  : Workflow Action
 * Created On   : 18/05/2023
 * Script Owner : Daniel Starkman  "@Dsair92" - daniel@finace4.cloud
 ********************************************************************/

define(["N/url","N/record","N/search","N/query","N/runtime","N/log"],
	function(url,record,search,query,runtime,log) {
		function onAction(context) {
			try{
				log.debug('rec',context.newRecord.id);
				var Search = query.runSuiteQL({query:`
					select
						t.id tran_id,
						T.FOREIGNAMOUNTUNPAID FX_Amt,
						T.FOREIGNAMOUNTUNPAID * T.EXCHANGERATE USD_Amt,
						T.EXCHANGERATE fx_rate,
						T.CURRENCY,
						T.ENTITY,
						T.DAYSOPEN,
						T.custbody_csl_status , 
						T.custbody_csl_last_snapshot_balance,
						T.custbody_csl_last_snapshot_balance * T.EXCHANGERATE last_snapshot_usd ,
						T.custbody_il_transaction_state state_rec ,
						STATE.custrecord_il_tranoriginal_printed state_il ,
						case
							when T.CLOSEDATE is not null then 6
							when T.DAYSOVERDUESEARCH > 90 then 5
							when T.DAYSOVERDUESEARCH between 60 and 90 then 4
							when T.DAYSOVERDUESEARCH between 30 and 60 then 3
							when T.DAYSOVERDUESEARCH = 0 then 1
							when T.DAYSOVERDUESEARCH < 30 then 2
							else null  end           script_status_id,
						sysdate snapshot_date,
					from TRANSACTION T
						left join customrecord_il_transaction_state state
							on state.id = t.custbody_il_transaction_state 
						where t.ID = ${context.newRecord.id}		
				`}).asMappedResults();
				if (Search[0].state_il == 'T'){
					SetIL(Search[0].state_rec,false)
				}
				var tran_rec = record.load({
					type: context.newRecord.type,
					id: context.newRecord.id,
					isDynamic: false,
				})
				var new_rec = true;
				var log_rec_status_created = null
				var snapshot_balance = tran_rec.getValue('custbody_csl_last_snapshot_balance');
				if(!isNullOrEmpty(snapshot_balance)){
					new_rec = false	
				}
				var links_line_snapshoot = tran_rec.getValue('custbody_csl_last_snapshot_lines_link');
				//Snapshoot Status Record Creation
				if (new_rec || Search[0].script_status_id == Search[0].custbody_csl_status ){
					log.debug('Action for Rec '+ context.newRecord.id,'Snapshoot No Change');
					var log_rec_status = record.create({
						type: 'customrecord_collection_status_log',
						isDynamic: true,
					});
					log_rec_status.setValue('custrecord_cls_transaction',tran_rec.id);
					log_rec_status.setValue('custrecord_csl_status',Search[0].script_status_id);
					log_rec_status.setValue('custrecord_csl_customer',Search[0].entity);
					log_rec_status.setValue('custrecord_csl_type',1); // Snapshoot
					log_rec_status.setValue('custrecord_csl_amount_open',Search[0].fx_amt);
					log_rec_status.setValue('custrecord_csl_open_amount_usd',Search[0].usd_amt);
					log_rec_status_created = log_rec_status.save();
					log.debug('log rec Status Created for rec' + context.newRecord.id, log_rec_status_created);
				}
				//Waterfall Status Changed
				if (Search[0].script_status_id != Search[0].custbody_csl_status){
					log.debug('Action for Rec '+ context.newRecord.id,'Snapshoot Status Change');
					var log_rec_status_old = record.create({
						type: 'customrecord_collection_status_log',
						isDynamic: true,
					});
					log_rec_status_old.setValue('custrecord_cls_transaction',tran_rec.id);
					log_rec_status_old.setValue('custrecord_csl_status',Search[0].custbody_csl_status);
					log_rec_status_old.setValue('custrecord_csl_customer',Search[0].entity);
					log_rec_status_old.setValue('custrecord_csl_amount_open', Search[0].custbody_csl_last_snapshot_balance * -1 );
					log_rec_status_old.setValue('custrecord_csl_type',1); // Snapshoot
					log_rec_status_old.setValue('custrecord_csl_open_amount_usd',Search[0].last_snapshot_usd * - 1);
					log_rec_status_created = log_rec_status_old.save();
					log.debug('log rec Status Created for rec' + context.newRecord.id, log_rec_status_created);
					var log_rec_status_new = record.create({
						type: 'customrecord_collection_status_log',
						isDynamic: true,
					});
					log_rec_status_new.setValue('custrecord_cls_transaction',tran_rec.id);
					log_rec_status_new.setValue('custrecord_csl_status',Search[0].custbody_csl_status);
					log_rec_status_new.setValue('custrecord_csl_customer',Search[0].entity);
					log_rec_status_new.setValue('custrecord_csl_type',1); // Snapshoot
					log_rec_status_new.setValue('custrecord_csl_amount_open', Search[0].fx_amt);
					log_rec_status_new.setValue('custrecord_csl_open_amount_usd',Search[0].usd_amtt);
					log_rec_status_created = log_rec_status_new.save();
					log.debug('log rec Status Created for rec' + context.newRecord.id, log_rec_status_created);	
				}
				//Change in Amount 
				if (Search[0].fx_amt != snapshot_balance && !new_rec){
					log.debug('Action for Rec '+ context.newRecord.id,'Change in Amount');
					var data_lines = get_line_data(tran_rec,'links',['id','tranid','type','trandate','total']);
					log.debug('Data lines for Rec '+ context.newRecord.id,data_lines);
					var diff_amount = snapshot_balance - Search[0].fx_amt 
					log.debug({
						title: 'diff_amount',
						details: diff_amount
					});
					var lines_change_link = check_diff_array(links_line_snapshoot,data_lines); 
					log.audit('diff_array',lines_change_link);
					for (var m = 0 ; m < lines_change_link.lines_old.length ; m++){
						var line_old_obj =  lines_change_link.lines_old[m]
						var log_rec_old_create = record.create({
							type: 'customrecord_collection_status_log',
							isDynamic: true,
						});
						log_rec_old_create.setValue('custrecord_csl_new_status',10)
						log_rec_old_create.setValue('custrecord_cls_transaction',tran_rec.id);
						log_rec_old_create.setValue('custrecord_csl_customer',Search[0].entity);
						log_rec_old_create.setValue('custrecord_csl_type',2);//Transaction
						log_rec_old_create.setValue('custrecord_csl_amount_open',line_old_obj.total * -1);
						log_rec_old_create.setValue('custrecord_csl_open_amount_usd',Search[0].fx_rate * line_old_obj.total * -1 ) ;
						log_rec_status_created = log_rec_old_create.save();
						log.debug('log rec Status Created for rec' + context.newRecord.id, log_rec_status_created);	
					}
					for (var n = 0 ; n < lines_change_link.lines_new.length ; n++){
						var line_new_obj =  lines_change_link.lines_new[n]
						switch(line_new_obj.type){
							case 'Currency Revaluation' :
								return;
							case 'creditmemo':
								var fieldLookUp = search.lookupFields({
									type: 'creditmemo',
									id: line_new_obj.id,
									columns: ['custbodycustbody_il_credit_reason']
								});
								log.debug('credit_memo_reason',fieldLookUp);
							default :
								var log_rec_new_create = record.create({
									type: 'customrecord_collection_status_log',
									isDynamic: true,
								});
								if (line_new_obj.type == 'Payment'){
									log_rec_new_create.setValue('custrecord_csl_new_status',7)	
								}
								log_rec_new_create.setValue('custrecord_cls_transaction',tran_rec.id);
								log_rec_new_create.setValue('custrecord_csl_customer',Search[0].entity);
								log_rec_new_create.setValue('custrecord_csl_type',2);//Transaction
								log_rec_new_create.setValue('custrecord_csl_amount_open',line_new_obj.total );
								log_rec_new_create.setValue('custrecord_csl_open_amount_usd',Search[0].fx_rate * line_new_obj.total ) ;
								log_rec_status_created = log_rec_new_create.save();
								log.debug('log rec Status Created for rec' + context.newRecord.id, log_rec_status_created);	
						}
					}
				}
				//Closed Transaction Case
				if (Search[0].fx_amt == 0){
					tran_rec.setText('custbody_funnel_close','T');	
				}
				tran_rec.setValue('custbody_csl_status',Search[0].script_status_id)
				tran_rec.setValue('custbody_csl_last_snapshot_balance',Search[0].fx_amt);
				tran_rec.setValue('custbody_csl_last_snapshot_lines_link',JSON.stringify(data_lines));
				tran_rec.save();
				if (Search[0].state_il == 'T'){
					SetIL(Search[0].state_rec,true);
				}
			}catch(er){
			log.error("Error Creation for Rec : "+context.newRecord.id ,er.message);
		}
	}
	return {
		onAction : onAction
	};
	//Custom Function
	function isNullOrEmpty(val) {
        if (typeof (val) == 'undefined' || val == null || (typeof (val) == 'string' && val.length == 0)) {
            return true;
        }
        return false;
    }
	function get_line_data (record,sublist,field_array){
		var result = [];
		log.debug('rec', record);
		log.debug('sublist', sublist);
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
						log.debug('line not relevant');
					}
				}
				if (line_push){
					log.debug({
						title: 'LINE PUSH',
						details: dataline
					})
					result.push(dataline);	
				}
			}
		}
		log.debug({
			title: 'result',
			details: result
		})	
		return result
	}
	function check_diff_array(old_array,new_array) {
		if(isNullOrEmpty(!old_array)){
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
		
});

/*
changes in NS :
custbody _csl_lines_link for store line snapshoot
custbody _csl_status for store snapshoot current status
custrecord _csl_status for status of transaction
Payment
Currency Revaluation
*/