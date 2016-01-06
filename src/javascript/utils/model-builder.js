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
                    loadUserPermissions: function() {
                        this.logger.log('loadUserPermissions', this.get('UserName'), this);
                        //This is where we set the new user permissions
                        //this.myLoadPermissionsfunctionwithapromise().then(assign the permissions to the userpermission field)


                        this.set('__userPermissions', ['Permissions1','Permissions2','Permissions3']);

                    }

                });
                /**
                 * End model definition
                 */

                deferred.resolve(new_model);
            }
        });
        return deferred;
    }
});