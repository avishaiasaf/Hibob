/**
 * @NApiVersion 2.1
 */
define(['N/url', './HB CM Common Utilities'], (url, common) => {
    const client = common;
    client.moduleName = 'Server Utilities';

    client.refreshPage = (ignoreLeave = true) => {
        if (window.onbeforeunload) {
            window.onbeforeunload = () => {
                null;
            };
        }
        window.location.reload();
    };

    client.nextPageLink = (scriptId, deploymentId, params) => {
        return url.resolveScript({
            scriptId,
            deploymentId,
            returnExternalUrl: false,
            params,
        });
    };
    client.nextPage = (scriptId, delpoyId, params, ignoreLeave) => {
        if (ignoreLeave && window.onbeforeunload) {
            window.onbeforeunload = () => {
                null;
            };
        }
        window.open(client.nextPageLink(scriptId, delpoyId, params), '_self');
    };

    return client;
});
