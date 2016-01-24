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
        this._myMask = new Ext.LoadMask(Ext.getBody(), {msg:"Please wait.This may take long depending on the size of your data..."});
        this._myMask.show();
        var me = this;
        me.setLoading("Loading stuff...");
        this._loadAllStoresAndProcessData().then({
            scope: this,
            success: function(store) {
                console.log('store on succe',store);
                this._myMask.hide();
                this._displayGrid(store);
            },
            failure: function(error_message){
                alert(error_message);
            }
        }).always(function() {
            me.setLoading(false);
        });
    },
    

    _displayGrid: function(store){
      console.log('store before createing the grid',store);
      this._grid = this.down('#container_body').add({
            xtype: 'rallygrid',
            store: store,
            //showPagingToolbar: false,
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
                            if(UserPermission.get('_type') == 'projectpermission' || UserPermission.get('_type') == 'workspacepermission' ){
                             text.push(UserPermission.get('Role') );
                            }else{
                            text.push('NA');
                            }

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
                    flex: 1
                },
                {
                    text: 'Last Login Date', 
                    dataIndex: 'LastLoginDate',
                    flex: 1
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

 _loadAllStoresAndProcessData: function(){
        var me = this;
        //get All users
        console.log('Inside _loadAllStoresAndProcessData');
        var deferred = Ext.create('Deft.Deferred');

        //Deft.Chain.sequence
        Deft.Promise.all([me._getAllUsers(), me._getAllWorkspaces(), me._getAllProjects()]).then({
            success: function(results){
                console.log('All arrays',results);
                var users = []
                _.each(results[0],function(user){

                    if((user.get('SubscriptionPermission')=='Subscription Admin') || (user.get('SubscriptionPermission')=='No Access')){
                            var userWithPermission = {
                                FullName: user.get('FirstName') + ' ' +user.get('LastName'),
                                UserName: user.get('UserName'),
                                SubscriptionPermission: user.get('SubscriptionPermission'),
                                Role: user.get('Role'),
                                CreationDate: user.get('CreationDate'),
                                LastLoginDate: user.get('LastLoginDate'),
                                UserPermission: null
                            }
                            users.push(userWithPermission);
                            return;
                    }


                    _.each(results[1],function(workspace){
                        if(user.get('ObjectID')==workspace.get('User').ObjectID){
                            var userWithPermission = {
                                FullName: user.get('FirstName') + ' ' +user.get('LastName'),
                                UserName: user.get('UserName'),
                                SubscriptionPermission: user.get('SubscriptionPermission'),
                                Role: user.get('Role'),
                                CreationDate: user.get('CreationDate'),
                                LastLoginDate: user.get('LastLoginDate'),
                                UserPermission: workspace
                            }
                            users.push(userWithPermission);
                        }
                    });

                    //match any projects to user
                    _.each(results[2],function(project){
                        if(user.get('ObjectID')==project.get('User').ObjectID){
                            var userWithPermission = {
                                FullName: user.get('FirstName') + ' ' +user.get('LastName'),
                                UserName: user.get('UserName'),
                                SubscriptionPermission: user.get('SubscriptionPermission'),
                                Role: user.get('Role'),
                                CreationDate: user.get('CreationDate'),
                                LastLoginDate: user.get('LastLoginDate'),
                                UserPermission: project
                            }
                            users.push(userWithPermission);

                        }
                    });


                });

                console.log('Users!!>>',users);
                var store = Ext.create('Rally.data.custom.Store', {
                    data: users,
                    scope: me
                });
                console.log('Initial store',store);    
                deferred.resolve(store);
            },
            failure: function(){},
            scope: me
        });
            return deferred.promise;

    },


    _getAllUsers: function(){
        var me = this;
        var deferred = Ext.create('Deft.Deferred');
 
        var users = Ext.create('Rally.data.wsapi.Store',{
            model: 'User',
            limit: Infinity,
            scope: me
            

        }).load({
            callback: function(records,operation,successful){
                deferred.resolve(records);
            }
        });

        return deferred.promise;

    },

    _getAllProjects: function(){
        var me = this;
        var deferred = Ext.create('Deft.Deferred');

        var projectPermission = Ext.create('Rally.data.wsapi.Store',{
            model: 'ProjectPermission',
            limit: Infinity,
            scope: me
        }).load({
            callback: function(records,operation){
                deferred.resolve(records);
            }
        });
        return deferred.promise;
    },

    _getAllWorkspaces: function(){
        var me = this;
        var deferred = Ext.create('Deft.Deferred');

        var workspacePermission = Ext.create('Rally.data.wsapi.Store',{
            model: 'WorkspacePermission',
            limit: Infinity,
            scope: me
        }).load({
            callback: function(records,operation){
                deferred.resolve(records);
            }
        });

        return deferred.promise;
    }


});
