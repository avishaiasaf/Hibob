/**
 * @NApiVersion 2.1
 */
define([
      'N/file',
      'N/query',
      'N/search',
      'N/compress',
      './HB CM Version Fields',
], /**
 * @param{file} file
 * @param{query} query
 */ (file, query, search, compress, versionFields) => {
      const createVersionTab = (form, newRecord) => {
            try {
                  const tab = form.addTab({
                        id: 'custpage_subscription_version',
                        label: 'Subscription Versions',
                  });
                  const versionRecords = query
                        .runSuiteQL({
                              query: `
                    SELECT id, custrecord_hb_subs_version AS version
                    FROM customrecord_hb_subscription_version 
                    WHERE custrecord_hb_subscription_v = ${newRecord.id}
                         `,
                        })
                        .asMappedResults();
                  log.debug('Version Records', versionRecords);
                  let validVersion = false;

                  const versionSublistContainer = {};

                  versionRecords.forEach((version, index) => {
                        const currentTabId = `custpage_sub_version_${index}`;
                        form.addSubtab({
                              id: currentTabId,
                              label: `Version ${version['version']}`,
                              tab: 'custpage_subscription_version',
                        });
                        const versionSublist = `subscription_version_${index}`;
                        versionSublistContainer[versionSublist] =
                              form.addSublist({
                                    id: `custpage_sub_version_sublist_${index}`,
                                    label: `Version ${index}`,
                                    type: 'LIST',
                                    tab: currentTabId,
                              });

                        //Create fields
                        versionFields.fields.forEach((field) => {
                              versionSublistContainer[versionSublist].addField({
                                    id: `${field.id}${index}`,
                                    label: field.label,
                                    type: field.type,
                                    source: field.source || '',
                              });
                        });
                        const versionFile = search.lookupFields({
                              type: 'customrecord_hb_subscription_version',
                              id: version['id'],
                              columns: 'custrecord_hb_version_file',
                        })['custrecord_hb_version_file'][0].value;
                        log.debug('Version File', versionFile);

                        const fileObj = file.load({
                              id: versionFile,
                        });
                        const gunzippedFile = compress.gunzip({
                              file: fileObj,
                        });
                        const content = gunzippedFile.getContents();
                        const parsedContent = JSON.parse(content);

                        log.debug('parsedContent', parsedContent);

                        parsedContent['subscriptionItemsData'].forEach(
                              (subscriptionItem, i) => {
                                    if (subscriptionItem) {
                                          log.debug(
                                                `Subscription Item Data ${i}`,
                                                subscriptionItem
                                          );
                                          const valueObj = {
                                                s: parsedContent[
                                                      'subscriptionData'
                                                ][0],
                                                si: subscriptionItem,
                                          };
                                          versionFields.fields.forEach(
                                                (field) => {
                                                      const value =
                                                            field.value(
                                                                  valueObj
                                                            );
                                                      // log.debug('value', value);
                                                      versionSublistContainer[
                                                            versionSublist
                                                      ].setSublistValue({
                                                            id: `${field.id}${index}`,
                                                            line: i,
                                                            value,
                                                      });
                                                }
                                          );
                                    }
                              }
                        );
                  });
            } catch (e) {
                  log.error('Error', e);
            }
      };

      return { createVersionTab };
});
