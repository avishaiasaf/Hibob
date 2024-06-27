/**
 * @NApiVersion 2.1
 */
define(['N/record', 'N/query', 'N/transaction', 'N/https', 'N/encode'], (
      record,
      query,
      transaction,
      https,
      encode
) => {
      // const base64Encode = (str) => {
      //       return encode.convert({
      //             string: str,
      //             inputEncoding: encode.Encoding.UTF_8,
      //             outputEncoding: encode.Encoding.BASE_64,
      //       });
      // };

      // const createRequestAuthHeader = (token) => {
      //       const username = 'api-token';
      //       const authHeader = 'Basic ' + base64Encode(username + ':' + token);
      //       return {
      //             Authorization: authHeader,
      //             'Content-Type': 'application/json',
      //       };
      // };

      // const encodeURLParameters = (baseUrl, parameters) => {
      //       let encodedParams = [];
      //
      //       for (let param in parameters) {
      //             if (parameters.hasOwnProperty(param)) {
      //                   let encodedKey = encodeURIComponent(param);
      //                   let encodedValue = encodeURIComponent(
      //                         parameters[param]
      //                   );
      //                   encodedParams.push(encodedKey + '=' + encodedValue);
      //             }
      //       }
      //
      //       let queryString = encodedParams.join('&');
      //       return baseUrl + '?' + queryString;
      // };

      // const setTimeout = (seconds) => {
      //       const endpointUrl =
      //             'https://apim.workato.com/bobmis_uat/netsuite-api-v1/set-timeout';
      //       const token =
      //             'fa73cca83355bc0669a25ff4bb8b5baa3f11769effcdd39b203140c4df7f9400';
      //       const parameters = {
      //             seconds,
      //       };
      //       return https.get({
      //             url: encodeURLParameters(endpointUrl, parameters),
      //             // body: JSON.stringify(body),
      //             headers: createRequestAuthHeader(token),
      //       });
      // };
      const getRelatedJournalEntries = (id, period) => {
            const journalsQuery = query
                  .runSuiteQL({
                        query: `
                        SELECT t.id, tl.memo, gas.id AS allocation_schedule
                        FROM AllocationDetail AS ad
                        LEFT JOIN GeneralAllocationSchedule AS gas ON ad.parentschedule = gas.id
                        LEFT JOIN AllocationDetail AS ad_1 ON ad_1.parentschedule = gas.id AND ad_1.id <> ad.id
                        LEFT JOIN allocationDetailJournalMap AS map ON map.allocationdetail = ad_1.id 
                        LEFT JOIN Transaction AS t ON t.id = map.journal
			            LEFT JOIN TransactionLine AS tl ON t.id = tl.transaction AND tl.linesequencenumber = 0
                        WHERE ad.id = ${id} AND ad_1.postingperiod = ${period} AND tl.memo <> 'VOID'
                    `,
                  })
                  .asMappedResults();
            const relatedJournals = journalsQuery
                  .filter((item) => Boolean(item.id))
                  .map((item) => {
                        return item.id;
                  });
            return {
                  relatedJournals,
                  schedule: journalsQuery[0]?.allocation_schedule,
            };
      };

      const getAllocationJournalParent = (id) => {
            return query
                  .runSuiteQL({
                        query: `
                        SELECT ajr.id
                        FROM AllocationDetail AS ad
                        LEFT JOIN GeneralAllocationSchedule AS gas ON ad.parentschedule = gas.id
                        LEFT JOIN AllocationDetail AS ad_1 ON ad_1.parentschedule = gas.id AND ad_1.id = ad.id
                        LEFT JOIN allocationDetailJournalMap AS map ON map.allocationdetail = ad_1.id 
                        LEFT JOIN Transaction AS t ON t.id = map.journal
                        LEFT JOIN customrecord_hb_alloc_journal_ref AS ajr ON ajr.custrecord_hb_je_ref = t.id
                        WHERE ad.id = ${id} 
            `,
                  })
                  .asMappedResults();
      };
      const voidTransactions = (trans) => {
            const voided = [];
            trans.forEach((tran) => {
                  const voidTran = transaction.void({
                        type: record.Type.JOURNAL_ENTRY,
                        id: tran,
                  });
                  voided.push(voidTran);
            });
            return voided;
      };

      const allocationFunction = (newRecord, refId) => {
            try {
                  log.debug('Allocation::Starting Execution', new Date());
                  // const timeoutResponse = setTimeout(15);
                  // log.debug('Timeout Passed', new Date());
                  // if (type !== 'create') return;
                  const allocationDetail = newRecord.getValue({
                        fieldId: 'parentexpensealloc',
                  });
                  log.debug('allocationDetail', allocationDetail);
                  if (!allocationDetail) {
                        log.debug(
                              'Not an Allocation Journal Entry',
                              newRecord.id
                        );
                        return;
                  }
                  const period = newRecord.getValue({
                        fieldId: 'postingperiod',
                  });
                  log.debug(
                        `Allocation Journal Entry : ${newRecord.id}`,
                        `Posting Period : ${period}`
                  );
                  const { relatedJournals, schedule } =
                        getRelatedJournalEntries(allocationDetail, period);
                  log.debug('Related Journals', relatedJournals);

                  const voided = voidTransactions(relatedJournals);
                  log.debug('Previous Transactions Voided', voided);
                  let parentRef = '';
                  if (!relatedJournals.length) {
                        const parentAlloc =
                              getAllocationJournalParent(allocationDetail);
                        log.debug('getAllocationJournalParent', parentAlloc);
                        parentRef = parentAlloc.filter((item) => {
                              return item.id !== refId;
                        })[0]?.id;
                        log.debug(
                              'Parent Allocation Journal Reference',
                              parentRef
                        );
                  }

                  log.debug('Allocation::Ending Execution', new Date());
                  return {
                        isAllocation: Boolean(allocationDetail),
                        period,
                        voided,
                        schedule: schedule,
                        parentRef,
                        override: Boolean(relatedJournals.length),
                  };
            } catch (e) {
                  log.error('Error Occurred::', e);
            }
      };

      return { allocationFunction };
});
