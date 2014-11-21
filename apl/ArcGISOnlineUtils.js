define([
  "dojo/_base/declare",
  "dojo/Evented",
  "dojo/ready",
  "dojo/json",
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/_base/Deferred",
  "dojo/promise/all",
  "esri/geometry/webMercatorUtils",
  "esri/geometry/Extent",
  "esri/tasks/GeometryService",
  "esri/tasks/ProjectParameters",
  "esri/SpatialReference",
  "esri/request",
  "esri/IdentityManager"
], function (declare, Evented, ready, json, lang, array, Deferred, all, webMercatorUtils, Extent, GeometryService, ProjectParameters, SpatialReference, esriRequest) {

  var ArcGISOnlineUtils = declare([Evented], {

    /**
     *
     * @param config
     */
    constructor: function (config) {
      declare.safeMixin(this, config);
      if(this.portalUser) {
        this.createNewFolder = lang.hitch(this, this.createNewFolder);
        this.registerServices = lang.hitch(this, this.registerServices);
        this.shareItems = lang.hitch(this, this.shareItems);
      } else {
        this.portalUser = null;
      }
    },

    /**
     *
     * @param newFolderName
     * @returns {Deferred.promise}
     */
    createNewFolder: function (newFolderName) {
      var deferred = new Deferred();

      if(this.portalUser) {
        var contentParams = {
          title: newFolderName
        };
        var proxyParams = {
          usePost: true
        };
        var createFolderUrl = lang.replace('{portal.url}/sharing/rest/content/users/{username}/createFolder', this.portalUser);

        this._makeRequest(createFolderUrl, contentParams, proxyParams).then(lang.hitch(this, function (response) {
          if(response.success) {
            deferred.resolve(response);
          } else {
            deferred.reject(response.error);
          }
        }), deferred.reject);

      } else {
        deferred.reject(new Error('You need to sign in to ' + this.portalUser.portal.name));
      }

      return deferred.promise;
    },

    /**
     *
     * @param arcGISServerUrl
     * @param selectedServiceItems
     * @param registerSubLayers
     * @param selectedFolderItem
     * @param shareItemsAsPublic
     * @returns {Deferred.promise}
     */
    registerServices: function (arcGISServerUrl, selectedServiceItems, registerSubLayers, selectedFolderItem, shareItemsAsPublic) {
      var deferred = new Deferred();

      if(this.portalUser) {
        // PROXY PARAMETERS //
        var proxyParams = {
          usePost: true
        };

        // ADD ITEM URL //
        var addItemUrl = lang.replace('{portal.url}/sharing/rest/content/users/{username}/{folderId}/addItem', lang.mixin(this.portalUser, {folderId: selectedFolderItem.id}));

        // REGISTER SERVICES DEFERRED ARRAY //
        var registerServicesDeferredsArray = array.map(selectedServiceItems, lang.hitch(this, function (serviceItem) {

          console.log("BEFORE- serviceItem- ", serviceItem);

          // GET SERVICE INFO //
          return this._makeRequest(serviceItem.url).then(lang.hitch(this, function (serviceInfo) {

            console.log("AFTER-  serviceInfo- ", serviceInfo);


            // GEOGRAPHIC EXTENT //
            return this.getGeographicExtentAsString(serviceInfo).then(lang.hitch(this, function (extentStr) {

              // COPYRIGHT //
              var copyrightText = [];
              if(serviceInfo.copyrightText && serviceInfo.copyrightText.length > 0) {
                copyrightText.push(serviceInfo.copyrightText);
              }
              if(serviceItem.licenseInfo && serviceItem.licenseInfo.length > 0) {
                copyrightText.push(serviceItem.licenseInfo);
              }

              // CONTENT PARAMETERS //
              var contentParams = {
                url: serviceItem.url,
                type: this._typeNameConversion(serviceItem.type),
                typeKeywords: this._serverTypeToTypeKeywords(serviceItem.type).join(","),
                title: serviceItem.serviceName,
                description: serviceInfo.serviceDescription || "",
                snippet: serviceInfo.description || "",
                tags: serviceItem.tags ? serviceItem.tags : "",
                spatialReference: json.stringify(serviceInfo.spatialReference),
                accessInformation: serviceItem.accessInformation || "",
                licenseInfo: copyrightText.join(","),
                extent: extentStr
              };
              contentParams.thumbnailUrl = this.getThumbnailUrl(contentParams);

              // ADD ITEM //
              return this._makeRequest(addItemUrl, contentParams, proxyParams).then(lang.hitch(this, function (registerServiceResponse) {

                // SUB-LAYER REGISTRATION //
                if(registerSubLayers && serviceInfo.supportsDynamicLayers) {
                  this.registerSubLayers(addItemUrl, proxyParams, lang.mixin({}, contentParams), lang.mixin({}, serviceInfo), shareItemsAsPublic).then(lang.hitch(this, function () {
                    alert("SubLayers are registered as new items");
                  }), lang.hitch(this, function (error) {
                    console.warn(error);
                  }));
                } else {
                  alert("Can't register sub-layers; this service doesn't support dynamic rendering: " + serviceItem.serviceName);
                }

                return lang.mixin(serviceItem, {
                  itemId: (registerServiceResponse.success) ? registerServiceResponse.id : ""
                });

              }), lang.hitch(this, function (error) {
                console.warn(error);
                return {error: error};
              }));

            }), lang.hitch(this, function (error) {
              console.warn(error);
              return {error: error};
            }));
          }));
        }));

        // RESOLVE WHEN ALL REGISTER SERVICES DEFERREDS HAVE RESOLVED //
        all(registerServicesDeferredsArray).then(lang.hitch(this, function (registeredItems) {
          if(shareItemsAsPublic) {
            this.shareItems(registeredItems).then(lang.hitch(this, function (evt) {
              deferred.resolve(registeredItems);
            }), lang.hitch(this, function (error) {
              console.warn(error);
              deferred.reject(error);
            }));
          } else {
            deferred.resolve(registeredItems);
          }
        }), lang.hitch(this, function (error) {
          console.warn(error);
          deferred.reject(error);
        }));

      } else {
        deferred.reject(new Error('You need to sign in to ' + this.portalUser.portal.name));
      }

      return deferred.promise;
    },

    /**
     *
     * @param serviceInfo
     * @returns {Deferred.promise}
     */
    getGeographicExtentAsString: function (serviceInfo) {
      var deferred = new Deferred();

      // EXTENT TEMPLATE //
      var extentTemplate = "{xmin},{ymin},{xmax},{ymax}";

      // INITIAL/FULL EXTENT INFO FROM SERVICE //
      var serviceExtentJson = (serviceInfo.initialExtent || serviceInfo.fullExtent);
      if(serviceExtentJson) {
        var serviceExtent = new Extent(serviceExtentJson);
        // WGS84 //
        if(serviceExtent.spatialReference.wkid === 4326) {
          deferred.resolve(lang.replace(extentTemplate, serviceExtent));
        } else {
          // WEB MERCATOR //
          if(serviceExtent.spatialReference.isWebMercator()) {
            deferred.resolve(lang.replace(extentTemplate, webMercatorUtils.webMercatorToGeographic(serviceExtent)));
          } else {
            // OTHER //
            var geomService = new GeometryService("http://tasks.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer");
            var projectParams = new ProjectParameters();
            projectParams.geometries = [serviceExtent];
            projectParams.outSR = new SpatialReference(4326);
            geomService.project(projectParams).then(lang.hitch(this, function (projectedGeoms) {
              deferred.resolve(lang.replace(extentTemplate, projectedGeoms[0]));
            }), lang.hitch(this, function (error) {
              console.warn(error);
              deferred.reject(error);
            }));
          }
        }
      } else {
        // DEFAULT TO WORLD //
        deferred.resolve("-180.0,-90.0,180.0,90.0");
      }

      return deferred.promise;
    },

    /**
     *
     * @param addItemUrl
     * @param proxyParams
     * @param contentParams
     * @param serviceInfo
     * @param shareItemsAsPublic
     * @returns {Deferred.promise}
     */
    registerSubLayers: function (addItemUrl, proxyParams, contentParams, serviceInfo, shareItemsAsPublic) {
      var deferred = new Deferred();

      /**
       *
       * @param id
       * @returns {esri.layers.LayerInfo}
       * @private
       */
      var __getSubLayer = lang.hitch(this, function (id) {
        var foundSubLayerInfos = array.filter(serviceInfo.layers, lang.hitch(this, function (subLayerInfo) {
          return (subLayerInfo.id === id);
        }));
        if(foundSubLayerInfos.length > 0) {
          return foundSubLayerInfos[0];
        } else {
          return null;
        }
      });

      /**
       *
       * @param groupLayerInfo
       * @param subLayers
       * @returns {esri.layers.LayerInfo[]}
       * @private
       */
      var __getAllSubLayers = lang.hitch(this, function (groupLayerInfo, subLayers) {
        array.forEach(groupLayerInfo.subLayerIds, lang.hitch(this, function (subLayerId) {
          var subLayerInfo = __getSubLayer(subLayerId);
          if(subLayerInfo) {
            if(subLayerInfo.subLayerIds != null) {
              __getAllSubLayers(subLayerInfo, subLayers);
            } else {
              subLayers.push(subLayerInfo);
            }
          }
        }));
      });

      var topLevelLayerInfos = array.filter(serviceInfo.layers, lang.hitch(this, function (layerInfo) {
        return (layerInfo.parentLayerId === -1)
      }));

      var registerSubLayersDeferreds = array.map(topLevelLayerInfos, lang.hitch(this, function (topLevelLayerInfo) {

        var visibleLayers = [topLevelLayerInfo.id];
        var dynamicLayers = [lang.mixin(topLevelLayerInfo, {
          "layerDefinition": {
            "source": {
              "type": "mapLayer",
              "mapLayerId": topLevelLayerInfo.id
            }
          }
        })];

        if(topLevelLayerInfo.subLayerIds != null) {
          var allSubLayers = [];
          __getAllSubLayers(topLevelLayerInfo, allSubLayers);
          var subLayerIds = array.map(allSubLayers, function (subLayer) {
            return subLayer.id;
          });
          visibleLayers = visibleLayers.concat(subLayerIds);
          var dynamicSubLayers = array.map(allSubLayers, function (subLayer) {
            return lang.mixin(subLayer, {
              "layerDefinition": {
                "source": {
                  "type": "mapLayer",
                  "mapLayerId": subLayer.id
                }
              }
            })
          });
          dynamicLayers = dynamicLayers.concat(dynamicSubLayers)
        }
        //console.log(contentParams,topLevelLayerInfo);


        //this.getGeographicExtentAsString(serviceInfo).then(lang.hitch(this, function (extentStr) {

        // SUB-LAYER CONTENT PARAMS //
        var subLayerContentParams = lang.mixin({}, contentParams);
        subLayerContentParams.title = contentParams.title + " - " + topLevelLayerInfo.name;
        subLayerContentParams.text = json.stringify({
          layers: dynamicLayers,
          visibleLayers: visibleLayers
        });

        subLayerContentParams.thumbnailUrl = this.getThumbnailUrl(subLayerContentParams, visibleLayers);

        return this._makeRequest(addItemUrl, subLayerContentParams, proxyParams).then(lang.hitch(this, function (registerServiceResponse) {
          return lang.mixin({}, {
            itemId: (registerServiceResponse.success) ? registerServiceResponse.id : ""
          });
        }), lang.hitch(this, function (error) {
          console.warn(error);
          return {error: error};
        }));

      }));

      /**
       *
       */
      all(registerSubLayersDeferreds).then(lang.hitch(this, function (registeredItems) {
        if(shareItemsAsPublic) {
          this.shareItems(registeredItems).then(deferred.resolve, deferred.reject);
        } else {
          deferred.resolve();
        }
      }), lang.hitch(this, function (error) {
        console.warn(error);
        deferred.reject(error);
      }));

      return deferred.promise;
    },

    /**
     *
     * @param contentParams
     * @param visibleLayers
     * @returns {string}
     */
    getThumbnailUrl: function (contentParams, visibleLayers) {

      var extraParams = ["transparent=true"];
      if(visibleLayers) {
        extraParams.push(lang.replace("layers=show:{0}", [visibleLayers.join(",")]));
      }

      var printContent = {
        "format": "png",
        "size": "200,133",
        "nbbox": contentParams.extent,
        "bbox": contentParams.extent,
        "sr": "4326",
        "cm": 0.0,
        "services": [
          {
            "service": contentParams.url,
            "extra": extraParams.join("&"),
            "wrap": true,
            "opacity": 0.8
          }
        ]
      };

      // PORTAL PRINT SERVICE URL //
      var printServiceUrl = lang.replace("{url}/sharing/tools/print?json=", this.portalUser.portal);

      // ENCODE FULL PRINT URL //
      return encodeURI(printServiceUrl) + encodeURIComponent(json.stringify(printContent));
    },

    /**
     *
     * @param serviceItems
     * @returns {Deferred.promise}
     */
    shareItems: function (serviceItems) {
      var deferred = new Deferred();

      if(this.portalUser) {
        var validItems = array.filter(serviceItems, function (item) {
          return (item && (!item.hasOwnProperty("error")));
        });
        // ITEM IDS //
        var itemIds = array.map(validItems, function (validItem) {
          return validItem.itemId;
        });
        // PROXY PARAMS //
        var proxyParams = {
          usePost: true
        };
        // CONTENT PARAMS //
        var contentParams = {
          everyone: true,
          items: itemIds.join(','),
          groups: []
        };
        // SHARE ITEMS URL //
        var shareItemsUrl = lang.replace('{portal.url}/sharing/rest/content/users/{username}/shareItems', this.portalUser);

        // RESOLVE AFTER SHARE ITEMS //
        this._makeRequest(shareItemsUrl, contentParams, proxyParams).then(deferred.resolve, deferred.reject);

      } else {
        deferred.reject(new Error('You need to sign in to ' + this.portalUser.portal.name));
      }

      return deferred.promise;
    },

    /**
     * CONVERT ARCGIS SERVER SERVICE TYPE TO PORTAL TYPEKEYWORD
     *
     * @param serverType
     * @returns {*}
     * @private
     */
    _serverTypeToTypeKeywords: function (serverType) {

      var typeKeywords = null;
      switch (serverType) {
        case 'MapServer':
          typeKeywords = ['Data', 'Service', 'Map Service', 'ArcGIS Server'];
          break;
        case 'GeocodeServer':
          typeKeywords = ['Tool', 'Service', 'Geocoding Service', 'Locator Service', 'ArcGIS Server'];
          break;
        case 'GPServer':
          typeKeywords = ['Tool', 'Service', 'Geoprocessing Service', 'ArcGIS Server'];
          break;
        case 'GeometryServer':
          typeKeywords = ['Tool', 'Service', 'Geometry Service', 'ArcGIS Server'];
          break;
        case 'ImageServer':
          typeKeywords = ['Data', 'Service', 'Image Service', 'ArcGIS Server'];
          break;
        case 'NAServer':
          typeKeywords = ['Tool', 'Service', 'Network Analysis Service', 'ArcGIS Server'];
          break;
        case 'FeatureServer':
          typeKeywords = ['Data', 'Service', 'Feature Service', 'ArcGIS Server', 'Feature Access'];
          break;
        case 'GeoDataServer':
          typeKeywords = ['Data', 'Service', 'Geodata Service', 'ArcGIS Server'];
          break;
        case 'GlobeServer':
          typeKeywords = ['Data', 'Service', 'Globe Service', 'ArcGIS Server'];
          break;
        default:
          typeKeywords = null;
          break;
      }
      return typeKeywords;

    },

    /**
     * CONVERT FROM ARCGIS SERVER SERVICE TYPE TO PORTAL TYPE
     *
     * @param serverType
     * @returns {*}
     * @private
     */
    _typeNameConversion: function (serverType) {
      var arcGISComType = null;
      switch (serverType) {
        case 'MapServer':
          arcGISComType = 'Map Service';
          break;
        case 'GeocodeServer':
          arcGISComType = 'Geocoding Service';
          break;
        case 'GPServer':
          arcGISComType = 'Geoprocessing Service';
          break;
        case 'GeometryServer':
          arcGISComType = 'Geometry Service';
          break;
        case 'ImageServer':
          arcGISComType = 'Image Service';
          break;
        case 'NAServer':
          arcGISComType = 'Network Analysis Service';
          break;
        case 'FeatureServer':
          arcGISComType = 'Feature Service';
          break;
        case 'GeoDataServer':
          arcGISComType = 'Geodata Service';
          break;
        case 'GlobeServer':
          arcGISComType = 'Globe Service';
          break;
        default:
          arcGISComType = null;
          break;
      }
      return arcGISComType;
    },

    /**
     *
     * @param requestUrl
     * @param contentParams
     * @param proxyParams
     * @returns {*}
     * @private
     */
    _makeRequest: function (requestUrl, contentParams, proxyParams) {
      return esriRequest({
        url: requestUrl,
        content: lang.mixin(contentParams || {}, {
          f: 'json'
        })
      }, proxyParams || {});
    }

  });

  /**
   *
   */
  return ArcGISOnlineUtils;
});


