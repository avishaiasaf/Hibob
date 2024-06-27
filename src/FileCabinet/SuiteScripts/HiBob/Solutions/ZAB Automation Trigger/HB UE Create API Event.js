/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */
define(['N/https', 'N/encode', 'N/log'], function (https, encode, log) {
    function base64Encode(str) {
        return encode.convert({
            string: str,
            inputEncoding: encode.Encoding.UTF_8,
            outputEncoding: encode.Encoding.BASE_64,
        });
    }

    function beforeSubmit(context) {
        // Check if the record is being created or edited
        if (
            context.type !== context.UserEventType.CREATE &&
            context.type !== context.UserEventType.EDIT
        ) {
            return;
        }

        // Replace with your actual credentials
        var username = 'api-token';
        var token =
            'a19326ee8b3989584549671ad7a5249df5f3c78481806ba9224aca66bfe1ee29';

        // Replace with your actual endpoint
        var endpoint =
            'https://apim.workato.com/bobmis_dev/netsuite-api-v12/pub_sub_message';

        // Create the authentication header for Basic Auth
        var authHeader = 'Basic ' + base64Encode(username + ':' + token);

        // Replace with your payload data
        var payloadData = {
            event_type: context.newRecord.getValue({
                fieldId: 'custrecord_wse_event_type',
            }),
            event_status: context.newRecord.getValue({
                fieldId: 'custrecord_wse_status',
            }),
            event_data: context.newRecord.getValue({
                fieldId: 'custrecord_wse_data',
            }),
            event_rec_type: context.newRecord.getValue({
                fieldId: 'custrecord_wse_rec_type',
            }),
            event_rec_id: context.newRecord.getValue({
                fieldId: 'custrecord_wse_event_rec_id',
            }),
            record_external_id: context.newRecord.getValue({
                fieldId: 'custrecord_wse_external_id',
            }),
            event_id: context.newRecord.id,
            // Add your payload data here
            // For example: 'key': 'value'
        };

        // Convert payload data to string
        var payloadString = JSON.stringify(payloadData);

        // Set up the POST request options
        var requestOptions = {
            headers: {
                Authorization: authHeader,
                'Content-Type': 'application/json',
            },
            body: payloadString,
        };

        try {
            // Send the POST request
            var response = https.post({
                url: endpoint,
                body: payloadString,
                headers: requestOptions.headers,
            });

            // Log the response
            log.debug({
                title: 'API Request Response',
                details: response,
            });
        } catch (e) {
            // Log any errors that occur during the request
            log.error({
                title: 'API Request Error',
                details: e,
            });
        }
    }

    return {
        beforeSubmit: beforeSubmit,
    };
});
