/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/config']
/**
 * @param{config} config
 */, (config) => {
      /**
       * Defines the Scheduled script trigger point.
       * @param {Object} scriptContext
       * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
       * @since 2015.2
       */
      const execute = (scriptContext) => {
            const userPreferences = config.load({
                  type: config.Type.USER_PREFERENCES,
            });
            log.debug('userPreferences', userPreferences);
            userPreferences.setValue({ fieldId: 'COLORTHEME', value: -16 });
            userPreferences.save();
      };

      return { execute };
});
