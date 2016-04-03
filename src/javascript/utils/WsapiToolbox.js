Ext.define('Rally.technicalservices.WsapiToolbox', {
    singleton: true,
    fetchWsapiCount: function(config){
        var deferred = Ext.create('Deft.Deferred');

        var storeConfig = Ext.apply({
            fetch: ['ObjectID'],
            limit: 1,
            pageSize: 1
        },config);

        Ext.create('Rally.data.wsapi.Store',storeConfig).load({
            callback: function(records, operation, success){
                if (success){
                    deferred.resolve(operation.resultSet.totalRecords);
                } else {
                    deferred.reject(Ext.String.format("Error getting {0} count for {1}: {2}", config.model, config.filters && config.filters.toString() || "(No Filter)", operation.error.errors.join(',')));
                }
            }
        });
        return deferred;
    },
    fetchRestorableTypeDefinitions: function(){
        var deferred = Ext.create('Deft.Deferred');

        var store = Ext.create('Rally.data.wsapi.Store', {
            model: 'TypeDefinition',
            fetch: ['TypePath', 'Ordinal','Name'],
            filters: [{
                property: 'Creatable',
                value: true
            },{
                property: 'Restorable',
                value: true
            }],
            sorters: [{
                property: 'Ordinal',
                direction: 'ASC'
            }]
        });
        store.load({
            callback: function(records, operation, success){

                if (success){
                    deferred.resolve(records);
                } else {
                    var error_msg = '';
                    if (operation && operation.error && operation.error.errors){
                        error_msg = operation.error.errors.join(',');
                    }
                    deferred.reject('Error loading Artifact Types:  ' + error_msg);
                }
            }
        });
        return deferred.promise;
    },
    fetchWorkspaces: function(){
        var deferred = Ext.create('Deft.Deferred');
        Ext.create('Rally.data.wsapi.Store', {
            model: 'Subscription',
            fetch: ['Workspaces'],
            autoLoad: true,
            listeners: {
                scope: this,
                load: function(store, records, success){

                    if (success){
                        records[0].getCollection('Workspaces',{
                            fetch: ['ObjectID','Name','State','Projects:summary[State]'],
                            limit: 'Infinity',
                            buffered: false
                        }).load({
                            callback: function(records, operation, success){
                                var workspaces = [];
                                if (operation.wasSuccessful()){
                                    Ext.Array.each(records,function(record){
                                        var summaryInfo = record.get('Summary').Projects;
                                        var open_project_count = summaryInfo.State['Open'];
                                        if (record.get('State') == 'Open' && open_project_count > 0){
                                            record.set("id", record["ObjectID"]);
                                            workspaces.push(record);
                                        }
                                    },this);

                                    deferred.resolve(workspaces);
                                } else {
                                    deferred.reject('Error loading workspace information: ' + operation.getError());
                                }
                            }
                        });
                    } else {
                        deferred.reject('Error querying Subscription');
                    }
                }
            }
        });
        return deferred;
    }
    //fetchWsapiRecords: function(model, query_filters, fetch_fields, context){
    //    var deferred = Ext.create('Deft.Deferred');
    //
    //    var store = Ext.create('Rally.data.wsapi.Store',{
    //        model: model,
    //        fetch: fetch_fields,
    //        filters: query_filters,
    //        context: context,
    //        limit: Infinity
    //    }).load({
    //        callback: function(records, operation, success){
    //            if (success){
    //                deferred.resolve(records);
    //            } else {
    //                deferred.reject(Ext.String.format("Error getting {0} for {1}: {2}", model, query_filters.toString(), operation.error.errors.join(',')));
    //            }
    //        }
    //    });
    //    return deferred;
    //},
    //fetchWsapiRecordsWithPaging: function(model, query_filters, fetch_fields, context){
    //    var deferred = Ext.create('Deft.Deferred'),
    //        pageSize = 200;
    //
    //    var store = Ext.create('Rally.data.wsapi.Store',{
    //        model: model,
    //        fetch: fetch_fields,
    //        filters: query_filters,
    //        context: context,
    //        pageSize: pageSize
    //    });
    //
    //    PortfolioItemCostTracking.WsapiToolbox.fetchWsapiCount(model, query_filters).then({
    //        success: function(totalRecords){
    //            var promises = [],
    //                totalPages = Math.ceil(totalRecords/pageSize);
    //
    //            for (var i=0; i< totalPages; i++){
    //                promises.push(PortfolioItemCostTracking.WsapiToolbox.loadStorePage(i, store));
    //            }
    //
    //            Deft.Promise.all(promises).then({
    //                success: function(results){
    //                    deferred.resolve(_.flatten(results));
    //                },
    //                failure: function(msg){
    //                    deferred.reject(msg);
    //                }
    //            });
    //        },
    //        failure: function(msg){
    //            deferred.reject(msg);
    //        }
    //    });
    //
    //    return deferred;
    //},
    //loadStorePage: function(pageNum, store){
    //    var deferred = Ext.create('Deft.Deferred');
    //
    //    store.loadPage(pageNum, {
    //        callback: function(records, operation){
    //            if (operation.wasSuccessful()){
    //                deferred.resolve(records);
    //            } else {
    //                deferred.reject(operation.error.errors.join(','));
    //            }
    //
    //        }
    //    });
    //
    //    return deferred;
    //},
    //fetchReleases: function(timebox){
    //
    //    var deferred = Ext.create('Deft.Deferred'),
    //        rec = timebox.getRecord(),
    //        me = this;
    //
    //    if (rec === null) {
    //        deferred.resolve([]);
    //    }
    //
    //    Ext.create('Rally.data.wsapi.Store',{
    //        model: 'Release',
    //        fetch: ['ObjectID'],
    //        filters: [{
    //            property: 'Name',
    //            value: rec.get('Name')
    //        },{
    //            property: 'ReleaseStartDate',
    //            value: rec.get('ReleaseStartDate')
    //        },{
    //            property: 'ReleaseDate',
    //            value: rec.get('ReleaseDate')
    //        }],
    //        limit: Infinity
    //    }).load({
    //        callback: function(records, operation, success){
    //            if (success){
    //                deferred.resolve(records);
    //            }   else {
    //                deferred.reject("Error loading Releases: " + operation.error.errors.join(','));
    //            }
    //        }
    //    });
    //    return deferred;
    //},
    //
    //fetchAllowedValues: function(model,field_name) {
    //    var deferred = Ext.create('Deft.Deferred');
    //
    //    Rally.data.ModelFactory.getModel({
    //        type: model,
    //        success: function(model) {
    //            model.getField(field_name).getAllowedValueStore().load({
    //                callback: function(records, operation, success) {
    //                    var values = Ext.Array.map(records, function(record) {
    //                        return record.get('StringValue');
    //                    });
    //                    deferred.resolve(values);
    //                }
    //            });
    //        },
    //        failure: function(msg) { deferred.reject('Error loading field values: ' + msg); }
    //    });
    //    return deferred;
    //},
    //fetchPortfolioItemTypes: function(){
    //    var deferred = Ext.create('Deft.Deferred');
    //    console.log('fetchPortfolioItemTypes', new Date());
    //    var store = Ext.create('Rally.data.wsapi.Store', {
    //        model: 'TypeDefinition',
    //        fetch: ['TypePath', 'Ordinal','Name'],
    //        filters: [
    //            {
    //                property: 'Parent.Name',
    //                operator: '=',
    //                value: 'Portfolio Item'
    //            },
    //            {
    //                property: 'Creatable',
    //                operator: '=',
    //                value: 'true'
    //            }
    //        ],
    //        sorters: [{
    //            property: 'Ordinal',
    //            direction: 'ASC'
    //        }]
    //    });
    //    store.load({
    //        callback: function(records, operation, success){
    //            console.log('fetchPortfolioItemTypes callback', new Date());
    //            if (success){
    //                var portfolioItemTypes = new Array(records.length);
    //                _.each(records, function(d){
    //                    //Use ordinal to make sure the lowest level portfolio item type is the first in the array.
    //                    var idx = Number(d.get('Ordinal'));
    //                    portfolioItemTypes[idx] = { typePath: d.get('TypePath'), name: d.get('Name') };
    //                    //portfolioItemTypes.reverse();
    //                });
    //                deferred.resolve(portfolioItemTypes);
    //            } else {
    //                var error_msg = '';
    //                if (operation && operation.error && operation.error.errors){
    //                    error_msg = operation.error.errors.join(',');
    //                }
    //                deferred.reject('Error loading Portfolio Item Types:  ' + error_msg);
    //            }
    //        }
    //    });
    //    return deferred.promise;
    //},
    //fetchDoneStates: function(){
    //    var deferred = Ext.create('Deft.Deferred');
    //    console.log('fetchDoneStates', new Date());
    //    Rally.data.ModelFactory.getModel({
    //        type: 'HierarchicalRequirement',
    //        success: function(model) {
    //            var field = model.getField('ScheduleState');
    //            field.getAllowedValueStore().load({
    //                callback: function(records, operation, success) {
    //                    console.log('fetchDoneStates callback', new Date());
    //                    if (success){
    //                        var values = [];
    //                        for (var i=records.length - 1; i > 0; i--){
    //                            values.push(records[i].get('StringValue'));
    //                            if (records[i].get('StringValue') == "Accepted"){
    //                                i = 0;
    //                            }
    //                        }
    //                        deferred.resolve(values);
    //                    } else {
    //                        deferred.reject('Error loading ScheduleState values for User Story:  ' + operation.error.errors.join(','));
    //                    }
    //                },
    //                scope: this
    //            });
    //        },
    //        failure: function() {
    //            var error = "Could not load schedule states";
    //            deferred.reject(error);
    //        }
    //    });
    //    return deferred.promise;
    //}
});
