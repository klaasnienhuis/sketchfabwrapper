
var sketchfabwrapper = {
    api: null,
    nodeMap:[],
    sceneGraph:null,
    textureList: [],
    materialList: [],
    
    getNodeMap: function(){
        this.api.getNodeMap(function(err,nodes){
            sketchfabwrapper.nodeMap = nodes;
        });
    },
    
    //get the scenegraph from the scene and add the parents to each node
    getSceneGraph: function(){
        this.api.getSceneGraph(function(err,graph){
            sketchfabwrapper.sceneGraph = graph;
            sketchfabwrapper.addSceneGraphFoodchain(sketchfabwrapper.sceneGraph,null);
        });
    },
    
    setAnimation: function(idx){
        this.api.getAnimations(function(err,animations){
            sketchfabwrapper.setAnimationCallback(animations,idx)
        });
    },
    
    setAnimationCallback: function(animations,idx){
        if (animations.length > idx){
            var animationUid = animations[idx][0];
            this.api.setCurrentAnimationByUID(animationUid,function(err){
            });
        }
    },
    
    //go over the scenegraph and add the parent to each node
    addSceneGraphFoodchain: function(currentNode,parentNode){
        if (parentNode !== null){
            currentNode.parent = parentNode
        };
     
        if (currentNode.hasOwnProperty('children')){
            currentNode.children.some(child => sketchfabwrapper.addSceneGraphFoodchain(child, currentNode));
        };
    },
    
    //get a node from the graph with a specific instanceID
    getNodeFromGraphByID: function(currentNode, instanceID){
        if (currentNode.instanceID === instanceID) {
            return currentNode;
        }
        if (currentNode.hasOwnProperty('children')){
            var node;
            currentNode.children.some(child => node = sketchfabwrapper.getNodeFromGraphByID(child, instanceID));
            return node;        
        }
    },

    //get a node from the graph with a specific name and type
    getNodeFromGraphByName: function(currentNode, theName, theType, theResult){
        if (currentNode.name === theName && currentNode.type === theType) {
            console.log('currentNode',currentNode);
            theResult.push(currentNode);
        }
        if (currentNode.hasOwnProperty('children')){
            currentNode.children.forEach(function(child){
                sketchfabwrapper.getNodeFromGraphByName(child, theName, theType, theResult)
            });
        }
    },

    getTextureList: function(callback){
        this.api.getTextureList(function(err,textures){
            sketchfabwrapper.textureList = textures;
            callback();
        });
    },
    
    getMaterialList: function(callback){
        this.api.getMaterialList( function( err, materials ) {
            sketchfabwrapper.materialList = materials;
            if (callback != null) callback();
        });
    },
    
    getTextureByName: function(textureName){
        var textureUid = null;
        for (var n = 0; n < sketchfabwrapper.textureList.length; n++){
            if (sketchfabwrapper.textureList[n].name.indexOf(textureName) > -1){
                textureUid = sketchfabwrapper.textureList[n].uid;
            }
        }
        return textureUid;
    },
    
    filterNodeMapExactName: function(map, nodeName) {
        var items = []
        Object.keys(map).forEach(function(key,index) {
            if ((map[key].type == "MatrixTransform" || map[key].type == "Group") && map[key].name != undefined && map[key].name.toLowerCase() == nodeName.toLowerCase()){

                items.push(map[key])
            }
        });
        return items;
    },

    //after a click event, sketchfab returns a modified objectname. this method
    //iterates over the parent objects and tries to get the name from them
    getNodeNameById: function(instanceID, callback){
        
        var clickedNode = this.getNodeFromGraphByID(this.sceneGraph,instanceID);
        console.log('clickedNode',clickedNode);
        if (clickedNode !== undefined && clickedNode.parent.type === 'Group'){
            return clickedNode.parent.name;
        }

    },

    
    MakeTexture: function(uid){
        var texture = {
            magFilter: "LINEAR",
            minFilter: "LINEAR_MIPMAP_LINEAR",
            wrapS: "REPEAT",
            wrapT: "REPEAT",
            textureTarget: "TEXTURE_2D",
            internalFormat: "RGB",
            texCoordUnit: 0,
            uid: uid
        }
        return texture
    },

    ResetToMetalnessMaterial: function(material){
        //first disable each channel
        Object.keys(material.channels).forEach(function(channel,index) {
            material.channels[channel].enable = false
        });
        
        //then enable just the ones needed for a metalness material
        material.channels.AlbedoPBR.enable = true
        material.channels.AlbedoPBR.color = [1,1,1]
        material.channels.AlbedoPBR.factor = 1.0
        delete material.channels.AlbedoPBR.texture
        
        material.channels.MetalnessPBR.enable = true
        material.channels.MetalnessPBR.factor = 0.0
        delete material.channels.MetalnessPBR.texture
        
        material.channels.SpecularF0.enable = true
        material.channels.SpecularF0.factor = 0.4
        delete material.channels.SpecularF0.texture
        
        material.channels.GlossinessPBR.enable = true
        material.channels.GlossinessPBR.factor = 0.5
        delete material.channels.GlossinessPBR.texture
    },

    
    getNodeById: function(instanceID, callback) {
        var self = this;
        self.api.getNodeMap( function( err, nodes ) {
            if ( !err ) {
                Object.keys(nodes).forEach(function(key,index) {
                    if (nodes[key].instanceID == instanceID){
                        var node = nodes[key]
                        callback(node);
                    }
                });
            }
        });
    },

    filterNodeMapContainsName: function(map, nodeName) {
        var items = []
        Object.keys(map).forEach(function(key,index) {
            if ((map[key].type == "MatrixTransform" || map[key].type == "Group") && map[key].name != undefined && map[key].name.toLowerCase().indexOf(nodeName.toLowerCase()) == 0){

                items.push(map[key])
            }
        });
        return items;
    },

    SetObjectVisibility: function(namePattern, doShow, matchNameExactly) {
        var self = this;
        self.api.getNodeMap( function( err, nodes ) {
            if (err) {
                console.log('Error getting nodes');
                return;
            }else
            {
                var matchedNodeArray = [];
                var patternArray = namePattern.split(','); //the objectnames may be supplied as a comma separated string

                //first find the nodes
                for (var n = 0; n<patternArray.length;n++){
                    var matches;
                    if (matchNameExactly){
                        matches = self.filterNodeMapExactName(nodes, namePattern)
                    }else{
                        matches = self.filterNodeMapContainsName(nodes, namePattern)
                    }
                    matchedNodeArray = matchedNodeArray.concat(matches);
                }

                //then hide or show them
                for (var n = 0; n<matchedNodeArray.length;n++){
                    if (doShow) {
                        self.api.show(matchedNodeArray[n].instanceID);
                    }else{
                        self.api.hide(matchedNodeArray[n].instanceID);
                    }
                }
            }
        });
    },

    GetView: function(){
        // Print the current view as an view object we can send to sketchfab
        this.api.getCameraLookAt( function( err, camera ){
            console.log( 'View: {\n\teye: [%s,%s,%s],\n\tlookat: [%s,%s,%s]\n}',camera.position[0].toFixed(2),camera.position[1].toFixed(2),camera.position[2].toFixed(2),camera.target[0].toFixed(2),camera.target[1].toFixed(2),camera.target[2].toFixed(2) );
        });
    },

    SetView: function (eye, lookat, duration, callback) {
        //eye and lookat each are an array of three floats
        this.api.lookat(
            eye,
            lookat,
            duration,function(err){
                if (callback != null) {
                    callback()
                }
            });
    },
    
    SetFov: function (angle,callback) {
        this.api.setFov(angle,function(err,angle){
            if (callback != null) {
                callback()
            }
        });
    }
};