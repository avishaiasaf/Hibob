/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/record'], /**
 * @param{record} record
 */ (record) => {
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
      EntryPoints.pageInit = ({ currentRecord }) => {
            // log.debug('Running on init');
            // console.log('Running on init');
            const approvalStatus = currentRecord.getText({
                  fieldId: 'custentitymis_approval_status',
            });
            const ebdChanged = currentRecord.getValue({
                  fieldId: 'custentity_hb_ebd_changed',
            });
            console.log(
                  'approvalStatus',
                  approvalStatus,
                  'ebdChanged',
                  ebdChanged
            );
            if (ebdChanged && approvalStatus.toLowerCase() === 'approved') {
                  console.log('changing');
                  location.reload();
            }
            return true;
      };

      EntryPoints.reloadPage = () => {
            location.reload();
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
      // function fieldChanged(scriptContext) {}

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
      //
      /**
       * Function to be executed after sublist is inserted, removed, or edited.
       *
       * @param {Object} scriptContext
       * @param {Record} scriptContext.currentRecord - Current form record
       * @param {string} scriptContext.sublistId - Sublist name
       *
       * @since 2015.2
       */
      // function sublistChanged(scriptContext) {}

      /**
       * Function to be executed after line is selected.
       *
       * @param {Object} scriptContext
       * @param {Record} scriptContext.currentRecord - Current form record
       * @param {string} scriptContext.sublistId - Sublist name
       *
       * @since 2015.2
       */
      // function lineInit(scriptContext) {}

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
      // function validateField(scriptContext) {}

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
      // function validateLine(scriptContext) {}

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
      // function validateInsert(scriptContext) {}

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
      // function validateDelete(scriptContext) {}

      /**
       * Validation function to be executed when record is saved.
       *
       * @param {Object} scriptContext
       * @param {Record} scriptContext.currentRecord - Current form record
       * @returns {boolean} Return true if record is valid
       *
       * @since 2015.2
       */
      EntryPoints.saveRecord = (scriptContext) => {
            console.log('saving');
            return true;
      };

      return EntryPoints;
});
