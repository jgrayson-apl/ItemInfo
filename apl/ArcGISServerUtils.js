define([
  "dojo/_base/declare",
  "dojo/Evented",
  "dojo/ready",
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/_base/Deferred",
  "dojo/promise/all",
  "esri/request"
], function (declare, Evented, ready, lang, array, Deferred, all, esriRequest) {

  var ArcGISServerUtils = declare([Evented], {

    constructor: function (config) {
      declare.safeMixin(this, config);
      ready(lang.hitch(this, function () {

        this._connected = false;
        this._agsServer = null;
        this._agsInstance = null;
        this._servicesDirectoryUrl = null;
        this._serverInfo = null;

        this.connect = lang.hitch(this, this.connect);
        this.getServicesInfo = lang.hitch(this, this.getServicesInfo);

        this.emit("load", {});
      }));
    },

    /**
     *
     * @param requestUrl
     * @returns {*}
     * @private
     */
    _makeRequest: function (requestUrl) {
      return esriRequest({
        url: requestUrl,
        content: {
          f: "json"
        },
        handleAs:"json"
      });
    },

    /**
     *
     * @param agsServer
     * @param instance
     * @param servicesDirectoryUrl
     * @returns {Deferred.promise|*}
     */
    connect: function (agsServer, instance, servicesDirectoryUrl) {
      var deferred = new Deferred();

      this._connected = false;
      this._agsServer = null;
      this._agsInstance = null;
      this._servicesDirectoryUrl = null;
      this._serverInfo = null;

      if(this.connectHandle) {
        this.connectHandle.cancel();
        this.connectHandle = null;
      }

      // CONNECT TO SERVICES DIRECTORY //
      this.connectHandle = this._makeRequest(servicesDirectoryUrl).then(lang.hitch(this, function (serverInfo) {
        this._connected = true;
        this._agsServer = agsServer;
        this._agsInstance = instance;
        this._servicesDirectoryUrl = servicesDirectoryUrl;
        this._serverInfo = serverInfo;
        deferred.resolve(serverInfo);
      }), lang.hitch(this, function (error) {
        deferred.reject(error);
      }));

      return deferred.promise;
    },

    /**
     *
     */
    disconnect: function () {

      this._connected = false;
      this._agsServer = null;
      this._agsInstance = null;
      this._servicesDirectoryUrl = null;
      this._serverInfo = null;

      if(this.connectHandle) {
        this.connectHandle.cancel();
        this.connectHandle = null;
      }

    },

    /**
     *
     * @returns {*}
     */
    getServerInfo: function () {
      return this._connected ? lang.mixin({
        agsServer: this._agsServer,
        agsInstance: this._agsInstance,
        url: this._servicesDirectoryUrl
      }, this._serverInfo) : null;
    },

    /**
     *
     * @param {String} folderName
     * @param {Boolean} includeSubLayerDetails
     * @returns {Deferred.promise}
     */
    getServicesInfo: function (folderName, includeSubLayerDetails) {
      var deferred = new Deferred();

      // ARE WE CONNECTED TO THE SERVICES DIRECTORY //
      if(this._connected) {
        // SERVER FOLDER URL //
        var folderUrl = lang.replace("{0}/{1}", [this._servicesDirectoryUrl, folderName]);
        // GET SERVICES IN FOLDER //
        this._makeRequest(folderUrl).then(lang.hitch(this, function (response) {
          var serviceInfosDeferreds = array.map(response.services, lang.hitch(this, function (serviceInfo) {

            // SERVER URL //
            serviceInfo.serverUrl = this._servicesDirectoryUrl;

            // MORE INFO //
            lang.mixin(serviceInfo, {
              id: lang.replace("{name}/{type}", serviceInfo),
              url: lang.replace("{serverUrl}/{name}/{type}", serviceInfo),
              folderUrl: folderUrl,
              serviceName: (folderName ? serviceInfo.name.substr(serviceInfo.name.indexOf("/") + 1) : serviceInfo.name),
              tags: "",
              accessInformation: "",
              licenseInfo: "",
              itemId: ""
            });

            // SERVICE DETAILS //
            return this.getServiceDetails(serviceInfo, includeSubLayerDetails).then(lang.hitch(this, function (serviceDetails) {
              // SERVICE DETAILS //
              return lang.mixin(serviceInfo, serviceDetails);
            }));

          }));

          all(serviceInfosDeferreds).then(deferred.resolve, deferred.reject);

        }), deferred.reject);
      } else {
        deferred.reject(new Error('Not connected to Services Directory...'));
      }
      return deferred.promise;
    },

    /**
     *
     * @param {*} serviceInfo
     * * @param {Boolean} includeSubLayerDetails
     */
    getServiceDetails: function (serviceInfo, includeSubLayerDetails) {
      var deferred = new Deferred();

      // ARE WE CONNECTED TO THE SERVICES DIRECTORY //
      if(this._connected) {

        // GET SERVICE DETAILS //
        this._makeRequest(serviceInfo.url).then(lang.hitch(this, function (serviceDetails) {
          if(serviceDetails.layers && includeSubLayerDetails) {
            this.getServiceLayersDetails(serviceInfo, serviceDetails).then(lang.hitch(this, function (serviceDetails) {
              deferred.resolve(serviceDetails);
            }), lang.hitch(this, function (error) {
              console.warn(error);
              deferred.reject(error);
            }));
          } else {
            deferred.resolve(serviceDetails);
          }
        }), lang.hitch(this, function (error) {
          console.warn(error);
          deferred.reject(error);
        }));
      } else {
        deferred.reject(new Error('Not connected to Services Directory...'));
      }

      return deferred.promise;
    },

    /**
     *
     * @param serviceInfo
     * @param serviceDetails
     * @returns {Deferred.promise}
     */
    getServiceLayersDetails: function (serviceInfo, serviceDetails) {
      var deferred = new Deferred();

      // ARE WE CONNECTED TO THE SERVICES DIRECTORY //
      if(this._connected) {
        if(this._serverInfo.currentVersion > 10) {
          // GET SERVICE LAYERS DETAILS //
          this._makeRequest(serviceInfo.url + "/layers").then(lang.hitch(this, function (allLayersInfo) {
            serviceDetails = lang.mixin(serviceDetails, allLayersInfo);
            deferred.resolve(serviceDetails);
          }), lang.hitch(this, function (error) {
            console.warn(error);
            deferred.reject(error);
          }));
        } else {
          // GET SERVICE SUB-LAYER DETAILS //
          var subLayerDetailsDeferred = array.map(serviceDetails.layers, lang.hitch(this, function (subLayerInfo) {
            return this.getServiceSubLayerDetails(serviceInfo, subLayerInfo.id).then(lang.hitch(this, function (subLayerDetails) {
              lang.mixin(subLayerInfo, subLayerDetails);
            }), lang.hitch(this, function (error) {
              console.warn(error);
            }));
          }));
          all(subLayerDetailsDeferred).then(lang.hitch(this, function () {
            deferred.resolve(serviceDetails);
          }), lang.hitch(this, function (error) {
            console.warn(error);
            deferred.reject();
          }));
        }
      } else {
        deferred.reject(new Error('Not connected to Services Directory...'));
      }
      return deferred.promise;
    },

    /**
     *
     * @param serviceInfo
     * @param subLayerId
     * @returns {Deferred.promise}
     */
    getServiceSubLayerDetails: function (serviceInfo, subLayerId) {
      var deferred = new Deferred();

      // ARE WE CONNECTED TO THE SERVICES DIRECTORY //
      if(this._connected) {
        // GET SERVICE SUB-LAYER DETAILS //
        this._makeRequest(serviceInfo.url + "/" + subLayerId).then(deferred.resolve, deferred.reject);

      } else {
        deferred.reject(new Error('Not connected to Services Directory...'));
      }
      return deferred.promise;
    }

  });

  return ArcGISServerUtils;
});

