/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/record', 'N/runtime'], (record, runtime) => {
      const closeSalesOrder = (soId) => {
            const so = record.load({ type: record.Type.SALES_ORDER, id: soId });
            const lineCount = so.getLineCount({ sublistId: 'item' });
            for (let i = 0; i < lineCount; i++) {
                  so.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'isclosed',
                        line: i,
                        value: true,
                  });
            }
            return so.save.promise();
      };
      /**
       * Defines the function that is executed when a GET request is sent to a RESTlet.
       * @param {Object} requestParams - Parameters from HTTP request URL; parameters passed as an Object (for all supported
       *     content types)
       * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
       *     Object when request Content-Type is 'application/json' or 'application/xml'
       * @since 2015.2
       */
      const get = (requestParams) => {};

      /**
       * Defines the function that is executed when a PUT request is sent to a RESTlet.
       * @param {string | Object} requestBody - The HTTP request body; request body are passed as a string when request
       *     Content-Type is 'text/plain' or parsed into an Object when request Content-Type is 'application/json' (in which case
       *     the body must be a valid JSON)
       * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
       *     Object when request Content-Type is 'application/json' or 'application/xml'
       * @since 2015.2
       */
      const put = (requestBody) => {};

      /**
       * Defines the function that is executed when a POST request is sent to a RESTlet.
       * @param {string | Object} requestBody - The HTTP request body; request body is passed as a string when request
       *     Content-Type is 'text/plain' or parsed into an Object when request Content-Type is 'application/json' (in which case
       *     the body must be a valid JSON)
       * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
       *     Object when request Content-Type is 'application/json' or 'application/xml'
       * @since 2015.2
       */
      const post = (requestBody) => {
            log.debug('Starting Execution', requestBody);
            // const updates = JSON.parse(requestBody);
            log.debug('Closing Sales Order', requestBody.soId);
            closeSalesOrder(requestBody.soId);
            log.debug('Updating Records', requestBody.aggregatedUpdates);
            requestBody.aggregatedUpdates.forEach((update) => {
                  if (update.id) {
                        log.debug('Updating', update);
                        record.submitFields(update);
                        log.debug(
                              'Remaining Usage',
                              runtime.getCurrentScript().getRemainingUsage()
                        );
                  } else {
                        log.audit('No ID for update', update);
                  }
            });
            requestBody.chargeIds.forEach((charge) => {
                  const relatedCharge = record.create({
                        type: 'customrecord_hb_charge_rr_relationship',
                  });
                  relatedCharge.setValue({
                        fieldId: 'custrecord_hb_zab_charge',
                        value: charge,
                  });
                  relatedCharge.setValue({
                        fieldId: 'custrecord_hb_rr_log',
                        value: requestBody.rejectRebillId,
                  });
                  const relatedChargeId = relatedCharge.save();
                  log.debug('Related Chrage ID Created', relatedChargeId);
            });
            log.debug('Ending Execution');
            return JSON.stringify({ status: 'success' });
      };

      /**
       * Defines the function that is executed when a DELETE request is sent to a RESTlet.
       * @param {Object} requestParams - Parameters from HTTP request URL; parameters are passed as an Object (for all supported
       *     content types)
       * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
       *     Object when request Content-Type is 'application/json' or 'application/xml'
       * @since 2015.2
       */
      const doDelete = (requestParams) => {};

      return { get, put, post, delete: doDelete };
});
