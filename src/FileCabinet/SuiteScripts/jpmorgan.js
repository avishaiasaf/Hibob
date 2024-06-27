/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/runtime', 'N/search', 'N/ui/serverWidget'], (
    t,
    e,
    c,
    n
) =>
    (() => {
        'use strict';
        var r = {
                11365: (e) => {
                    e.exports = t;
                },
                5669: (t) => {
                    t.exports = e;
                },
                27091: (t) => {
                    t.exports = c;
                },
                84247: (t) => {
                    t.exports = n;
                },
            },
            o = {};
        function a(t) {
            var e = o[t];
            if (void 0 !== e) return e.exports;
            var c = (o[t] = { exports: {} });
            return r[t](c, c.exports, a), c.exports;
        }
        (a.n = (t) => {
            var e = t && t.__esModule ? () => t.default : () => t;
            return a.d(e, { a: e }), e;
        }),
            (a.d = (t, e) => {
                for (var c in e)
                    a.o(e, c) &&
                        !a.o(t, c) &&
                        Object.defineProperty(t, c, {
                            enumerable: !0,
                            get: e[c],
                        });
            }),
            (a.o = (t, e) => Object.prototype.hasOwnProperty.call(t, e)),
            (a.r = (t) => {
                'undefined' != typeof Symbol &&
                    Symbol.toStringTag &&
                    Object.defineProperty(t, Symbol.toStringTag, {
                        value: 'Module',
                    }),
                    Object.defineProperty(t, '__esModule', { value: !0 });
            });
        var d = {};
        return (
            (() => {
                a.r(d), a.d(d, { beforeLoad: () => v, beforeSubmit: () => y });
                var t = a(11365),
                    e = a.n(t),
                    c = a(27091),
                    n = a.n(c);
                const r = {
                    appId: 'com.fispan.vbd',
                    projectName: 'Entity Bank Details',
                    bundleId: '323878',
                    csvExportFolder: 'vbd-csv-exports',
                    entityTabRoute: 'entity-tab',
                    mountPointId: 'app-mount-point'.concat(
                        '-'.concat('fispan')
                    ),
                    vbdTabId: 'custpage_'.concat('fispan', '_vbd_tab'),
                    vbdFieldId: 'custpage_'.concat(
                        'fispan',
                        '_vbd_vendor_field'
                    ),
                    records: {
                        vbd: {
                            id: 'customrecord_'.concat(
                                'fispan',
                                '_vendor_bank_details'
                            ),
                            columns: {
                                name: 'name',
                                label: 'custrecord_'.concat(
                                    'fispan',
                                    '_vbd_label'
                                ),
                                entity: 'custrecord_'.concat(
                                    'fispan',
                                    '_vbd_vendor'
                                ),
                                entityType: 'custrecord_'.concat(
                                    'fispan',
                                    '_vbd_type'
                                ),
                                currency: 'custrecord_'.concat(
                                    'fispan',
                                    '_vbd_currency'
                                ),
                                country: 'custrecord_'.concat(
                                    'fispan',
                                    '_vbd_country'
                                ),
                                method: 'custrecord_'.concat(
                                    'fispan',
                                    '_vbd_method'
                                ),
                                primary: 'custrecord_'.concat(
                                    'fispan',
                                    '_vbd_primary'
                                ),
                                paymentData: 'custrecord_'.concat(
                                    'fispan',
                                    '_vbd_payment_data'
                                ),
                            },
                        },
                        log: {
                            id: 'customrecord_'.concat('fispan', '_vbd_log'),
                            columns: {
                                entry: 'custrecord_'.concat(
                                    'fispan',
                                    '_vbd_log_vbdentry'
                                ),
                                entityType: 'custrecord_'.concat(
                                    'fispan',
                                    '_vbd_log_type'
                                ),
                                previous: 'custrecord_'.concat(
                                    'fispan',
                                    '_vbd_log_previous'
                                ),
                                current: 'custrecord_'.concat(
                                    'fispan',
                                    '_vbd_log_current'
                                ),
                            },
                        },
                        epb: {
                            id: 'customrecord_2663_entity_bank_details',
                            columns: {
                                id: 'internalid',
                                accountNumber: 'custrecord_2663_entity_acct_no',
                                parentVendor: 'custrecord_2663_parent_vendor',
                                bankAccountType:
                                    'custrecord_2663_entity_bank_acct_type',
                                fileFormat:
                                    'custrecord_2663_entity_file_format',
                                bankNumber: 'custrecord_2663_entity_bank_no',
                                branchNumber:
                                    'custrecord_2663_entity_branch_no',
                                bankType: 'custrecord_2663_entity_bank_type',
                            },
                            batchSize: { min: 200, max: 2e3 },
                        },
                    },
                    overview: {
                        suitelet: {
                            scriptId: 'customscript_'.concat(
                                'fispan',
                                '_vbd_overview'
                            ),
                            deploymentId: 'customdeploy_'.concat(
                                'fispan',
                                '_vbd_overview'
                            ),
                        },
                    },
                    history: {
                        suitelet: {
                            scriptId: 'customscript_'.concat(
                                'fispan',
                                '_vbd_history'
                            ),
                            deploymentId: 'customdeploy_'.concat(
                                'fispan',
                                '_vbd_history'
                            ),
                        },
                        export: {
                            restlet: {
                                scriptId: 'customscript_'.concat(
                                    'fispan',
                                    '_vbd_history_export_r'
                                ),
                                deploymentId: 'customdeploy_'.concat(
                                    'fispan',
                                    '_vbd_history_export_r'
                                ),
                            },
                        },
                    },
                    import: {
                        'map-reduce': {
                            name: 'MapreduceImport',
                            scriptId: 'customscript_'.concat(
                                'fispan',
                                '_vbd_import_mr'
                            ),
                            deploymentId: 'customdeploy_'.concat(
                                'fispan',
                                '_vbd_import_mr'
                            ),
                            fields: {
                                importData: 'custscript_'.concat(
                                    'fispan',
                                    '_vbd_import_data'
                                ),
                                jobId: 'custscript_'.concat(
                                    'fispan',
                                    '_vbd_import_jobid'
                                ),
                                entityType: 'custscript_'.concat(
                                    'fispan',
                                    '_vbd_import_entitytype'
                                ),
                            },
                        },
                        restlet: {
                            scriptId: 'customscript_'.concat(
                                'fispan',
                                '_vbd_import_r'
                            ),
                            deploymentId: 'customdeploy_'.concat(
                                'fispan',
                                '_vbd_import_r'
                            ),
                        },
                    },
                    export: {
                        'map-reduce': {
                            name: 'MapreduceExport',
                            scriptId: 'customscript_'.concat(
                                'fispan',
                                '_vbd_export_mr'
                            ),
                            deploymentId: 'customdeploy_'.concat(
                                'fispan',
                                '_vbd_export_mr'
                            ),
                            fields: {
                                jobId: 'custscript_'.concat(
                                    'fispan',
                                    '_vbd_export_jobid'
                                ),
                                entityType: 'custscript_'.concat(
                                    'fispan',
                                    '_vbd_export_entitytype'
                                ),
                            },
                        },
                        restlet: {
                            scriptId: 'customscript_'.concat(
                                'fispan',
                                '_vbd_export_r'
                            ),
                            deploymentId: 'customdeploy_'.concat(
                                'fispan',
                                '_vbd_export_r'
                            ),
                        },
                    },
                    installation: {
                        'map-reduce-install': {
                            scriptId: 'customscript_'.concat(
                                'fispan',
                                '_vbd_install_mr'
                            ),
                            deploymentId: 'customdeploy_'.concat(
                                'fispan',
                                '_vbd_install_mr'
                            ),
                        },
                        'map-reduce-update': {
                            scriptId: 'customscript_'.concat(
                                'fispan',
                                '_vbd_update_mr'
                            ),
                            deploymentId: 'customdeploy_'.concat(
                                'fispan',
                                '_vbd_update_mr'
                            ),
                            fields: {
                                updateData: 'custscript_'.concat(
                                    'fispan',
                                    '_vbd_update_data'
                                ),
                            },
                        },
                    },
                    decrypt: {
                        restlet: {
                            scriptId: 'customscript_'.concat(
                                'fispan',
                                '_vbd_decrypt_r'
                            ),
                            deploymentId: 'customdeploy_'.concat(
                                'fispan',
                                '_vbd_decrypt_r'
                            ),
                        },
                    },
                    general: {
                        analytics: {
                            restlet: {
                                scriptId: 'customscript_'.concat(
                                    'fispan',
                                    '_vbd_analytics_r'
                                ),
                                deploymentId: 'customdeploy_'.concat(
                                    'fispan',
                                    '_vbd_analytics_r'
                                ),
                            },
                        },
                    },
                };
                var o = [
                        { name: 'internalId' },
                        { name: r.records.vbd.columns.entity },
                    ],
                    i = function (t) {
                        return [
                            [r.records.vbd.columns.entity, n().Operator.IS, t],
                        ];
                    },
                    p = function (t) {
                        var c = t.newRecord.getValue('id'),
                            a = t.newRecord.getValue('type');
                        if (c && 'entity' === a) {
                            var d = (function (t) {
                                    return n()
                                        .create({
                                            type: r.records.vbd.id,
                                            columns: o,
                                            filters: i(t),
                                        })
                                        .runPaged({ pageSize: 100 });
                                })(c),
                                p = (function (t) {
                                    var e = t.pageRanges.reduce(
                                        (function (t) {
                                            return function (e, c) {
                                                var n = t.fetch(c.index);
                                                return e.concat(n.data);
                                            };
                                        })(t),
                                        []
                                    );
                                    return e;
                                })(d).forEach(
                                    (function (t) {
                                        return function (c) {
                                            var n = c.getValue('internalId'),
                                                o = c.getValue(
                                                    r.records.vbd.columns.entity
                                                );
                                            n &&
                                                o &&
                                                o === t &&
                                                e().delete({
                                                    type: r.records.vbd.id,
                                                    id: n,
                                                });
                                        };
                                    })(c)
                                );
                            return p;
                        }
                    };
                var s = a(84247),
                    _ = a.n(s),
                    u = a(5669),
                    l = a.n(u);
                const b = function (t) {
                    var e,
                        c =
                            (e = l().getCurrentScript()).bundleIds &&
                            e.bundleIds[0],
                        n = '/SuiteApps/'.concat(r.appId),
                        o = '/SuiteBundles/Bundle '
                            .concat(c, '/')
                            .concat(r.appId),
                        a = [
                            'require([',
                            '"'
                                .concat(c ? o : n, '/')
                                .concat(t, '/clientscript"'),
                            '], function(application) {',
                            'application.pageInit();',
                            '});',
                        ].join('\n');
                    return '<script defer type="text/javascript">'.concat(
                        a,
                        '</script>'
                    );
                };
                const m = {
                    createAndRun: function (t) {
                        var e,
                            c = r.vbdTabId,
                            n = r.projectName,
                            o = r.vbdFieldId,
                            a = ''.concat(r.projectName, ', Internal');
                        return (
                            (function (t, e, c) {
                                t.addTab({ id: e, label: c });
                            })(t, c, n),
                            ((function (t, e, c, n) {
                                return t.addField({
                                    container: e,
                                    id: c,
                                    label: n,
                                    type: _().FieldType.INLINEHTML,
                                });
                            })(t, c, o, a).defaultValue =
                                ((e = ''),
                                (e += '<div id="'.concat(
                                    r.mountPointId,
                                    '" data-inside-entity-tab="true" style="width:100%;min-height:650px;height:auto;margin-top:24px;"></div>'
                                )) + b('overview'))),
                            t
                        );
                    },
                };
                var v = function (t) {
                        return (
                            !t ||
                                (t.type !== t.UserEventType.VIEW &&
                                    t.type !== t.UserEventType.EDIT) ||
                                m.createAndRun(t.form),
                            t
                        );
                    },
                    y = function (t) {
                        return (
                            t && t.type === t.UserEventType.DELETE && p(t), t
                        );
                    };
            })(),
            d
        );
    })());
