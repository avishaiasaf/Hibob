/**
 * @NApiVersion 2.1
 * @Author: Avishai Asaf
 */
define(['N/runtime', 'N/search', 'N/crypto', 'N/encode'], function (
      runtime,
      search,
      crypto,
      encode
) {
      // log.debug('common', common);

      const getScriptingDashboardValues = () => {
            const dashboardId = runtime.getCurrentScript().getParameter({
                  name: 'custscript_hb_script_dashboard',
            });
            return search.lookupFields({
                  type: 'customrecord_hb_script_dashboard',
                  id: dashboardId,
                  columns: [
                        'custrecord_hb_internal_api_secret',
                        'custrecord_hb_script_internal_token',
                  ],
            });
      };

      // log.debug('usage', runtime.getCurrentScript().getRemainingUsage());
      const getAccessToken = (id) => {
            return search.lookupFields({
                  type: 'customrecord_hb_access_token_holder',
                  id: id, //scriptingDashboardValues['custrecord_hb_script_internal_token'][0].value,
                  columns: [
                        'custrecord_hb_token_id',
                        'custrecord_hb_iv',
                        'custrecord_hb_account_id',
                  ],
            });
      };

      // log.debug('Access Token ', accessToken);
      // log.debug('Access Token ', accessToken);

      const decryptString = (iv, ciphertext, secret) => {
            try {
                  const sKey = crypto.createSecretKey({
                        secret: secret,
                        encoding: encode.Encoding.UTF_8,
                  });

                  const decipher = crypto.createDecipher({
                        algorithm: crypto.EncryptionAlg.AES,
                        key: sKey,
                        iv: iv,
                  });

                  decipher.update({
                        input: ciphertext,
                        inputEncoding: encode.Encoding.HEX,
                  });

                  return decipher.final({
                        outputEncoding: encode.Encoding.UTF_8,
                  });
            } catch (e) {
                  throw 'ENCRYPTION TEXT MALFORMED.';
            }
      };

      const getSecret = () => {
            // log.debug('usage', runtime.getCurrentScript().getRemainingUsage());
            const values = getScriptingDashboardValues();
            // log.debug('values', values);
            const accessToken = getAccessToken(
                  values['custrecord_hb_script_internal_token'][0].value
            );
            // log.debug('accessToken', accessToken);
            const iv = accessToken['custrecord_hb_iv'];
            // log.debug('iv', iv);
            const encryptedToken = accessToken['custrecord_hb_token_id'];
            const tokenAccountId = accessToken['custrecord_hb_account_id'];
            const envAccountId = runtime.accountId.replaceAll('-', '_');
            if (tokenAccountId !== envAccountId) {
                  log.error(
                        'ENVIRONMENT_MISMATCH',
                        `Token Account ID: ${tokenAccountId}, Actual Account ID: ${envAccountId}`
                  );
                  return {
                        error: 'ENVIRONMENT_MISMATCH',
                        details: { tokenAccountId, envAccountId },
                  };
            }
            const secret = values['custrecord_hb_internal_api_secret'];

            // log.debug('secret', secret);
            const { tokenId, tokenSecret, consumerKey, consumerSecret } =
                  JSON.parse(decryptString(iv, encryptedToken, secret));
            // log.debug(
            //       'token',
            //       `${tokenId} \n${tokenSecret} \n${consumerKey} \n${consumerSecret}`
            // );
            return {
                  consumer: {
                        public: consumerKey,
                        secret: consumerSecret,
                  },
                  token: {
                        public: tokenId,
                        secret: tokenSecret,
                  },
                  realm: tokenAccountId,
            };
      };
      return {
            getSecret,
      };
});
