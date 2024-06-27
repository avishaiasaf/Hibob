/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/file', 'N/query', 'N/runtime', 'N/search', 'N/task'], /**
 * @param{file} file
 * @param{query} query
 * @param{runtime} runtime
 * @param{search} search
 * @param{task} task
 */ (file, query, runtime, search, task) => {
      const methods = {};
      /**
       * Defines the function that is executed when a GET request is sent to a RESTlet.
       * @param {Object} requestParams - Parameters from HTTP request URL; parameters passed as an Object (for all supported
       *     content types)
       * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
       *     Object when request Content-Type is 'application/json' or 'application/xml'
       * @since 2015.2
       */
      // methods.get = (requestParams) => {};

      /**
       * Defines the function that is executed when a PUT request is sent to a RESTlet.
       * @param {string | Object} requestBody - The HTTP request body; request body are passed as a string when request
       *     Content-Type is 'text/plain' or parsed into an Object when request Content-Type is 'application/json' (in which case
       *     the body must be a valid JSON)
       * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
       *     Object when request Content-Type is 'application/json' or 'application/xml'
       * @since 2015.2
       */
      // methods.put = (requestBody) => {};
      const createTempFile = (fileName) => {
            const folderId = runtime
                  .getCurrentScript()
                  .getParameter({ name: 'custscript_hb_folder_id' });
            const tempFile = file.create({
                  name: `${fileName}.csv`,
                  fileType: file.Type.CSV,
                  contents: 'temp..',
                  encoding: file.Encoding.UTF8,
                  folder: folderId,
                  isOnline: true,
            });
            return tempFile.save();
      };

      const createInboundTask = (params, fileId, fileName) => {
            const inboundTask = task.create({
                  taskType: task.TaskType.SCHEDULED_SCRIPT,
            });
            inboundTask.scriptId = 'customscript_hb_export_report_handler';
            inboundTask.deploymentId = 'customdeploy_hb_export_report_handler';
            const inboundParams = params; //JSON.parse(params);
            inboundParams['file_id'] = fileId;
            inboundParams['file_name'] = fileName;
            inboundTask.params = {
                  custscript_hb_handler_data: inboundParams,
            };
            return inboundTask;
      };
      const createSuiteQLFile = (suiteQLQuery, fileName, params) => {
            const suiteQLTask = task.create({
                  taskType: task.TaskType.SUITE_QL,
            });
            const fileId = createTempFile(fileName);
            suiteQLTask.query = suiteQLQuery;
            suiteQLTask.fileId = fileId;
            const inboundTask = createInboundTask(params, fileId, fileName);
            suiteQLTask.addInboundDependency(inboundTask);
            log.debug('inboundTask', inboundTask);
            const taskId = suiteQLTask.submit();
            return { taskId, fileId };
      };

      const createSavedSearchFile = (savedSearchId, fileName, params) => {
            const searchTask = task.create({ taskType: task.TaskType.SEARCH });
            const fileId = createTempFile(fileName);
            searchTask.savedSearchId = savedSearchId;
            searchTask.fileId = fileId;
            const inboundTask = createInboundTask(params, fileId, fileName);
            searchTask.addInboundDependency(inboundTask);
            log.debug('inboundTask', inboundTask);
            const taskId = searchTask.submit();
            return { taskId, fileId };
      };
      /**
       * Defines the function that is executed when a POST request is sent to a RESTlet.
       * @param {string | Object} requestBody - The HTTP request body; request body is passed as a string when request
       *     Content-Type is 'text/plain' or parsed into an Object when request Content-Type is 'application/json' (in which case
       *     the body must be a valid JSON)
       * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
       *     Object when request Content-Type is 'application/json' or 'application/xml'
       * @since 2015.2
       */
      methods.post = (requestBody) => {
            const { suiteql_query, saved_search_id, params, file_name } =
                  requestBody;
            log.debug(
                  'Params',
                  `suiteql_query: ${suiteql_query}, saved search id: ${saved_search_id}, file_name: ${file_name}`
            );
            log.debug('Callback Params', JSON.stringify(params));
            let response;
            if (suiteql_query) {
                  response = createSuiteQLFile(
                        suiteql_query,
                        file_name,
                        params
                  );
            } else if (saved_search_id) {
                  response = createSavedSearchFile(
                        saved_search_id,
                        file_name,
                        params
                  );
            } else {
                  response = 'Not supported';
            }
            log.debug('Response', response);
            return JSON.stringify({ response });
      };

      /**
       * Defines the function that is executed when a DELETE request is sent to a RESTlet.
       * @param {Object} requestParams - Parameters from HTTP request URL; parameters are passed as an Object (for all supported
       *     content types)
       * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
       *     Object when request Content-Type is 'application/json' or 'application/xml'
       * @since 2015.2
       */
      // methods.delete = (requestParams) => {};

      return methods;
});
