/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/https', 'N/runtime', 'N/encode'], /**
 * @param{https} https
 * @param{runtime} runtime
 */ (https, runtime, encode) => {
    const base64Encode = (str) => {
        return encode.convert({
            string: str,
            inputEncoding: encode.Encoding.UTF_8,
            outputEncoding: encode.Encoding.BASE_64,
        });
    };

    const createRequestAuthHeader = () => {
        const username = 'api-token';
        const token =
            'a19326ee8b3989584549671ad7a5249df5f3c78481806ba9224aca66bfe1ee29';

        const authHeader = 'Basic ' + base64Encode(username + ':' + token);
        return {
            Authorization: authHeader,
            'Content-Type': 'application/json',
        };
    };
    /**
     * Defines the Scheduled script trigger point.
     * @param {Object} scriptContext
     * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
     * @since 2015.2
     */
    const execute = (scriptContext) => {
        const data = runtime
            .getCurrentScript()
            .getParameter({ name: 'custscript_hb_handler_data' });
        log.debug('Data', data);
        const parsedData = JSON.parse(data);
        const { callback_url, callback_id, callback_type, file_name, file_id } =
            parsedData;
        const response = https.post({
            url: callback_url,
            body: JSON.stringify({
                callback_id,
                callback_type,
                file_name,
                file_id,
            }),
            headers: createRequestAuthHeader(),
        });
        log.debug('Response', response);
    };

    return { execute };
});
