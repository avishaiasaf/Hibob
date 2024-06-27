/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define([
      'N/compress',
      'N/email',
      'N/file',
      'N/record',
      'N/runtime',
      'N/format',
      'N/task',
      'N/search',
      'N/render',
      '../../Utilities/HB CM Server Utilities',
], /**
 * @param{compress} compress
 * @param{email} email
 * @param{file} file
 * @param{record} record
 */ (
      compress,
      email,
      file,
      record,
      runtime,
      format,
      task,
      search,
      render,
      serverUt
) => {
      /**
       * Defines the Scheduled script trigger point.
       * @param {Object} scriptContext
       * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
       * @since 2015.2
       */
      // const moment = serverUt.moment;
      // const getDateString = (date) => {
      //     const systemDateFormat =
      //         serverUt.getGeneralPreferencesField('DATEFORMAT');
      //     log.debug('System Date Format', systemDateFormat);
      //     return serverUt
      //         .moment(date ? date : new Date())
      //         .format(`${systemDateFormat} hh:mm a'`);
      // };

      const {
            SCRIPTING_DASHBOARD,
            CUSTOM_RECORDS_TYPES,
            SAVED_QUERY_RESULTS,
            SAVED_SUITEQL,
      } = serverUt.enums;

      const getEmailTemplate = (defaultEmailTemp, queryID, savedResultID) => {
            const queryEmailID = search.lookupFields({
                  type: CUSTOM_RECORDS_TYPES.SAVED_SUITEQL,
                  id: queryID,
                  columns: [SAVED_SUITEQL.EMAIL_TEMPLATE],
            })[SAVED_SUITEQL.EMAIL_TEMPLATE];
            const emailTempID =
                  queryEmailID > 0 ? queryEmailID : defaultEmailTemp;
            log.debug(
                  `emailTempID for query ${queryID}`,
                  `selected template: ${emailTempID}, query email temp: ${queryEmailID}, preference temp: ${defaultEmailTemp}`
            );
            return render.mergeEmail({
                  templateId: parseInt(emailTempID),
                  customRecord: {
                        type: CUSTOM_RECORDS_TYPES.SAVED_QUERY_RESULT,
                        id: parseInt(savedResultID),
                  },
            });
      };

      const assignArchiveToRecord = (fileId, recordId) => {
            const values = {};
            values[SAVED_QUERY_RESULTS.RESULT_FILE] = fileId;
            record.submitFields({
                  type: CUSTOM_RECORDS_TYPES.SAVED_QUERY_RESULT,
                  id: recordId,
                  values,
            });
      };
      const compressResultsFile = (fileName, fileId, folderId) => {
            const archiver = compress.createArchiver();
            const resultsFile = file.load({ id: fileId });
            archiver.add({
                  file: resultsFile,
            });

            const zipFile = archiver.archive({
                  name: `${fileName}.zip`,
                  type: compress.Type.ZIP,
            });
            zipFile.folder = folderId;
            return zipFile.save();
      };
      const execute = (scriptContext) => {
            let data = serverUt.getScriptParam('custscript_hb_ssql_file_data');
            const scriptingDashboard = serverUt.getScriptingDashboardValues();
            const compressFile =
                  scriptingDashboard[
                        SCRIPTING_DASHBOARD.SUITEQL_COMPRESS_RESULTS
                  ];
            const defaultEmailTemp =
                  scriptingDashboard[
                        SCRIPTING_DASHBOARD.SUITEQL_DEFAULT_EMAIL_TEMP
                  ].value;
            log.debug('Compress results?', compressFile);
            //Change
            log.debug('compressFile', compressFile);
            log.debug('defaultEmailTemp', defaultEmailTemp);
            //Change

            const {
                  action,
                  fileName,
                  fileId,
                  recordId,
                  folderId,
                  userId,
                  savedQueryId,
                  cc,
                  lastRunDate,
            } = JSON.parse(data);
            const { body, subject } = getEmailTemplate(
                  defaultEmailTemp,
                  savedQueryId,
                  recordId
            );
            log.debug('Data', data);
            switch (action) {
                  case 'COMPRESS_RESULTS':
                        log.debug(
                              'Starting Execution | params',
                              `fileName: ${fileName}, fileId: ${fileId}, recordId: ${recordId}, saved query ID: ${savedQueryId}, sysdate: ${lastRunDate}`
                        );
                        const taskId = search.lookupFields({
                              type: CUSTOM_RECORDS_TYPES.SAVED_QUERY_RESULT,
                              id: recordId,
                              columns: [SAVED_QUERY_RESULTS.TASK_ID],
                        })[SAVED_QUERY_RESULTS.TASK_ID];
                        let status = task.checkStatus({ taskId });
                        log.debug('Task Id', `${taskId} - ${status.status}`);
                        if (compressFile) {
                              //Compress file
                              const zipFile = compressResultsFile(
                                    fileName,
                                    fileId,
                                    folderId
                              );
                              log.debug('ZIP File', zipFile);
                              //Delete file
                              file.delete({
                                    id: fileId,
                              });
                              //Attach the archive
                              assignArchiveToRecord(zipFile, recordId);
                        }

                        const recordLink = `https://4672400.app.netsuite.com/app/common/custom/custrecordentry.nl?rectype=2006&id=${recordId}`;
                        const sender = serverUt.getDefaultSender();

                        //Send File to User
                        email.send({
                              author: sender,
                              recipients: userId,
                              cc: cc || null,
                              subject: subject
                                    ? subject
                                    : `Saved Query Results - ${fileName}`,
                              body: body
                                    ? body
                                    : `Click the below link to download the results:<br/><br/> <a href="${recordLink}">Go to Record</a>`,
                        });
                        log.debug('Sending Export to ', userId);
                        //Update last run date
                        // const now = getDateString(sysdate);
                        // log.debug('Sysdate', now);
                        if (lastRunDate) {
                              const date = new Date();
                              date.setHours(date.getHours() - 10);
                              log.debug('Server Sysdate', date);
                              record.submitFields({
                                    type: CUSTOM_RECORDS_TYPES.SAVED_SUITEQL,
                                    id: savedQueryId,
                                    values: {
                                          custrecord_hb_ssql_last_run: date,
                                    },
                              });
                        }

                        break;
                  case 'SEND_EMAIL':
                        // sendEmail();
                        break;
                  default:
                        log.audit('Action not recognized', action);
                        break;
            }
      };

      return { execute };
});
