    /**
     * @NApiVersion 2.1
     * @NScriptType MapReduceScript
    /*******************************************************************
     * Name 		: Open Case
     * Purpose 		: Create Case related to collection problem 
     * Script Type  : Map Reduce
     * Created On   : 04/12/2022
     * Script Owner : Daniel Starkman Daniel@finance4.cloud
     ********************************************************************/
    define(['N/search', 'N/runtime', 'N/format', 'N/record','N/query', 'N/task'],
    function (search, runtime, format, record,query, task) {

        function getInputData() {
           var Data = query.runSuiteQL({
               query:`select T.TYPEBASEDDOCUMENTNUMBER Doc_Num,
               T.id                      Tran_ID,
               T.TRANDATE        Tran_Date,
               T.DUEDATE  Tran_Due_Date,
               T.DAYSOVERDUESEARCH Over_due_Days,
               FOREIGNAMOUNTUNPAID Open_Amount,
               C.NAME Currency,
               cus.id cus_id,
               Cus.COMPANYNAME Company_Name,
               Cus.CUSTENTITY_HB_BOB_ID_NUM Bob_ID,
        case.id
        from (select T.ENTITY, count(T.ID) Tran_Count
              from TRANSACTION T
              where T.DAYSOVERDUESEARCH > 0
                and T.TYPE = 'CustInvc'
                and T.STATUS = 'A'
              group by T.ENTITY) Collection
                 inner join TRANSACTION T on Collection.ENTITY = T.ENTITY and T.DAYSOVERDUESEARCH > 0
            and T.TYPE = 'CustInvc'
            and T.STATUS = 'A'
        left join CURRENCY C on T.CURRENCY = C.ID
        left join CUSTOMER Cus on Cus.id = T.ENTITY
        left join customrecord_tran_case case on case.custrecord_tc_tran = T.id
        where Tran_Count > 3 and case.id is null 
        order by T.ENTITY`
               }).asMappedResults();
           log.debug({
               title : 'Data Length',
               details : Data.length
           });
           var OutPut = []
           var Cust_Inv = []
           var Cust_ID = ''
           for (var x = 0 ; x < Data.length ; x++){
                if (x == 0){
                    Cust_ID = Data[x].cus_id
                }
                if (Cust_ID == Data[x].cus_id ){
                    Cust_Inv.push(Data[x].tran_id)
                }
                else {
                    if (Cust_Inv.length > 0){
                        OutPut.push({
                            Cust_ID : Cust_ID,
                            Cust_Inv : Cust_Inv 
                        })
                    }
                    Cust_ID = Data[x].cus_id
                    Cust_Inv = []
                    Cust_Inv.push(Data[x].tran_id)
                }
              
            }
            OutPut.push({
                Cust_ID : Cust_ID,
                Cust_Inv : Cust_Inv 
            });            
       return OutPut
          
       }
   
       function map(mapContext) {
           var ObjLine = JSON.parse(mapContext.value);
           log.debug({
                title: 'Obj' + mapContext.key ,
                details: JSON.stringify(ObjLine)
           });
           try{
                var Case = record.create({
                        type: record.Type.SUPPORT_CASE,
                    });
                    Case.setValue('title','billing Issue');
                    Case.setValue('company',ObjLine.Cust_ID);
                    Case.setValue('category',4);
                    var Case_ID = Case.save();
                    log.debug({
                        title: 'Case',
                        details: Case_ID
                    })
                    for(var n = 0; n < ObjLine.Cust_Inv.length ; n++ ){
                        log.debug({
                            title: 'Inv_Attached',
                            details: ObjLine.Cust_Inv[n]
                        });
                        var id_att = record.attach({
                            record:{
                                type: 'supportcase',
                                id: Case_ID
                            },
                            to: {
                                type: 'transaction',
                                id: ObjLine.Cust_Inv[n]
                            },
                        });
                        var Link = record.create({
                            type: 'customrecord_tran_case',
                        });
                        Link.setValue('custrecord_tc_case',Case_ID);
                        Link.setValue('custrecord_tc_tran',ObjLine.Cust_Inv[n]);
                        var Link_ID = Link.save();
                        log.debug({
                            title: 'Link',
                            details: Link_ID
                        })
                    }
            }catch(e){
                log.debug({
                    title: 'Error',
                    details: e
                })
            }
            
           
            

        }
       

   
    
       return {
           getInputData: getInputData,
           map: map,
           //reduce: reduce,
           //summarize: summarize
       }
    }
    );
