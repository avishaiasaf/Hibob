/**
 * @NApiVersion 2.1
 * @Author: Avishai Asaf
 */
define(['N/https', './3rd Party Libraries/oauth', './secret'], function (
      https,
      oauth,
      secretModule
) {
      const createOAuthRequest = (restUrl, method = 'GET', body) => {
            const secret = secretModule.getSecret();
            var url = restUrl;
            var headers = oauth.getHeaders({
                  url: url,
                  method: method,
                  tokenKey: secret.token.public,
                  tokenSecret: secret.token.secret,
            });

            headers['Content-Type'] = 'application/json';

            // log.debug('Headers', headers);

            return https[method.toLowerCase()]({
                  url,
                  headers,
                  body: JSON.stringify(body),
            });
      };

      return {
            createOAuthRequest,
      };
});
