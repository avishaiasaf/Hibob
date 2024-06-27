    /**
     * @NApiVersion 2.1
     * @NScriptType Suitelet
     */
     define(['N/search', 'N/runtime', 'N/format', 'N/record','N/query', 'N/task','N/https',],
     function (search, runtime, format, record,query, task,https) {
 
        var exports = {};
        function onRequest(context) {
            try{
                var script = runtime.getCurrentScript();
                var Key = script.getParameter({ name: "custscript_workato_key" });
                var URL_Hook = script.getParameter({ name: "custscript_workato_url_hook" });
                var headerObj = {
                    'Content-Type': 'application/json',
                    'key': Key
                };
                var Body = '{"action": "transactions_sync","source": "Netsuite","object_ids": ""}';
                var response = https.post({
                    url: URL_Hook,
                    body: Body,
                    headers: headerObj
                });
                log.debug({
                    title: 'response',
                    details: response.body
                })
            }catch(e){
                log.debug({
                    title: 'Request Error',
                    details: e
                })
            }
        }
      
         exports.onRequest = onRequest
         return exports
     }
     );
 