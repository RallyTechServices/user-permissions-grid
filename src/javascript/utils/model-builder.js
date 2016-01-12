Ext.define('Rally.technicalservices.ModelBuilder',{
    singleton: true,

    build: function(modelType, newModelName) {
        var deferred = Ext.create('Deft.Deferred');

        Rally.data.ModelFactory.getModel({
            type: modelType,
            success: function(model) {

                var default_fields = [{
                    name: '__userPermissions',
                    defaultValue: []
                }];

                /**
                 * Begin model definition
                 */
                var new_model = Ext.define(newModelName, {
                    extend: model,
                    logger: new Rally.technicalservices.Logger(),
                    fields: default_fields,
                    scope:this,
                    loadUserPermissions: function() {
                        //this.logger.log('loadUserPermissions', this.get('UserName'), this);
                        //This is where we set the new user permissions
                        //this.myLoadPermissionsfunctionwithapromise().then(assign the permissions to the userpermission field)
                        this._getColleciton(this).then({
                            scope: this,
                            success: function(records){
                                this.set('__userPermissions', records);
                            },
                            failure: function(){

                            }
                        }
                        );

                    },
                    _getColleciton: function(record){
                        var deferred = Ext.create('Deft.Deferred');
                                record.getCollection('UserPermissions').load({
                                        fetch: ['Role', 'Name', '_type'],
                                        callback: function(records, operation, success) {
                                            deferred.resolve(records);
                                        }

                                });   
                        return deferred;
                    }

                });
                /**
                 * End model definition
                 */

                deferred.resolve(new_model);
            },

            
        });
        return deferred;
    }
});