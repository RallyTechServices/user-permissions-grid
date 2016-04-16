Ext.define("TSApp", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    defaults: { margin: 10 },
    items: [
        {       
                xtype:'container',
                itemId:'container_header',
                layout: {
                        type: 'hbox',
                        align: 'stretch'
                }
        },
        {xtype:'container',itemId:'container_body'}
    ],

    integrationHeaders : {
        name : "TSApp"
    },


                        
    launch: function() {
        var me = this;
        console.log('Start >>>>>>>>>>>>>>',new Date());
        this.selectedWorkspaces = [this.getContext().getWorkspace()];
        Rally.technicalservices.WsapiToolbox.fetchWorkspaces().then({
            success: function(results){
                me.workspaces = results;
                me.logger.log('fetchArtifactTypes: ', this.supportedTypeDefinitions);
                me._addSelectors();
            },
            failure: function(msg){
                Rally.ui.notify.Notifier.showError({message: msg});
            },
            scope: me
        });

    },

    _addSelectors: function(){
        this.down('#container_header').removeAll();

        var buttonWidth = 150;

        var selectorCt = this.down('#container_header').add({
            xtype: 'container',
            itemId: 'selector-ct',
            layout: 'hbox',
            flex: 1,
            padding: 5
        });

        selectorCt.add({
            xtype: 'rallybutton',
            text: 'Select Workspaces...',
            width: buttonWidth,
            cls: 'secondary',
            listeners: {
                click: this._selectWorkspaces,
                scope: this
            },
            margin: 10
        });

        selectorCt.add({
            xtype: 'rallybutton',
            text: 'Update',
            width: buttonWidth,
            cls: 'primary',
            listeners: {
                click: this._loadAStoreWithAPromiseWithModel,
                scope: this
            },
            margin: '10'
        });
    },

    _selectWorkspaces: function(){
        this.logger.log('_selectWorkspaces', this.workspaces);
        Ext.create('Rally.technicalservices.dialog.PickerDialog',{
            records: this.workspaces,
            selectedRecords: this.selectedWorkspaces,
            displayField: 'Name',
            listeners: {
                scope: this,
                itemselected: this._workspacesSelected
            }
        });
    },

    _workspacesSelected: function(records){
        this.logger.log('_workspacesSelected', records);
         if (records.length > 0){
            this.selectedWorkspaces = records;
        } else {
            this.selectedWorkspaces = [this.getContext().getWorkspace()];
        }
    },

    _getSelectedContexts: function(){
        this.logger.log('_getSelectedContexts');
        var workspace_filter = [];
        Ext.Array.each(this.selectedWorkspaces, function(wksp){
            workspace_filter.push({property:'Workspace.ObjectID', value: wksp.ObjectID || wksp.get('ObjectID')});
        });
        return Rally.data.wsapi.Filter.or(workspace_filter);
    },

   
    _loadAStoreWithAPromiseWithModel: function(){
        var me = this;
        var selectedContexts = this._getSelectedContexts();
        var model_name = 'User',
        field_names = ['FirstName','LastName','UserName','SubscriptionPermission','Role','CreationDate','LastLoginDate','CostCenter', 'Department', 'Disabled', 'Planner'];
        me.setLoading("Please wait.This may take long depending on the size of your data...");

        this._loadAStoreWithAPromise(model_name, field_names,selectedContexts).then({
            success: function(store) {
                this._displayGrid(store);
                console.log('End >>>>>>>>>>>>>>',new Date());
            },
            failure: function(error_message){
                alert(error_message);
            },
            scope: this
        }).always(function() {
            me.setLoading(false);
        });
    } ,

    //TODO: this and me are used in code interchangeably - need to cleanup
    _loadAStoreWithAPromise: function(model_name, model_fields,selectedContexts){
        var deferred = Ext.create('Deft.Deferred');
        var me = this;
        //me.logger.log("Starting load:",model_name,model_fields);
        me.setLoading('Loading All Users');
        Deft.Promise.all(me._getUserRecords()).then({
            success: function(records){
                    //console.log('total users -yay',records)
                    if (records){
                        var promises = [];
                        var projectPromises = [];
                        var workspacePromises = [];
                        var totalUsers = records.length,
                            me = this;
                            var userCount = 0;
                        _.each(records, function(result){
                             promises.push(function(){
                                me.setLoading('Loading Workspaces and Projects for User - ' + userCount++ +' of '+totalUsers);
                                return me._getColleciton(result,selectedContexts); 
                            });
                        },me);


                        Deft.Chain.sequence(promises).then({
                            success: function(results){
                                // console.log('All permissions >>',results,results.length);
                                me.setLoading('Assigning Permissions All Users..');
                                var usersAndPermission = [];
                                var users = [];

                                for (var i = 0; records && i < records.length; i++) {
                                    if((records[i].get('SubscriptionPermission')=='Subscription Admin') || (records[i].get('SubscriptionPermission')=='No Access')){

                                        // var user = {
                                        //     FullName: records[i].get('FirstName') + ' ' +records[i].get('LastName'),
                                        //     UserName: records[i].get('UserName'),
                                        //     SubscriptionPermission: records[i].get('SubscriptionPermission'),
                                        //     UserPermission: null,
                                        //     Role: records[i].get('Role'),
                                        //     CreationDate: records[i].get('CreationDate'),
                                        //     LastLoginDate: records[i].get('LastLoginDate'),
                                        //     CostCenter: records[i].get('CostCenter'), 
                                        //     Department: records[i].get('Department'), 
                                        //     Disabled: records[i].get('Disabled'), 
                                        //     Planner: records[i].get('Planner')
                                        // }
                                        // users.push(user);
                                        continue;
                                    }


                                    var workspaceArr = results[i].Workspace;
                                    // Construct the records with workspace permission
                                    if(workspaceArr && workspaceArr.length > 0){
                                       for (var j = 0; workspaceArr && j < workspaceArr.length; j++) {
                                            var user = {
                                                FullName: records[i].get('FirstName') + ' ' +records[i].get('LastName'),
                                                UserName: records[i].get('UserName'),
                                                SubscriptionPermission: records[i].get('SubscriptionPermission'),
                                                UserPermission: workspaceArr[j],
                                                Role: records[i].get('Role'),
                                                CreationDate: records[i].get('CreationDate'),
                                                LastLoginDate: records[i].get('LastLoginDate'),
                                                CostCenter: records[i].get('CostCenter'), 
                                                Department: records[i].get('Department'), 
                                                Disabled: records[i].get('Disabled'), 
                                                Planner: records[i].get('Planner')
                                            }
                                            users.push(user);
                                        }

                                    }


                                    //var projectArr = results[(i*2)+ 1];
                                    var projectArr = results[i].Project;
                                   if(projectArr && projectArr.length > 0){
                                       for (var j = 0; projectArr && j < projectArr.length; j++) {
                                            var user = {
                                                FullName: records[i].get('FirstName') + ' ' +records[i].get('LastName'),
                                                UserName: records[i].get('UserName'),
                                                SubscriptionPermission: records[i].get('SubscriptionPermission'),
                                                UserPermission: projectArr[j],
                                                Role: records[i].get('Role'),
                                                CreationDate: records[i].get('CreationDate'),
                                                LastLoginDate: records[i].get('LastLoginDate'),
                                                CostCenter: records[i].get('CostCenter'), 
                                                Department: records[i].get('Department'), 
                                                Disabled: records[i].get('Disabled'), 
                                                Planner: records[i].get('Planner')
                                            }
                                            users.push(user);
                                        }

                                     }


                                }
                                // console.log('UserS >>',users);
                                // create custom store (call function ) combine permissions and results in to one.
                                var store = Ext.create('Rally.data.custom.Store', {
                                    data: users,
                                    scope: this
                                });
                                me._initial_store = store;
                                // console.log('Initial store',store);    
                                deferred.resolve(store);                        
                            }
                        });
                    } else {
                        deferred.reject('Problem loading: ');
                    }
                },
                scope: me
            });
            return deferred.promise;
           
    },

    _getUserRecords: function(){
        this.setLoading('Loading All Users');
        return this.fetchWsapiRecordsWithPaging({model:'User',fetch:['FirstName','LastName','UserName','SubscriptionPermission','Role','CreationDate','LastLoginDate','CostCenter', 'Department', 'Disabled', 'Planner','ObjectID']});
    },

    _getWorkspaceColleciton: function(record,selectedContexts){
        var filter = Ext.create('Rally.data.wsapi.Filter', {
            property: 'User.ObjectID',value: record.get('ObjectID')
        });
        filter = selectedContexts.and(filter);
        return this.fetchWsapiRecordsWithPaging({model:'WorkspacePermission',fetch:['Workspace','User','Role','Name','ObjectID'],filters: filter});
    },

    _getProjectColleciton: function(record,selectedContexts){
        var filter = Ext.create('Rally.data.wsapi.Filter', {
            property: 'User.ObjectID',value: record.get('ObjectID')
        });
        filter = selectedContexts.and(filter);
        return this.fetchWsapiRecordsWithPaging({model:'ProjectPermission',fetch:['Workspace','Project','User','Role','Name','ObjectID'],filters: filter});
    },

    _getColleciton: function(record,selectedContexts){
        me = this;
        var deferred = Ext.create('Deft.Deferred');

        if((record.get('SubscriptionPermission')=='Subscription Admin') || (record.get('SubscriptionPermission')=='No Access')){
                    var projectAndWorkspace = {
                        Project: null,
                        Workspace: null
                    };
                    deferred.resolve(projectAndWorkspace);

        }else{
            Deft.Promise.all([me._getProjectColleciton(record,selectedContexts), me._getWorkspaceColleciton(record,selectedContexts)],me).then({
                success: function(results){
                    var projectAndWorkspace = {
                        Project: results[0],
                        Workspace: results[1]
                    };
                    deferred.resolve(projectAndWorkspace);
                },
                failure: function(){
                    deferred.reject('Problem Loading. Please check logs');
                },
                scope: me
            });

        }

        return deferred;
    },

    _displayGrid: function(store){
      // console.log('store before createing the grid',store);
      this._grid = this.down('#container_body').add({
            xtype: 'rallygrid',
            store: store,
            columnCfgs: [
                {
                    text: 'Name', 
                    dataIndex: 'FullName',
                    flex: 1
                },
                {
                    text: 'User Name', 
                    dataIndex: 'UserName',
                    flex: 2

                },
                {
                    text: 'Workspace',
                    dataIndex: 'UserPermission',
                    flex: 1,
                    renderer: function(UserPermission){
                        var text = [];
                        if(UserPermission){
                            //if (UserPermission.get('_type') == 'workspacepermission' ){
                                text.push(UserPermission.get('Workspace').Name);
                            //}
                        }else{
                            text.push('NA');
                        }

                        return text;
                    }
                },
                {
                    text: 'Project',
                    dataIndex: 'UserPermission',
                    flex: 1,
                    renderer: function(UserPermission){
                        var text = [];
                        if(UserPermission){
                            if(UserPermission.get('Project')){
                                text.push(UserPermission.get('Project').Name);
                            }
                        }else{
                            text.push('NA');
                        }

                        return text;
                    }
                },
                {
                    text: 'Role',
                    dataIndex: 'UserPermission',
                    flex: 1,
                    renderer: function(UserPermission){
                        var text = [];
                        if(UserPermission){
                            // if(UserPermission.get('_type') == 'projectpermission' || UserPermission.get('_type') == 'workspacepermission' ){
                             text.push(UserPermission.get('Role') );
                            // }else{
                            //     text.push('NA');
                            // }

                        }else{
                            text.push('NA');
                        }


                        return text;
                    }
                },
                {
                    text: 'Subscription Permission', 
                    dataIndex: 'SubscriptionPermission',
                    flex: 1
                },
                {
                    text: 'Creation Date', 
                    dataIndex: 'CreationDate',
                    flex: 1,
                    renderer:function(CreationDate){
                        return Ext.Date.format(CreationDate, 'm/d/Y g:i:s A')
                    }
                },
                {
                    text: 'Last Login Date', 
                    dataIndex: 'LastLoginDate',
                    flex: 1,
                    renderer:function(LastLoginDate){
                        return Ext.Date.format(LastLoginDate, 'm/d/Y g:i:s A')
                    }
                },
                {
                    text: 'CostCenter', 
                    dataIndex: 'CostCenter',
                    flex: 1
                },
                {
                    text: 'Department', 
                    dataIndex: 'Department',
                    flex: 1
                },
                {
                    text: 'Disabled', 
                    dataIndex: 'Disabled',
                    flex: 1,
                    renderer:function(Disabled){
                        return Disabled ? "Yes" : "No";
                    }
                },
                {
                    text: 'Planner', 
                    dataIndex: 'Planner',
                    flex: 1,
                    renderer:function(Planner){
                        return Planner ? "Yes" : "No";
                    }
                }
                
            ]

        });

        this.down('#container_body').add(this._grid);

         this.down('#container_header').add({
            xtype:'rallybutton',
            itemId:'export_button',
            text: 'Download CSV',
            disabled: false,
            iconAlign: 'right',
            listeners: {
                scope: this,
                click: function() {
                    this._export();
                }
            },
            margin: '10',
            scope: this
        });
        
    },

   
    _export: function(){
        var grid = this.down('rallygrid');
        var me = this;

        if ( !grid ) { return; }
        
        this.logger.log('_export',grid);

        var filename = Ext.String.format('user-permissions.csv');

        this.setLoading("Generating CSV");
        Deft.Chain.sequence([
            function() { return Rally.technicalservices.FileUtilities._getCSVFromCustomBackedGrid(grid) } 
        ]).then({
            scope: this,
            success: function(csv){
                if (csv && csv.length > 0){
                    Rally.technicalservices.FileUtilities.saveCSVToFile(csv,filename);
                } else {
                    Rally.ui.notify.Notifier.showWarning({message: 'No data to export'});
                }
                
            }
        }).always(function() { me.setLoading(false); });
    },

    getOptions: function() {
        return [
            {
                text: 'About...',
                handler: this._launchInfo,
                scope: this
            }
        ];
    },
    
    _launchInfo: function() {
        if ( this.about_dialog ) { this.about_dialog.destroy(); }
        this.about_dialog = Ext.create('Rally.technicalservices.InfoLink',{});
    },
    
    isExternal: function(){
        return typeof(this.getAppId()) == 'undefined';
    },
    
    onSettingsUpdate: function (settings){
        this.logger.log('onSettingsUpdate',settings);
        this.launch();
    },


    fetchWsapiCount: function(model, query_filters){
            var deferred = Ext.create('Deft.Deferred');

            Ext.create('Rally.data.wsapi.Store',{
                model: model,
                fetch: ['ObjectID'],
                filters: query_filters,
                enablePostGet:true,
                limit: 1,
                pageSize: 1
            }).load({
                callback: function(records, operation, success){
                    if (success){
                        deferred.resolve(operation.resultSet.totalRecords);
                    } else {
                        deferred.reject(Ext.String.format("Error getting {0} count for {1}: {2}", model, query_filters.toString(), operation.error.errors.join(',')));
                    }
                }
            });
            return deferred;
        },

        fetchWsapiRecordsWithPaging: function(config){
            //console.log('Config details',config);
            var deferred = Ext.create('Deft.Deferred'),
                promises = [],
                me = this;

            this.fetchWsapiCount(config.model, config.filters).then({
                success: function(totalCount){
                    var store = Ext.create('Rally.data.wsapi.Store',{
                        model: config.model,
                        fetch: config.fetch,
                        filters: config.filters,
                        enablePostGet:true,
                        pageSize: 200
                    }),
                    totalPages = Math.ceil(totalCount/200);

                    var pages = _.range(1,totalPages+1,1);
                    //TODO listen to this event 
                    //this.fireEvent('statusupdate',Ext.String.format(config.statusDisplayString || "Loading {0} artifacts", totalCount));

                    _.each(pages, function(page){
                        promises.push(function () {return me.loadStorePage(page, store);});
                    });

                    PortfolioItemCostTracking.promise.ParallelThrottle.throttle(promises, 12, me).then({
                        success: function(results){
                            //console.log('Throttle results',results);
                            deferred.resolve(_.flatten(results));
                        },
                        failure: function(msg){
                            deferred.reject(msg);
                        },
                        scope: me
                    });
                },
                failure: function(msg){
                    deferred.reject(msg);
                },
                scope: me
            });
            return deferred;
        },
        
        loadStorePage: function(pageNum, store){
            var deferred = Ext.create('Deft.Deferred');
            //console.log('pageNum',pageNum);
            store.loadPage(pageNum, {
                callback: function(records, operation){
                    if (operation.wasSuccessful()){

                         deferred.resolve(records);
                    } else {
                        deferred.reject('loadStorePage error: ' + operation.error.errors.join(','));
                    }
                },
                scope: this
            });

            return deferred;
        }

});
