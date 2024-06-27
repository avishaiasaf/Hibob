/**
 * @NApiVersion 2.1
 * @Author: Avishai Asaf
 */
define([
      'N/runtime',
      'N/email',
      'N/search',
      'N/url',
      './HB CM Enums',
      './HB CM Reporting Enums',
      './3rd Party Libraries/moment-with-locales.min',
], (runtime, email, search, url, enums, reportingEnums, moment) => {
      const common = {};

      common.enums = enums;
      common.reportingEnums = reportingEnums;
      common.moment = moment;

      common.getScriptParam = (name) => {
            return runtime.getCurrentScript().getParameter({ name });
      };

      common.getSearchResultValue = (result, column) => {
            return result.getValue(result.columns[column]);
      };

      common.pipe = (...f) => {
            return (v) => {
                  return f.reduce((a, c) => {
                        return c(a);
                  }, v);
            };
      };

      common.getCustomRecordScriptIdByNumber = (id) => {
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

      common.getCustomRecordIntId = (scriptId) => {
            const recordUrl = url.resolveRecord({
                  recordType: scriptId,
            });
            const regex = /rectype=(\d+)/;
            const match = recordUrl.match(regex);

            if (match && match[1]) {
                  return parseInt(match[1], 10);
            } else {
                  return null; // Return null if no match is found
            }
      };

      common.getCustomRecordLink = (recordType, recordId) => {
            const companyId = runtime.accountId.toLowerCase().replace('_', '-');
            const recordLink = url.resolveRecord({ recordType, recordId });
            return `${companyId}.app.netsuite.com${recordLink}`;
      };

      common.loadOrCreateSearch = (searchObj) => {
            try {
                  log.debug('Loading Search', searchObj.title);
                  return search.load({
                        type: searchObj.type,
                        id: searchObj.id,
                  });
            } catch (e) {
                  log.debug(
                        'Loading failed, creating new search',
                        searchObj.title
                  );
                  const newSearch = search.create(searchObj);
                  newSearch.save();
                  return newSearch;
            }
      };

      common.getScriptingDashboardValues = () => {
            const results = {};
            const dashboardId = runtime.getCurrentScript().getParameter({
                  name: enums.SCRIPT_PARAMS.SCRIPTING_DASHBOARD,
            });
            const values = search.lookupFields({
                  type: enums.CUSTOM_RECORDS_TYPES.SCRIPTING_DAHSBOARD,
                  id: dashboardId,
                  columns: Object.values(enums.SCRIPTING_DASHBOARD),
            });
            for (const [key, value] of Object.entries(values)) {
                  if (typeof value === 'object') {
                        results[key] = value[0];
                  }
                  results[key] = value;
            }
            log.debug('getScriptingDashboardValues', results);
            return results;
      };

      common.getDefaultSender = () => {
            return (
                  common.getScriptingDashboardValues()[
                        enums.SCRIPTING_DASHBOARD.DEFAULT_SENDER
                  ].value || -5
            );
      };

      common.monitoredFunction = (func, scriptName, entryPoint) => {
            try {
                  return func();
            } catch (e) {
                  common.onError(scriptName, entryPoint, e);
            }
      };

      common.chunkIdFilter = (ids, idField, chunk = 100) => {
            const idFilter = [];
            for (let i = 0; i < ids.length; i += chunk) {
                  idFilter.push([idField, 'anyof', ...ids.slice(i, i + chunk)]);
                  if (i < ids.length - chunk) idFilter.push('OR');
            }
            return idFilter;
      };

      common.runPagedEachResult = (pagedSearch, func) => {
            const searchMap = {};
            pagedSearch.pageRanges.forEach((pageRange) => {
                  const currentPage = pagedSearch.fetch({
                        index: pageRange.index,
                  });
                  currentPage.data.forEach((result) => {
                        const { key, value } = func(result);
                        searchMap[key] = value;
                  });
            });
            return searchMap;
      };

      common.onError = (scriptName, entryPoint, error, info = '') => {
            let title = `Error Occurred At ${scriptName} On ${entryPoint}`;
            let details = `Script run error occurred on ${
                  runtime.getCurrentScript().id
            }<br /><br />`;

            const titles = [
                  'Environment ID',
                  'Execution Context',
                  'User Name',
                  'User ID',
                  'Role Script ID',
                  'Role ID',
                  'Role Center Type',
                  'User Subsidiary ID',
                  'User Department ID',
                  'User Location ID',
                  'Remaining Governance Units',
                  'Additional Information',
            ];

            const values = [
                  runtime.accountId,
                  runtime.executionContext,
                  runtime.getCurrentUser().name,
                  runtime.getCurrentUser().id,
                  runtime.getCurrentUser().roleId,
                  runtime.getCurrentUser().role,
                  runtime.getCurrentUser().roleCenter,
                  runtime.getCurrentUser().subsidiary,
                  runtime.getCurrentUser().department,
                  runtime.getCurrentUser().location,
                  runtime.getCurrentScript().getRemainingUsage(),
                  info,
            ];

            details += '<table>';

            titles.forEach((title, index) => {
                  details += `<tr>
                              <td>
                                ${title}
                              </td>
                              <td>
                              ${values[index]}
                              </td>
                        </tr>`;
            });

            details += `</table><br /><br />Error: <br /><br />${JSON.stringify(
                  error
            )} <br/><br/>Raw:<br /><br /> ${error}`;

            log.error({
                  title: title,
                  details: details,
            });

            const scriptingDashboard = common.getScriptingDashboardValues();

            const sender =
                  scriptingDashboard[enums.SCRIPTING_DASHBOARD.DEFAULT_SENDER]
                        .value || -5;
            const recipient =
                  scriptingDashboard[
                        enums.SCRIPTING_DASHBOARD.DEFAULT_ERROR_RECIPIENT
                  ].value || -5;

            log.debug(`sender ${sender}, recipient ${recipient}`);

            email.send({
                  author:
                        runtime.getCurrentUser().id > 0
                              ? runtime.getCurrentUser().id
                              : sender,
                  recipients: recipient,
                  subject: title,
                  body: details,
            });
      };

      return common;
});
