 /**  
  * @class davinci.model.resource.Folder
    * @constructor 
    * @extends davinci.model.resource.Resource
  */
define([
	"dojo/_base/declare",
	"davinci/Runtime",
	"davinci/model/resource/Resource",
	"davinci/model/resource/File"
], function(declare, Runtime, Resource, File) {

var Folder = declare("davinci.model.resource.Folder", Resource, {

	constructor: function(name, parent) {
		this.elementType = "Folder";
		this.name = name;
		this.parent = parent;
	},

	reload: function(){
		// mark this folder as dirty and reload it next time
		this._isLoaded = false;
	},

	createResource: function(name, isFolder, localOnly) {
		
		var file;
		if (name != null) {
			file = isFolder ? new Folder(name, this) : new File(name, this);
		} else {
			file = this;
			isFolder = this.elementType == "Folder";
		}
		return Runtime.serverJSONRequest({url:"./cmd/createResource", 
										 handleAs:"text",
										 content:{'path':file.getPath(), 
									    'isFolder': isFolder}}).then(dojo.hitch(this,function(response){
			if (response == "OK" && name != null) {
				this.children.push(file);
				delete file.libraryId;
				delete file.libVersion;
				delete file._readOnly;
				dojo.publish("/davinci/resource/resourceChanged",["created",file]);
				return file;
			} else if (response != "OK"){
				alert(response);
			} else {
				delete file.libraryId;
				delete file.libVersion;
				delete file._readOnly;
				return this;
			}

		}));
	},

	getChildren: function() {
		if (!this._isLoaded) {
			if (this._loading) {
				return this._loading;
			}
			debugger;
			this._loading=Runtime.serverJSONRequest({
				url:"./cmd/listFiles",
				content:{'path':this.getPath()}
			}).then(
				dojo.hitch(this, function(responseObject, ioArgs) {
					this._addFiles(responseObject);
					delete this._loading;
					this._isLoaded = true;
					return this.children
					
				
			}));
			return this._loading;
		}
		var childrenPromise = new dojo.Deferred();
		childrenPromise.resolve(this.children);
		return childrenPromise;
	},

	/*
	 * add files recreates the children 
	 * should refactor the naming.
	 * 
	 */
	_addFiles: function(responseObject) {
		
		this.children = [];
		this._appendFiles(responseObject);
	},

	_appendFiles: function(responseObject){
		for (var i=0; i<responseObject.length; i++) {
			var child = this.getChild(responseObject[i].name);
			var hasChild = (child!=null);

			if (responseObject[i].isDir || responseObject[i].isLib) {
				if(!hasChild) {
					child = new Folder(responseObject[i].name,this);
				}
				if (responseObject[i].isLib) {
					child.isLibrary = true;
				}
			} else {
				if(!hasChild) {
					child = new File(responseObject[i].name,this);
				}
			}
			child.link=responseObject[i].link;
			child.isNew = responseObject[i].isNew;
			child._readOnly = responseObject[i].readOnly;
			child.setDirty(responseObject[i].isDirty);
			if(responseObject[i].libraryId){
				child.libraryId = responseObject[i].libraryId;
				child.libVersion = responseObject[i].libVersion;
			}
			if(!hasChild) {
				this.children.push(child);
			}
		}
		this._isLoaded=true;

	},

	getMarkers: function(markerTypes,allChildren) {
		var result = [];
		this.visit({visit:function (resource) {
			if (resource.elementType=="File") {
				markers = resource.getMarkers(markerTypes);
				result.concat(markers);
			} else if (!allChildren) {
				return true;
			}
		}}, true);
		return result;
	},

	isLoaded : function(){
		return this._isLoaded;
	},
	/* time to make this public */
	getChild: function(name){
		if (!this.__CASE_SENSITIVE) {
			name = name.toLowerCase();
		}
		for (var j=0; j<this.children.length; j++){
			if ((this.__CASE_SENSITIVE && this.children[j].getName() == name) ||
					(!this.__CASE_SENSITIVE && this.children[j].getName().toLowerCase() == name)) {
				return this.children[j];
			}
		}
		return null;
	}

});

davinci.model.resource.root = new Folder(".", null);
return Folder;

});
  
