/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([
      'N/record',
      'N/ui/serverWidget',
      'N/runtime',
      'N/crypto',
      'N/encode',
      '../../Utilities/HB CM Server Utilities',
], /**
 * @param{crypto} crypto
 * @param{record} record
 * @param{serverWidget} serverWidget
 */ (record, ui, runtime, crypto, encode, server) => {
      // const decryptString = (iv, ciphertext, secret) => {
      //       try {
      //             const sKey = crypto.createSecretKey({
      //                   secret: secret,
      //                   encoding: encode.Encoding.UTF_8,
      //             });
      //
      //             const decipher = crypto.createDecipher({
      //                   algorithm: crypto.EncryptionAlg.AES,
      //                   key: sKey,
      //                   iv: iv,
      //             });
      //
      //             decipher.update({
      //                   input: ciphertext,
      //                   inputEncoding: encode.Encoding.HEX,
      //             });
      //
      //             return decipher.final({
      //                   outputEncoding: encode.Encoding.UTF_8,
      //             });
      //       } catch (e) {
      //             throw 'ENCRYPTION TEXT MALFORMED.';
      //       }
      // };
      //
      // const encryptString = (str, secret) => {
      //       const sKey = crypto.createSecretKey({
      //             secret: secret,
      //             encoding: encode.Encoding.UTF_8,
      //       });
      //
      //       const cipher = crypto.createCipher({
      //             algorithm: crypto.EncryptionAlg.AES,
      //             key: sKey,
      //       });
      //
      //       cipher.update({
      //             input: str,
      //       });
      //
      //       return cipher.final({
      //             outputEncoding: encode.Encoding.HEX,
      //       });
      // };
      /**
       * Defines the Suitelet script trigger point.
       * @param {Object} scriptContext
       * @param {ServerRequest} scriptContext.request - Incoming request
       * @param {ServerResponse} scriptContext.response - Suitelet response
       * @since 2015.2
       */
      const onRequest = (scriptContext) => {
            if (scriptContext.request.method === 'GET') {
                  onGet(scriptContext);
            } else {
                  onPost(scriptContext);
            }
      };

      const onGet = ({ request, response }) => {
            log.debug('GET', request);
            const form = ui.createForm({ title: 'Access Token Handler' });
            form.addField({
                  id: 'custpage_token_name',
                  label: 'Access Token Name',
                  type: ui.FieldType.TEXT,
            });
            form.addField({
                  id: 'custpage_token_id',
                  label: 'Token ID',
                  type: ui.FieldType.TEXT,
            });
            form.addField({
                  id: 'custpage_token_secret',
                  label: 'Token Secret',
                  type: ui.FieldType.TEXT,
            });
            form.addField({
                  id: 'custpage_consumer_key',
                  label: 'Consumer Key',
                  type: ui.FieldType.TEXT,
            });
            form.addField({
                  id: 'custpage_consumer_secret',
                  label: 'Consumer Secret',
                  type: ui.FieldType.TEXT,
            });
            form.addSubmitButton({ label: 'Create Access Token Holder' });
            response.writePage(form);
      };
      const onPost = ({ request, response }) => {
            const tokenId = request.parameters.custpage_token_id;
            const tokenSecret = request.parameters.custpage_token_secret;
            const consumerKey = request.parameters.custpage_consumer_key;
            const consumerSecret = request.parameters.custpage_consumer_secret;
            const tokenName = request.parameters.custpage_token_name;
            // const secret = runtime
            //       .getCurrentScript()
            //       .getParameter({ name: 'custscript_hb_secret_key' });
            const dashboardValues = server.getScriptingDashboardValues();
            const secret = dashboardValues['custrecord_hb_internal_api_secret'];
            log.debug('secret', secret);
            const combinedAccessToken = JSON.stringify({
                  tokenId,
                  tokenSecret,
                  consumerKey,
                  consumerSecret,
            });
            const { ciphertext, iv } = server.encryptString(
                  combinedAccessToken,
                  secret
            );
            log.debug('encrypted', `ciphertext: ${ciphertext}, iv: ${iv}`);
            const accessToken = record.create({
                  type: 'customrecord_hb_access_token_holder',
            });
            accessToken.setValue({
                  fieldId: 'custrecord_hb_token_id',
                  value: ciphertext,
            });
            accessToken.setValue({ fieldId: 'custrecord_hb_iv', value: iv });
            accessToken.setValue({ fieldId: 'name', value: tokenName });
            accessToken.setValue({
                  fieldId: 'custrecord_hb_account_id',
                  value: runtime.accountId.replaceAll('-', '_'),
            });
            const accessTokenId = accessToken.save({
                  ignoreMandatoryFields: true,
            });
            log.debug('accessTokenId', accessTokenId);

            const decrypted = server.decryptString(iv, ciphertext, secret);
            // log.debug('Decrypted', JSON.parse(decrypted));

            const form = ui.createForm({ title: 'Access Token Created' });
            const tokenField = form.addField({
                  id: 'custpage_token',
                  label: 'Token',
                  type: ui.FieldType.LONGTEXT,
            });
            tokenField.defaultValue = ciphertext;
            tokenField.updateDisplayType({
                  displayType: ui.FieldDisplayType.DISABLED,
            });
            tokenField.updateDisplaySize({ height: 10, width: 100 });
            const ivField = form.addField({
                  id: 'custpage_iv',
                  label: 'Initialization Vector',
                  type: ui.FieldType.LONGTEXT,
            });
            ivField.defaultValue = iv;
            ivField.updateDisplayType({
                  displayType: ui.FieldDisplayType.INLINE,
            });
            response.writePage(form);
      };

      return { onRequest };
});
