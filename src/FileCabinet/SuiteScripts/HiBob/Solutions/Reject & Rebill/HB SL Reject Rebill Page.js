/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

define([
      'N/ui/serverWidget',
      'N/record',
      'N/redirect',
      'N/workflow',
      'N/runtime',
      'N/query',
      'N/search',
      'N/task',
      'N/url',
      'N/https',
      'N/file',
      '../../Utilities/HB CM Establish OAuth Connection',
      '../../Utilities/HB CM Server Utilities',
], function (
      ui,
      record,
      redirect,
      workflow,
      runtime,
      query,
      search,
      task,
      url,
      https,
      file,
      oAuth,
      serverUt
) {
      const getSourceList = (source, params) => {
            // log.debug(
            //       'getSourceList',
            //       `source: ${source}, params: ${JSON.stringify(params)}`
            // );
            if (source.toLowerCase().includes('select')) {
                  return query
                        .runSuiteQL({
                              query: source,
                              params: params ? params : '',
                        })
                        .asMappedResults();
            }
            return source;
      };

      const getDefaultValue = (defaultValue, params = null) => {
            const defaultSource = getSourceList(defaultValue, params);
            if (typeof defaultSource === 'string') {
                  return defaultSource;
            } else {
                  return Object.values(defaultSource[0]);
            }
      };

      const getCustomRecordScriptIdByNumber = (id) => {
            let scriptId;
            search.create({
                  type: 'customrecordtype',
                  filters: ['internalid', 'anyof', id],
                  columns: [{ name: 'scriptid' }],
            })
                  .run()
                  .each((result) => {
                        scriptId = result.getValue(result.columns[0]);
                  });
            return scriptId;
      };

      const buildSourceParams = (paramField, context) => {
            const params = {};
            Object.entries(paramField['var']).forEach((variable) => {
                  params[variable[0]] = context.request.parameters[variable[1]];
            });
            Object.entries(paramField['const']).forEach((constant) => {
                  params[constant[0]] = constant[1];
            });
            // log.debug('buildSourceParams', params);
            return params;
      };

      const getCaseSublists = (rejectionReasonId) => {
            const sublists = {};
            search.create({
                  type: 'customrecord_hb_rejection_reason_sublist',
                  filters: [
                        [
                              'custrecord_hb_rejection_reason_1',
                              'anyof',
                              rejectionReasonId,
                        ],
                  ],
                  columns: [
                        { name: 'custrecord_hb_rr_sublist_id' },
                        {
                              name: 'custrecord_hb_rr_sublist_source',
                        },
                        { name: 'custrecord_hb_rr_sublist_label' },
                        { name: 'custrecord_hb_rr_query_params' },
                        {
                              name: 'custrecord_hb_rr_field_id',
                              join: 'CUSTRECORD_HB_RR_SUBLIST',
                        },
                        {
                              name: 'custrecord_hb_rr_field_label',
                              join: 'CUSTRECORD_HB_RR_SUBLIST',
                        },
                        {
                              name: 'custrecord_hb_rr_field_type',
                              join: 'CUSTRECORD_HB_RR_SUBLIST',
                        },
                        {
                              name: 'custrecord_hb_rr_display_type',
                              join: 'CUSTRECORD_HB_RR_SUBLIST',
                        },
                        { name: 'custrecord_hb_rr_sublist_type' },
                        {
                              name: 'custrecord_hb_rr_record',
                              join: 'CUSTRECORD_HB_RR_SUBLIST',
                        },
                        {
                              name: 'custrecord_hb_rr_transaction',
                              join: 'CUSTRECORD_HB_RR_SUBLIST',
                        },
                        {
                              name: 'custrecord_hb_rr_post_update',
                              join: 'CUSTRECORD_HB_RR_SUBLIST',
                        },
                        {
                              name: 'custrecord_hb_rr_rec_id',
                              join: 'CUSTRECORD_HB_RR_SUBLIST',
                        },
                        {
                              name: 'custrecord_hb_rr_update_fld_id',
                              join: 'CUSTRECORD_HB_RR_SUBLIST',
                        },
                        {
                              name: 'internalid',
                              join: 'CUSTRECORD_HB_RR_SUBLIST',
                        },
                        { name: 'custrecord_hb_sublist_dis_type' },
                        {
                              name: 'custrecord_hb_rr_condition',
                              join: 'CUSTRECORD_HB_RR_SUBLIST',
                        },
                        {
                              name: 'custrecord_hb_rr_formula',
                              join: 'CUSTRECORD_HB_RR_SUBLIST',
                        },
                        {
                              name: 'custrecord_hb_rr_order',
                              sort: search.Sort.ASC,
                              join: 'CUSTRECORD_HB_RR_SUBLIST',
                        },
                  ],
            })
                  .run()
                  .each((sublist) => {
                        let sublistId = sublist.getValue(sublist.columns[0]);
                        let sublistSource = sublist.getValue(
                              sublist.columns[1]
                        );
                        let sublistLabel = sublist.getValue(sublist.columns[2]);
                        let sourceParams = sublist.getValue(sublist.columns[3]);
                        let fieldId = sublist.getValue(sublist.columns[4]);
                        let fieldName = sublist.getValue(sublist.columns[5]);
                        let fieldType = sublist.getValue(sublist.columns[6]);
                        let sublistType = sublist.getText(sublist.columns[8]);

                        let updateRecordType = sublist.getValue(
                              sublist.columns[9]
                        );
                        let updateTransactionType = sublist.getValue(
                              sublist.columns[10]
                        );
                        let postUpdate = sublist.getValue(sublist.columns[11]);
                        let updateRecordId = sublist.getValue(
                              sublist.columns[12]
                        );
                        let updateFieldId = sublist.getValue(
                              sublist.columns[13]
                        );
                        let internalId = sublist.getValue(sublist.columns[14]);

                        let displayType = sublist
                              .getText(sublist.columns[7])
                              .toUpperCase();
                        let sublistDisplayType = sublist
                              .getText(sublist.columns[15])
                              .toUpperCase();
                        let condition = sublist.getValue(sublist.columns[16]);
                        let formula = sublist.getValue(sublist.columns[17]);
                        let fieldMetdata = {
                              fieldId,
                              fieldName,
                              fieldType,
                              displayType,
                              condition,
                              formula,
                              updateRecordType,
                              updateTransactionType,
                              postUpdate,
                              updateRecordId,
                              updateFieldId,
                              internalId,
                        };
                        // log.debug('sourceParams', sourceParams);
                        if (sublists.hasOwnProperty(sublistId)) {
                              sublists[sublistId]['fields'].push(fieldMetdata);
                        } else {
                              sublists[sublistId] = {
                                    sublistSource,
                                    sublistLabel,
                                    sublistType,
                                    sublistDisplayType,
                                    sourceParams: JSON.parse(sourceParams),
                                    fields: [fieldMetdata],
                              };
                        }
                        // log.debug('sublists', sublists);
                        return true;
                  });
            return sublists;
      };

      const buildCaseSublists = (sublists, rejectionForm, context) => {
            Object.entries(sublists).forEach((sublist) => {
                  const sublistObj = rejectionForm.addSublist({
                        id: sublist[0],
                        label: sublist[1].sublistLabel,
                        type: sublist[1].sublistType,
                  });
                  // log.debug('sublistDisplayType', sublist[1]);
                  sublistObj.displayType = sublist[1].sublistDisplayType;
                  sublist[1].fields.forEach((field) => {
                        const sublistField = sublistObj.addField({
                              id: field.fieldId,
                              type: serverUt.getFieldTypeByID(field.fieldType),
                              label: field.fieldName,
                        });
                        sublistField.updateDisplayType({
                              displayType: field.displayType,
                        });
                  });
                  const params = buildSourceParams(
                        sublist[1].sourceParams,
                        context
                  );
                  // log.debug('Params', params);
                  const source = getSourceList(
                        sublist[1].sublistSource,
                        Object.values(params)
                  );
                  // log.debug('Source', source);
                  if (typeof source === 'object') {
                        // log.debug('Source is object', source.length);
                        Object.values(source).forEach((entry, i) => {
                              Object.entries(entry).forEach((field) => {
                                    // log.debug(`field  ${field}`, field);
                                    sublistObj.setSublistValue({
                                          id: field[0],
                                          line: i,
                                          value: field[1],
                                    });
                              });
                        });
                  } else {
                        log.debug('Run Saved Search');
                  }
            });
      };
      const getCaseFields = (rejectionReasonId) => {
            const fields = [];
            search.create({
                  type: 'customrecord_hb_rejection_reasons_field',
                  filters: [
                        [
                              'custrecord_hb_rejection_reasons',
                              'anyof',
                              rejectionReasonId,
                        ],
                  ],
                  columns: [
                        { name: 'custrecord_hb_rr_field_id' },
                        { name: 'custrecord_hb_rr_field_label' },
                        {
                              name: 'custrecord_hb_rr_field_source',
                        },
                        { name: 'custrecord_hb_rr_field_type' },
                        {
                              name: 'custrecord_hb_rr_display_type',
                        },
                        {
                              name: 'custrecord_hb_rr_default_value',
                        },
                        {
                              name: 'custrecord_hb_rr_source_vars',
                        },
                        {
                              name: 'custrecord_hb_rr_record',
                        },
                        {
                              name: 'custrecord_hb_rr_transaction',
                        },
                        {
                              name: 'custrecord_hb_rr_post_update',
                        },
                        {
                              name: 'custrecord_hb_rr_rec_id',
                        },
                        {
                              name: 'custrecord_hb_rr_update_fld_id',
                        },
                        {
                              name: 'internalid',
                        },
                        {
                              name: 'custrecord_hb_rr_def_vars',
                        },
                        {
                              name: 'custrecord_hb_rr_order',
                              sort: search.Sort.ASC,
                        },
                  ],
            })
                  .run()
                  .each((field) => {
                        let fieldId = field.getValue(field.columns[0]);
                        let fieldName = field.getValue(field.columns[1]);
                        let fieldSource = field.getValue(field.columns[2]);
                        let fieldType = field.getValue(field.columns[3]);
                        let displayType = field.getText(field.columns[4]);
                        let defaultValue = field.getValue(field.columns[5]);
                        let sourceParams = field.getValue(field.columns[6]);

                        let updateRecordType = field.getValue(field.columns[7]);
                        let updateTransactionType = field.getValue(
                              field.columns[8]
                        );
                        let postUpdate = field.getValue(field.columns[9]);
                        let updateRecordId = field.getValue(field.columns[10]);
                        let updateFieldId = field.getValue(field.columns[11]);
                        let internalId = field.getValue(field.columns[12]);
                        let defaultValueParams = field.getValue(
                              field.columns[13]
                        );
                        fields.push({
                              fieldId,
                              fieldName,
                              fieldSource,
                              fieldType,
                              displayType,
                              defaultValue,
                              sourceParams,
                              updateRecordType,
                              updateTransactionType,
                              postUpdate,
                              updateRecordId,
                              updateFieldId,
                              internalId,
                              defaultValueParams,
                        });
                        return true;
                  });
            return fields;
      };
      const buildCaseFields = (fields, rejectionForm, context) => {
            fields.forEach(
                  ({
                        fieldId,
                        fieldName,
                        fieldSource,
                        fieldType,
                        displayType,
                        defaultValue,
                        sourceParams,
                        defaultValueParams,
                  }) => {
                        // log.debug(
                        //       'Field',
                        //       `fieldId: ${fieldId}, fieldName: ${fieldName}, fieldSource: ${fieldSource}, fieldType: ${fieldType}, displayType: ${displayType},
                        // defaultValue: ${defaultValue}, sourceParams: ${sourceParams}, defaultValueParams: ${defaultValueParams}`
                        // );
                        const fieldObj = rejectionForm.addField({
                              id: fieldId,
                              type: serverUt.getFieldTypeByID(fieldType),
                              label: fieldName,
                              container: 'custpage_case_specific_fields',
                        });
                        const params = buildSourceParams(
                              JSON.parse(sourceParams),
                              context
                        );
                        let source = getSourceList(
                              fieldSource,
                              Object.values(params)
                        );
                        // log.debug(`source: ${source}`, typeof source);
                        if (typeof source === 'string') {
                              fieldObj.source = source;
                        } else {
                              Object.values(source).forEach((entry) => {
                                    // log.debug('Entry', entry);
                                    let thisEntry = Object.values(entry);
                                    fieldObj.addSelectOption({
                                          value: thisEntry[0],
                                          text: thisEntry[1],
                                    });
                              });
                        }
                        const defaultParams = buildSourceParams(
                              JSON.parse(defaultValueParams),
                              context
                        );
                        const defaultSource = getDefaultValue(
                              defaultValue,
                              Object.values(defaultParams)
                        );
                        // log.debug('defaultValue', defaultSource);
                        fieldObj.updateDisplayType({ displayType });
                        fieldObj.defaultValue = defaultSource;
                        return true;
                  }
            );

            // });
      };

      const getFieldsToUpdate = (fields) => {
            return fields.filter((field) => {
                  return field.postUpdate === true;
            });
      };

      const sublistLineUpdateCondition = (fieldObj, fields, lineValues) => {
            const conditionField = fields.filter((field) => {
                  return field.internalId === fieldObj.condition;
            });
            if (conditionField.length === 0) return true;
            const condition = lineValues[conditionField[0].fieldId];
            return condition === 'T';
      };

      const calculateStatement = (statement, variables) => {
            // Use a regular expression to match variable placeholders like {variable}
            const regex = /{([^}]+)}/g;

            // Replace each variable placeholder with its corresponding value
            const replacedStatement = statement.replace(
                  regex,
                  (match, variable) => {
                        // Check if the variable exists in the provided variables object
                        return variables.hasOwnProperty(variable)
                              ? variables[variable]
                              : match;
                  }
            );

            // Use eval to evaluate the replaced statement and return the result
            return eval(replacedStatement);
      };

      const getRecordIdFieldValue = (fieldObj, fields, lineValues) => {
            const idField = fields.filter((idField) => {
                  return idField.internalId === fieldObj.updateRecordId;
            });
            const idKey = idField[0].fieldId;
            const formula = fieldObj.formula;
            const values = {};
            if (formula) {
                  const variables = {};
                  fields.forEach((fld) => {
                        variables[fld.fieldId] = lineValues[fld.fieldId];
                  });
                  log.debug('variables', variables);
                  const formulaCalculation = calculateStatement(
                        formula,
                        variables
                  );
                  log.debug('formulaCalculation', formulaCalculation);
                  values[fieldObj.updateFieldId] = formulaCalculation;
            } else {
                  values[fieldObj.updateFieldId] = lineValues[fieldObj.fieldId];
            }

            return {
                  id: lineValues[idKey],
                  type: getCustomRecordScriptIdByNumber(
                        fieldObj.updateRecordType
                  ), //move to the Map Reduce script to increase efficiency
                  values,
            };
      };

      const updateSalesOrderCharges = (soId) => {
            const chargesQuery = `SELECT t.id, ch.id AS charge_id
                                        FROM Transaction AS t
                                        LEFT JOIN customrecordzab_charge AS ch ON ch.custrecordzab_c_transaction = t.id
                                        WHERE t.id = ${soId}`;
            const results = query
                  .runSuiteQL({ query: chargesQuery })
                  .asMappedResults();
            const chargeRecords = [];
            results.forEach((result) => {
                  chargeRecords.push({
                        type: 'customrecordzab_charge',
                        id: result.charge_id,
                        values: {
                              custrecordzab_c_status: 3,
                              custrecordzab_c_transaction: '',
                              custrecordzab_c_transaction_line_id: '',
                        },
                  });
            });
            if (!chargeRecords.length) {
                  log.error(
                        'Error Occurred',
                        `No charges found for sales order ${soId}`
                  );
            }

            return chargeRecords;
            // try {
            //       results.forEach((result) => {
            //             record.submitFields({
            //                   type: 'customrecordzab_charge',
            //                   id: result.charge_id,
            //                   values: {
            //                         custrecordzab_c_status: 3,
            //                         custrecordzab_c_transaction: '',
            //                         custrecordzab_c_transaction_line_id: '',
            //                   },
            //             });
            //       });
            // } catch (e) {
            //       log.error(
            //             'Error Occurred',
            //             `No charges found for sales order ${soId}`
            //       );
            //       log.error('Charges Query', chargesQuery);
            // }
      };

      //Move to RESTlet

      const getSalesOrderId = (invoiceId) => {
            const soQuery = `SELECT id FROM
                                (SELECT so.id AS id, so.tranid AS tranid
                                FROM transaction AS t
                                LEFT JOIN NextTransactionLink AS nt ON t.id = nt.nextdoc
                                LEFT JOIN Transaction AS so ON so.id = nt.previousdoc
                                WHERE t.id = ${invoiceId})
                                GROUP BY id`;
            const results = query
                  .runSuiteQL({ query: soQuery })
                  .asMappedResults();
            return results[0].id;
      };
      const closeSalesOrder = (invoiceId) => {
            const soQuery = `SELECT id FROM
                                (SELECT so.id AS id, so.tranid AS tranid
                                FROM transaction AS t
                                LEFT JOIN NextTransactionLink AS nt ON t.id = nt.nextdoc
                                LEFT JOIN Transaction AS so ON so.id = nt.previousdoc
                                WHERE t.id = ${invoiceId})
                                GROUP BY id`;
            const results = query
                  .runSuiteQL({ query: soQuery })
                  .asMappedResults();
            const soId = results[0].id;
            log.debug('Updating SO', soId);
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
            return so.save();
      };

      const aggregateObjects = (list) => {
            const aggregated = {};

            list.forEach((item) => {
                  const key = `${item.id}_${item.type}`;

                  if (!aggregated[key]) {
                        aggregated[key] = {
                              id: item.id,
                              type: item.type,
                              values: {},
                        };
                  }

                  Object.assign(aggregated[key].values, item.values);
            });

            return Object.values(aggregated);
      };

      const getTransactionUpdate = (recType, invRejectionValue, rejMemo) => {
            const scriptObj = runtime.getCurrentScript();

            let jsobObj = {};
            if (recType == 'invoice') {
                  const rejectionStatus = scriptObj.getParameter({
                        name: 'custscript_hb_rejection_status',
                  });
                  jsobObj = {
                        custbody_hb_rejection_reason: invRejectionValue,
                        custbody_hb_rejected_by: runtime.getCurrentUser().id,
                        approvalstatus: rejectionStatus,
                        custbody_hb_invoice_rejection_reas: rejMemo,
                  };
            } else if (recType == 'customrecordzab_subscription') {
                  const subscriptionStatus =
                        context.request.parameters.custpage_subscription_status;
                  log.debug('subscriptionStatus', subscriptionStatus);
                  const Action_Search = query
                        .runSuiteQL({
                              query: `select custrecord_req_action_sf_action_sf action
                                        from customrecord_hb_zab_sub_action_sf_list
                                        where ${subscriptionStatus} = custrecord_req_action_sf_sub_status and custrecord_req_action_sf_rejection_list = ${invRejectionValue}
                                        fetch first 1 rows only`,
                        })
                        .asMappedResults();
                  log.debug('Search Result', Action_Search);

                  jsobObj = {
                        custrecord_hb_s_rejection_list: invRejectionValue,
                        custrecord_hb_subscription_rej: rejMemo,
                        custrecord_hb_s_rejected_by:
                              runtime.getCurrentUser().id,
                        custrecord_hb_subscription_status: subscriptionStatus,
                        custrecord_hb_s_sfdc_status_sync: 1,
                        custrecord_hb_required_action_sf:
                              Action_Search[0].action,
                  };
            }
            return jsobObj;
      };

      const createErrorForm = (context, e) => {
            const form = ui.createForm({
                  title: 'Error Occurred',
            });
            const fieldObj = form.addField({
                  id: 'custpage_error_msg',
                  label: 'Error Message',
                  type: ui.FieldType.LONGTEXT,
            });
            fieldObj.defaultValue = e;
            fieldObj.updateDisplayType({
                  displayType: ui.FieldDisplayType.INLINE,
            });
            log.error('error in suitelet', e);
            context.response.writePage(form);
      };

      const subscriptionRatingTask = (subscriptionId, deployId) => {
            try {
                  const mapReduceTask = task.create({
                        taskType: task.TaskType.MAP_REDUCE,
                  });
                  const params = {
                        custscriptzab_sub_rating_mr_limit_to_sub:
                              subscriptionId,
                  };
                  log.debug('MAP/REDUCE Params', params);
                  mapReduceTask.scriptId =
                        'customscriptzab_subscription_rating_mr';
                  mapReduceTask.deploymentId = deployId;
                  mapReduceTask.params = params;
                  return mapReduceTask.submit();
            } catch (e) {
                  log.debug('Rating Deployment Already Running', deployId);
                  return null;
            }
      };

      const executeSubscriptionRating = (invoiceId) => {
            const invoice = query
                  .runSuiteQL({
                        query: `
                              SELECT TOP 1 custbody_hb_zab_subscription AS subscription_id
                              FROM Transaction
                              Where id = ${invoiceId}
                          `,
                  })
                  .asMappedResults();
            log.debug('Executing Rating for Subscription', invoice);
            let taskId;
            let i = 4;
            let deployId = 'customdeployzab_subscription_rating_mr';
            do {
                  taskId = subscriptionRatingTask(
                        invoice[0].subscription_id,
                        deployId + i
                  );
                  i += 1;
            } while (!taskId && i >= 4 && i <= 6);

            log.debug('ZAB Rating task Id', taskId);
            return taskId;
      };

      const createChargeRejectRelationship = (updates) => {
            return updates
                  .map((update) => {
                        if (
                              update.type.toUpperCase() ===
                              'CUSTOMRECORDZAB_CHARGE'
                        ) {
                              return update.id;
                        }
                  })
                  .filter((item) => {
                        return Boolean(item);
                  });
      };

      const onGet = (context) => {
            var invoiceID = context.request.parameters.invRecId;
            var recType = context.request.parameters.recordType;
            var subscriptionStatus =
                  context.request.parameters.subscriptionStatus;
            const rejectionReason = context.request.parameters.rejectionReason;
            const rejectionReasonId =
                  context.request.parameters.rejectionReasonId;
            var rejectionForm = ui.createForm({
                  title: `Enter Reject Reason ${
                        rejectionReason ? ' - ' + rejectionReason : ''
                  }`,
            });
            const basicFields = rejectionForm.addFieldGroup({
                  id: 'custpage_basic_fields',
                  label: 'Basic Fields',
            });
            const caseSpecificFields = rejectionForm.addFieldGroup({
                  id: 'custpage_case_specific_fields',
                  label: 'Case Specific Fields',
            });
            const rejectReason = rejectionForm.addField({
                  id: 'custpage_dd_inv_reject_reason',
                  type: ui.FieldType.SELECT,
                  label: 'Reject Reason',
                  source: 'customrecord_hb_rejection_reasons',
                  container: 'custpage_basic_fields',
            });
            rejectReason.defaultValue = rejectionReasonId;
            rejectReason.isMandatory = true;
            const invField = rejectionForm.addField({
                  id: 'custpage_inv_field',
                  type: ui.FieldType.TEXT,
                  label: 'Invoice Internal ID',
            });
            invField.defaultValue = invoiceID;
            invField.updateDisplayType({ displayType: 'HIDDEN' });
            const memo = rejectionForm.addField({
                  id: 'custpage_inv_field_memo',
                  type: ui.FieldType.TEXTAREA,
                  label: 'Rejection Memo',
                  container: 'custpage_basic_fields',
            });
            const recordTypeField = rejectionForm.addField({
                  id: 'custpage_rectype_field',
                  type: ui.FieldType.TEXT,
                  label: 'RecType',
            });
            recordTypeField.defaultValue = recType;
            recordTypeField.updateDisplayType({
                  displayType: 'HIDDEN',
            });
            log.debug('rejectionReasonId', rejectionReasonId);
            if (rejectionReasonId > 0) {
                  const rejectReasonFields = search.lookupFields({
                        type: 'customrecord_hb_rejection_reasons',
                        id: rejectionReasonId,
                        columns: [
                              'custrecord_hb_msg_on_save',
                              'custrecord_hb_rr_redirect_url',
                        ],
                  });

                  const messageOnSave =
                        rejectReasonFields['custrecord_hb_msg_on_save'];
                  const redirectUrl =
                        rejectReasonFields['custrecord_hb_rr_redirect_url'];

                  const msgOnSave = rejectionForm.addField({
                        id: 'custpage_message_on_save',
                        type: ui.FieldType.LONGTEXT,
                        label: 'Message On Save',
                  });
                  msgOnSave.defaultValue = messageOnSave;
                  msgOnSave.updateDisplayType({
                        displayType: 'HIDDEN',
                  });

                  const redirectUrlField = rejectionForm.addField({
                        id: 'custpage_redirect_url',
                        type: ui.FieldType.LONGTEXT,
                        label: 'Redirect URL',
                  });
                  redirectUrlField.defaultValue = redirectUrl;
                  redirectUrlField.updateDisplayType({
                        displayType: 'HIDDEN',
                  });
            }

            /**********************/
            const subscriptionStatusField = rejectionForm.addField({
                  id: 'custpage_subscription_status',
                  type: ui.FieldType.TEXT,
                  label: 'subscriptionStatus',
            });
            subscriptionStatusField.defaultValue = subscriptionStatus;
            subscriptionStatusField.updateDisplayType({
                  displayType: 'HIDDEN',
            });
            /**********************/
            rejectionForm.addSubmitButton({
                  label: 'Save',
            });
            try {
                  const fields = getCaseFields(
                        rejectionReasonId,
                        rejectionForm,
                        context
                  );
                  // log.debug('Fields', fields);
                  buildCaseFields(fields, rejectionForm, context);
                  const sublists = getCaseSublists(rejectionReasonId);
                  // log.debug('sublists', sublists);
                  buildCaseSublists(sublists, rejectionForm, context);
            } catch (e) {
                  log.debug('No Rejection Reason Picked', e);
            }

            rejectionForm.clientScriptModulePath =
                  './HB CS Reject Rebill Page.js';
            context.response.writePage(rejectionForm);
      };

      const onPost = (context) => {
            try {
                  const parameters = context.request.parameters;
                  const invRejectionValue =
                        parameters.custpage_dd_inv_reject_reason;
                  const Rec_ID = parameters.custpage_inv_field;
                  const rejMemo = parameters.custpage_inv_field_memo;
                  const recType = parameters.custpage_rectype_field;
                  const redirectUrl = parameters.custpage_redirect_url;
                  const sublists = getCaseSublists(invRejectionValue);
                  const fields = getCaseFields(invRejectionValue);
                  const updateObjects = [];
                  const bodyFieldsValues = {};
                  const soId = getSalesOrderId(Rec_ID);
                  // const charges = updateSalesOrderCharges(soId);
                  fields.forEach((field) => {
                        bodyFieldsValues[field.fieldId] =
                              parameters[field.fieldId];
                  });
                  getFieldsToUpdate(fields).forEach((field) => {
                        // log.debug('field', field);
                        const updateObj = getRecordIdFieldValue(
                              field,
                              fields,
                              bodyFieldsValues
                        );
                        updateObjects.push(updateObj);
                  });
                  // log.debug('Body Fields Update', updateObjects);

                  Object.entries(sublists).forEach((sublist) => {
                        // log.debug('Sublist', sublist);
                        let sublistParam = `${sublist[0]}data`;
                        let sublistFieldsParam = `${sublist[0]}fields`;
                        let sublistData =
                              parameters[sublistParam].split('\u0002');
                        let sublistFields =
                              parameters[sublistFieldsParam].split('\u0001');
                        let sublistFieldsMetadata = sublist[1].fields;
                        // log.debug(
                        //       'Sublist Fields Metadata',
                        //       sublistFieldsMetadata
                        // );
                        // log.debug('Sublist Fields', sublistFields);
                        let sublistDataLines = [];
                        sublistData.forEach((dataLine) => {
                              let dataLineObj = dataLine
                                    .split('\u0001')
                                    .reduce((a, c, i) => {
                                          let key = sublistFields[i];
                                          a[key] = c;
                                          return a;
                                    }, {});
                              sublistDataLines.push(dataLineObj);
                        });
                        // log.debug('Sublist Data Lines', sublistDataLines);
                        const fieldsToUpdate = getFieldsToUpdate(
                              sublistFieldsMetadata
                        );
                        sublistDataLines.forEach((line) => {
                              fieldsToUpdate.forEach((fld) => {
                                    const updateCondition =
                                          sublistLineUpdateCondition(
                                                fld,
                                                sublistFieldsMetadata,
                                                line
                                          );
                                    log.debug(
                                          `updateCondition ${fld.fieldId}`,
                                          updateCondition
                                    );
                                    if (updateCondition) {
                                          const updateObj =
                                                getRecordIdFieldValue(
                                                      fld,
                                                      sublistFieldsMetadata,
                                                      line
                                                );
                                          updateObjects.push(updateObj);
                                    }
                              });
                        });
                  });
                  const aggregatedUpdates = aggregateObjects(updateObjects);
                  // log.debug('aggregated Updates', aggregatedUpdates);
                  // try {
                  //       const mapReduceTask = task.create({
                  //             taskType: task.TaskType.MAP_REDUCE,
                  //       });
                  //       mapReduceTask.scriptId =
                  //             'customscript_hb_mr_rr_handler';
                  //       mapReduceTask.deploymentId =
                  //             'customdeploy_hb_mr_rr_handler';
                  //       mapReduceTask.params = {
                  //             custscript_hb_rr_data:
                  //                   JSON.stringify(
                  //                         aggregatedUpdates
                  //                   ),
                  //       };
                  //       const taskId = mapReduceTask.submit();
                  //       log.debug('task Id', taskId);
                  // } catch (e) {
                  //       aggregatedUpdates.forEach((update) => {
                  //             record.submitFields(update);
                  //       });
                  // }
                  const transactionUpdate = getTransactionUpdate(
                        recType,
                        invRejectionValue,
                        rejMemo
                  );
                  // log.debug('transactionUpdate ', transactionUpdate);

                  //Push charges update
                  // aggregatedUpdates.push(...charges);

                  aggregatedUpdates.push({
                        type: recType,
                        id: Rec_ID,
                        values: transactionUpdate,
                  });
                  log.debug('aggregatedUpdates', aggregatedUpdates);

                  const handlerUrl = url.resolveScript({
                        scriptId: 'customscript_hb_rl_rr_handler',
                        deploymentId: 'customdeploy_hb_rl_rr_handler',
                        returnExternalUrl: true,
                  });

                  // redirect.toRecord({
                  //       type: recType,
                  //       id: Rec_ID,
                  // });

                  const subscription = search.lookupFields({
                        type: 'invoice',
                        id: Rec_ID,
                        columns: ['custbody_hb_zab_subscription'],
                  })['custbody_hb_zab_subscription'][0].value;

                  // redirect.toSuitelet({
                  //       scriptId: '604',
                  //       deploymentId: '1',
                  //       parameters: {
                  //             custparam_zab_sc_subscription: subscription,
                  //             markAllSubscriptions: true,
                  //       },
                  // });

                  redirect.redirect({
                        url: redirectUrl.replace(
                              '{subscription_id}',
                              subscription
                        ),
                  });

                  //Log Action
                  const rejectRebillLog = record.create({
                        type: 'customrecord_hb_reject_rebill_log',
                  });

                  const logValues = {
                        custrecord_hb_created_by: runtime.getCurrentUser().id,
                        custrecord_hb_subscription_rr: subscription,
                        custrecord_hb_reject_type: invRejectionValue,
                        custrecord_hb_update_object:
                              JSON.stringify(aggregatedUpdates),
                        custrecord_hb_rejected_invoice: Rec_ID,
                        custrecord_hb_rejection_memo: rejMemo,
                  };
                  Object.entries(logValues).forEach((entry) => {
                        rejectRebillLog.setValue({
                              fieldId: entry[0],
                              value: entry[1],
                        });
                  });
                  const rejectRebillId = rejectRebillLog.save();
                  log.debug('rejectRebillId', rejectRebillId);
                  const chargeIds =
                        createChargeRejectRelationship(aggregatedUpdates);
                  //Log Action End

                  const oAuthResponse = oAuth.createOAuthRequest(
                        handlerUrl,
                        'POST',
                        { aggregatedUpdates, soId, rejectRebillId, chargeIds }
                  );
                  // executeSubscriptionRating(Rec_ID);
            } catch (e) {
                  createErrorForm(context, e);
            }
      };
      function onRequest(context) {
            if (context.request.method === 'GET') {
                  log.audit('on GET', context.request.parameters);
                  onGet(context);
            } else {
                  log.audit('on POST', context.request.parameters);
                  onPost(context);
            }
      }

      return {
            onRequest,
      };
});
