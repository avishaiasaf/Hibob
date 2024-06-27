/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/currentRecord', '../../Utilities/HB CM Client Utilities'], /**
 * @param{currentRecord} currentRecord
 */ function (currentRecord, clientUt) {
      const EntryPoints = {};

      /**
       * Function to be executed after page is initialized.
       *
       * @param {Object} scriptContext
       * @param {Record} scriptContext.currentRecord - Current form record
       * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
       *
       * @since 2015.2
       */
      EntryPoints.pageInit = (scriptContext) => {
            return true;
      };

      /**
       * Function to be executed when field is changed.
       *
       * @param {Object} scriptContext
       * @param {Record} scriptContext.currentRecord - Current form record
       * @param {string} scriptContext.sublistId - Sublist name
       * @param {string} scriptContext.fieldId - Field name
       * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
       * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
       *
       * @since 2015.2
       */
      EntryPoints.fieldChanged = ({ currentRecord, fieldId }) => {
            console.log('field Changed', fieldId);
            if (fieldId === 'custpage_dd_inv_reject_reason') {
                  const invRecId = currentRecord.getValue({
                        fieldId: 'custpage_inv_field',
                  });
                  const recordType = currentRecord.getValue({
                        fieldId: 'custpage_rectype_field',
                  });
                  const subscriptionStatus = currentRecord.getValue({
                        fieldId: 'custpage_subscription_status',
                  });
                  const rejectionReason = currentRecord.getText({
                        fieldId: 'custpage_dd_inv_reject_reason',
                  });
                  const rejectionReasonId = currentRecord.getValue({
                        fieldId: 'custpage_dd_inv_reject_reason',
                  });
                  const params = {
                        invRecId,
                        recordType,
                        subscriptionStatus,
                        rejectionReason,
                        rejectionReasonId,
                  };
                  clientUt.nextPage(
                        'customscript_hb_sl_updating_rej_reason',
                        'customdeploy_hb_sl_updating_rej_reason',
                        params,
                        true
                  );
            }
      };

      /**
       * Function to be executed when field is slaved.
       *
       * @param {Object} scriptContext
       * @param {Record} scriptContext.currentRecord - Current form record
       * @param {string} scriptContext.sublistId - Sublist name
       * @param {string} scriptContext.fieldId - Field name
       *
       * @since 2015.2
       */
      // function postSourcing(scriptContext) {}

      /**
       * Function to be executed after sublist is inserted, removed, or edited.
       *
       * @param {Object} scriptContext
       * @param {Record} scriptContext.currentRecord - Current form record
       * @param {string} scriptContext.sublistId - Sublist name
       *
       * @since 2015.2
       */
      // EntryPoints.sublistChanged = ({ sublistId }) => {
      //     console.log('sublistChanged', sublistId);
      // };

      /**
       * Function to be executed after line is selected.
       *
       * @param {Object} scriptContext
       * @param {Record} scriptContext.currentRecord - Current form record
       * @param {string} scriptContext.sublistId - Sublist name
       *
       * @since 2015.2
       */
      // EntryPoints.lineInit = ({ sublistId }) => {
      //     console.log('init', sublistId);
      // };

      /**
       * Validation function to be executed when field is changed.
       *
       * @param {Object} scriptContext
       * @param {Record} scriptContext.currentRecord - Current form record
       * @param {string} scriptContext.sublistId - Sublist name
       * @param {string} scriptContext.fieldId - Field name
       * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
       * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
       *
       * @returns {boolean} Return true if field is valid
       *
       * @since 2015.2
       */
      // EntryPoints.validateField = () => {};

      /**
       * Validation function to be executed when sublist line is committed.
       *
       * @param {Object} scriptContext
       * @param {Record} scriptContext.currentRecord - Current form record
       * @param {string} scriptContext.sublistId - Sublist name
       *
       * @returns {boolean} Return true if sublist line is valid
       *
       * @since 2015.2
       */
      // EntryPoints.validateLine = ({ sublistId, currentRecord }) => {};

      /**
       * Validation function to be executed when sublist line is inserted.
       *
       * @param {Object} scriptContext
       * @param {Record} scriptContext.currentRecord - Current form record
       * @param {string} scriptContext.sublistId - Sublist name
       *
       * @returns {boolean} Return true if sublist line is valid
       *
       * @since 2015.2
       */
      // EntryPoints.validateInsert = (scriptContext) => {};

      /**
       * Validation function to be executed when record is deleted.
       *
       * @param {Object} scriptContext
       * @param {Record} scriptContext.currentRecord - Current form record
       * @param {string} scriptContext.sublistId - Sublist name
       *
       * @returns {boolean} Return true if sublist line is valid
       *
       * @since 2015.2
       */
      // EntryPoints.validateDelete = (scriptContext) => {};

      /**
       * Validation function to be executed when record is saved.
       *
       * @param {Object} scriptContext
       * @param {Record} scriptContext.currentRecord - Current form record
       * @returns {boolean} Return true if record is valid
       *
       * @since 2015.2
       */
      EntryPoints.saveRecord = ({ currentRecord }) => {
            const msgOnSave = currentRecord.getValue({
                  fieldId: 'custpage_message_on_save',
            });
            if (msgOnSave) {
                  alert(msgOnSave);
            }
            return true;
      };

      return EntryPoints;
});
