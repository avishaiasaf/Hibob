/**
 * @NApiVersion 2.1
 * @Author: Avishai Asaf
 */
define([
      'N/config',
      'N/crypto',
      'N/encode',
      'N/ui/serverWidget',
      './HB CM Common Utilities',
], (config, crypto, encode, ui, common) => {
      const server = common;

      server.moduleName = 'Server Utilities';

      server.getUserPreferences = (pref) => {
            const userPreferences = config.load({
                  type: config.Type.USER_PREFERENCES,
            });
            return userPreferences.getValue({ fieldId: pref });
      };

      server.getFieldTypeByID = (id) => {
            const fieldTypes = {
                  1: ui.FieldType.TEXT,
                  2: ui.FieldType.EMAIL,
                  3: ui.FieldType.PHONE,
                  4: ui.FieldType.DATE,
                  6: ui.FieldType.CURRENCY,
                  10: ui.FieldType.INTEGER,
                  11: ui.FieldType.CHECKBOX,
                  12: ui.FieldType.SELECT,
                  13: ui.FieldType.URL,
                  14: ui.FieldType.TIMEOFDAY,
                  15: ui.FieldType.TEXTAREA,
                  16: ui.FieldType.MULTISELECT,
                  17: ui.FieldType.IMAGE,
                  18: ui.FieldType.FILE,
                  20: ui.FieldType.PASSWORD,
                  23: ui.FieldType.HELP,
                  24: ui.FieldType.RICHTEXT,
                  28: ui.FieldType.PERCENT,
                  35: ui.FieldType.LONGTEXT,
                  40: ui.FieldType.INLINEHTML,
                  46: ui.FieldType.DATETIME,
            };
            return fieldTypes[id];
      };

      server.getGeneralPreferencesField = (fieldId) => {
            const generalPreferences = config.load({
                  type: config.Type.COMPANY_PREFERENCES,
            });
            return generalPreferences.getValue({ fieldId });
      };

      server.decryptString = (iv, ciphertext, secret) => {
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

      server.encryptString = (str, secret) => {
            const sKey = crypto.createSecretKey({
                  secret: secret,
                  encoding: encode.Encoding.UTF_8,
            });

            const cipher = crypto.createCipher({
                  algorithm: crypto.EncryptionAlg.AES,
                  key: sKey,
            });

            cipher.update({
                  input: str,
            });

            return cipher.final({
                  outputEncoding: encode.Encoding.HEX,
            });
      };

      return server;
});
