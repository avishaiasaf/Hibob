/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 */

/*******************************************************************
 * Name 		: Event Integration
 * Script Type  : Workflow Action
 * Created On   : 
 * Script Owner : Daniel Starkman daniel@finance4.cloud
 * Purpose 		: This script is used create record for integration in Workato
 ********************************************************************/

 define(["N/url","N/record","N/runtime"],

 function(url,record,runtime) {

function onAction(context) {
    try{
        var Record = context.newRecord;
        var Rec_Object = record.load({
            type: Record.type,
            id: Record.id,
            isDynamic: false,
        })
        log.debug('Record',Record);
        var script = runtime.getCurrentScript();
        var Event = script.getParameter({ name: "custscript_wse_event" });
        var Fields = script.getParameter({ name: "custscript_wse_fields" });
        if (!isNullOrEmpty(Fields)){
            var Array_field = Fields.split(",")
            var jsObj = {}
            for (a = 0;a  < Array_field.length;a++){
                var Field = Array_field[a].trim()
                if (!isNullOrEmpty(Field)){
                    var Data_Field = Rec_Object.getValue({
                        fieldId: Field
                    });
                   jsObj[Field] = Data_Field
                }
            }    
        }
        var Event_Record = record.create({type: 'customrecord_workato_sync_event',isDynamic:false});
        Event_Record.setValue('custrecord_wse_event_rec_id',Record.id);
        Event_Record.setValue('custrecord_wse_rec_type',Record.type);
        Event_Record.setValue('custrecord_wse_external_id',Record.getValue('externalid'));
        Event_Record.setValue('custrecord_wse_event_type',Event);
        Event_Record.setValue('custrecord_wse_data',JSON.stringify(jsObj));
        var Rec_ID = Event_Record.save()
        log.debug({
            title: Event,
            details: JSON.stringify({
                Record : Record.type,
                Record_ID : Record.id,
                Data : jsObj,
                Event_Integration : Rec_ID,
            })

        });        
        }catch(ex){
     log.error('Error while updating Record Sync ',ex.message);
    }	
function isNullOrEmpty(val) {
    if (typeof (val) == 'undefined' || val == null || (typeof (val) == 'string' && val.length == 0)) {
        return true;
    }
    return false;
}

}

return {
 onAction : onAction
};

});