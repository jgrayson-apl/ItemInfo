var agsItemDetails = {
  "getTypes": function () {
    var types = [];
    for (var typeName in this) {
      if(this.hasOwnProperty(typeName) && this[typeName].data) {
        types.push(typeName);
      }
    }
    types.sort();
    return ["none"].concat(types);
  },
  "getTypeKeywords": function () {
    var typesKeywords = [];
    for (var typeName in this) {
      if(this.hasOwnProperty(typeName) && this[typeName].data) {
        var keywords = this[typeName].typeKeywords.split(',');
        for (var keywordIdx in keywords) {
          var keyword = keywords[keywordIdx];
          if(typesKeywords.indexOf(keyword) === -1) {
            typesKeywords.push(keyword);
          }
        }
      }
    }
    typesKeywords.sort();
    return ["none"].concat(typesKeywords);
  },
  "Web Map": {
    "data": "Text/JSON",
    "typeKeywords": "Web Map,Explorer Web Map,Map,Online Map,ArcGIS Online",
    "keywordRequires": "",
    "description": "Web map authored using the arcgis.com Javascript Web Map viewer. Usable by web, mobile, and desktop clients.",
    "other": ""
  },
  "CityEngine Web Scene": {
    "data": "File",
    "typeKeywords": "3D,Map,Scene,Web",
    "keywordRequires": "",
    "description": "",
    "other": ""
  },
  "Feature Service": {
    "data": "Text/JSON (optional)",
    "typeKeywords": "Data,Service,Feature Service,ArcGIS Server,Feature Access",
    "keywordRequires": "",
    "description": "ArcGIS Server Feature Service",
    "other": "The URL to the service is stored in the url property of the item. Optional JSON data contains overridden service properties."
  },
  "Map Service": {
    "data": "Text/JSON (optional)",
    "typeKeywords": "Data,Service,Map Service,ArcGIS Server",
    "keywordRequires": "",
    "description": "ArcGIS Server Map Service",
    "other": "The URL to the service is stored in the url property of the item. Optional JSON data contains overridden service properties."
  },
  "Image Service": {
    "data": "Text/JSON (optional)",
    "typeKeywords": "Data,Service,Image Service,ArcGIS Server",
    "keywordRequires": "",
    "description": "ArcGIS Server Image Service",
    "other": "The URL to the service is stored in the url property of the item. Optional JSON data contains overridden service properties."
  },
  "KML": {
    "data": "File/kmz (optional)",
    "typeKeywords": "Data,Map,KML",
    "keywordRequires": "",
    "description": "KML Network Link or KML File",
    "other": "If a file, then the data resource retrieves the file and can be used as a network link. If a network link, then the url property contains the URL for the network link."
  },
  "WMS": {
    "data": "",
    "typeKeywords": "Data,Service,Web Map Service,OGC",
    "keywordRequires": "",
    "description": "OGC Web Map Service",
    "other": "The URL to the service is stored in the url property of the item."
  },
  "Feature Collection": {
    "data": "Text/JSON",
    "typeKeywords": "Feature Collection",
    "keywordRequires": "",
    "description": "A feature collection is a saved web map feature layer with layer definition (types, symbols, fields, and so on) and a feature set (the actual features).",
    "other": ""
  },
  "Feature Collection Template": {
    "data": "Text/JSON",
    "typeKeywords": "Feature Collection,Feature Service Template,Map Notes Template",
    "keywordRequires": "",
    "description": "A feature collection that includes the layer definition component.",
    "other": ""
  },
  "Geodata Service": {
    "data": "",
    "typeKeywords": "Data,Service,Geodata Service,ArcGIS Server",
    "keywordRequires": "",
    "description": "ArcGIS Server Geodata Service",
    "other": "The URL to the service is stored in the url property of the item."
  },
  "Globe Service": {
    "data": "",
    "typeKeywords": "Data,Service,Globe Service,ArcGIS Server",
    "keywordRequires": "",
    "description": "ArcGIS Server Globe Service",
    "other": "The URL to the service is stored in the url property of the item."
  },
  "Geometry Service": {
    "data": "",
    "typeKeywords": "Tool,Service,Geometry Service,ArcGIS Server",
    "keywordRequires": "",
    "description": "ArcGIS Server Geometry Service",
    "other": "The URL to the service is stored in the url property of the item."
  },
  "Geocoding Service": {
    "data": "",
    "typeKeywords": "Tool, Service,Geocoding Service,Locator Service,ArcGIS Server",
    "keywordRequires": "",
    "description": "ArcGIS Server Geocoding Service",
    "other": "The URL to the service is stored in the url property of the item."
  },
  "Network Analysis Service": {
    "data": "",
    "typeKeywords": "Tool,Service,Network Analysis Service,ArcGIS Server",
    "keywordRequires": "",
    "description": "ArcGIS Server Network Analyst Service",
    "other": "The URL to the service is stored in the url property of the item."
  },
  "Geoprocessing Service": {
    "data": "",
    "typeKeywords": "Tool,Service,Geoprocessing Service,ArcGIS Server",
    "keywordRequires": "",
    "description": "ArcGIS Server Geoprocessing Service",
    "other": "The URL to the service is stored in the url property of the item."
  },
  "Web Mapping Application": {
    "data": "Text/JSON",
    "typeKeywords": "Web Map,Map,Online Map,Mapping Site",
    "keywordRequires": "Required: technology keywords:JavaScript Flex Silverlight Web ADF Other; Required: purpose keywords – one of:Ready To Use, Configurable, Code Sample",
    "description": "A web mapping application built using: ArcGIS API for JavaScript, ArcGIS API for Flex, ArcGIS API for Silverlight, Java Web Application Developer Framework, .NET Web Application Developer Framework",
    "other": "Client must supply the appropriate technology and purpose keywords (Ready To Use, Configurable, Code Sample) when adding this item.The URL to the service is stored in the url property of the item."
  },
  "Mobile Application": {
    "data": "Text/JSON",
    "typeKeywords": "ArcGIS Mobile Map,Mobile Application",
    "keywordRequires": "Required: technology keywords:ArcGIS for iPhoneArcGIS for AndroidArcGIS Mobile, Windows Mobile, JavaScript, FlexRequired: purpose keywords – one of:Ready To Use, Configurable, Code Sample",
    "description": "A mobile application built using the: ArcGIS for iPhone SDK, ArcGIS for Android SDK, ArcGIS Mobile SDK for the Windows Mobile Platform, JavaScript or Flex API",
    "other": "Client must supply the appropriate technology and purpose keywords (Ready To Use, Configurable, Code Sample) when adding this item.The URL to the application in the app store is stored in the url property of the item."
  },
  "Code Attachment": {
    "data": "File",
    "typeKeywords": "Code",
    "keywordRequires": "Required: one of {Web Mapping Application, Explorer, Desktop, Mobile, iPhone}; Required if WMA: one of {Javascript, Flex, Silverlight }",
    "description": "The sample code associated with an application whose purpose is code sample.",
    "other": ""
  },
  "Operations Dashboard Add In": {
    "data": "File",
    "typeKeywords": "Application,ArcGIS Operations Dashboard,Add In",
    "description": "ArcGIS Operations Dashboard Add In (opdashboardaddin)",
    "other": ""
  },
  "Operation View": {
    "data": "Text",
    "typeKeywords": "Application,ArcGIS Operations Dashboard,ArcGIS Operation View",
    "description": "",
    "other": ""
  },
  "Symbol Set": {
    "data": "Text/JSON",
    "typeKeywords": "Symbol Set",
    "description": "A symbol set"
  },
  "Color Set": {
    "data": "Text/JSON",
    "typeKeywords": "Color Set",
    "description": "A color set",
    "other": ""
  },
  "Shapefile": {
    "data": "File/zip",
    "typeKeywords": "Data,Shapefile",
    "description": "A shapefile",
    "other": "Can be published as a feature service using the Portal API Publish call."
  },
  "CSV": {
    "data": "File/csv",
    "typeKeywords": "Data,Text,CSV",
    "description": "A text file of data values separated by commas or other delimiters.",
    "other": "Can be published as a feature service using the Portal API Publish call."
  },
  "Service Definition": {
    "data": "File/sd",
    "typeKeywords": "Data,Service,Service Definition",
    "description": "A Service Definition that can be published to create a geospatial web service using the Portal API Publish call.",
    "other": ""
  },
  "Document Link": {
    "data": "URL",
    "typeKeywords": "Data,Document",
    "description": "Link to a web resource",
    "other": ""
  },
  "Microsoft Word": {
    "data": "File",
    "typeKeywords": "Data,Document,Microsoft Word",
    "description": "Microsoft Word Document (.doc, .docx)",
    "other": ""
  },
  "Microsoft PowerPoint": {
    "data": "File",
    "typeKeywords": "Data,Document,Microsoft PowerPoint",
    "description": "Microsoft PowerPoint (.ppt, .pptx)",
    "other": ""
  },
  "Microsoft Excel": {
    "data": "File",
    "typeKeywords": "Data,Document,Microsoft Excel",
    "description": "Microsoft Excel Document (.xls, .xlsx)",
    "other": ""
  },
  "PDF": {
    "data": "File",
    "typeKeywords": "Data,Document. PDF",
    "description": "Portable Document Format (.pdf)",
    "other": ""
  },
  "Image": {
    "data": "File",
    "typeKeywords": "Data,Image",
    "description": "Image Types (.jpg, .jpeg, .tif, .tiff, .png)",
    "other": ""
  },
  "Visio Document": {
    "data": "File",
    "typeKeywords": "Data,Document,Visio Document",
    "description": "Visio Document (.vsd)",
    "other": ""
  }
};

var searchParameters = {
  "id": {
    "label": "Item ID",
    "paramType": "string",
    "description": "ID of the item, for example, id:4e770315ad9049e7950b552aa1e40869 returns the item for that ID."
  },
  "owner": {
    "label": "Owner",
    "paramType": "string",
    "description": "Owner of the item, for example, owner:esri returns all content published by esri."
  },
  "uploaded": {
    "label": "Uploaded",
    "paramType": "date",
    "range":true,
    "description": "Uploaded is the date uploaded, for example uploaded: [0000001249084800000 TO 0000001249548000000] finds all items published between August 1, 2009, 12:00AM to August 6, 2009 08:40AM."
  },
  "title": {
    "label": "Title",
    "paramType": "string",
    "description": "Item title, for example, title:\"Southern California\" returns items with Southern California in the title."
  },
  "type": {
    "label": "Type",
    "paramType": "list",
    "list": agsItemDetails.getTypes(),
    "description": "Type returns the type of item and is a predefined field. See Items and item types for a listing of the different types. For example, type:map returns items with map as the type, such as map documents and map services."
  },
  "typekeywords": {
    "label": "Type Keywords",
    "paramType": "list",
    "list": agsItemDetails.getTypeKeywords(),
    "description": "Type keywords, for example, typekeywords:tool returns items with the tool type keyword such as Network Analysis or geoprocessing services. See Items and item types for a listing of the different types."
  },
  "description": {
    "label": "Description",
    "paramType": "string",
    "description": "Item description, for example, description:California finds all items with the term California in the description."
  },
  "tags": {
    "label": "Tags",
    "paramType": "string",
    "description": "The tag field, for example, tags:\"San Francisco\" returns items tagged with the term San Francisco."
  },
  "snippet": {
    "label": "Snippet",
    "paramType": "string",
    "description": "Snippet or summary of the item, for example, snippet:\"natural resources\" returns items with natural resources in the snippet."
  },
  "extent": {
    "label": "Extent",
    "paramType": "extent",
    "description": "The bounding rectangle of the item. For example, extent: [-114.3458, 21.7518] - [-73.125, 44.0658] returns items within that extent."
  },
  "spatialreference": {
    "label": "Spatial Reference",
    "paramType": "string",
    "description": "Spatial reference, for example, spatialreference:102100 returns items in the Web Mercator Auxiliary Sphere projection."
  },
  "accessinformation": {
    "label": "Access Information",
    "paramType": "string",
    "description": "Access information, for example, accessinformation:esri returns items with esri as the source credit."
  },
  "access": {
    "label": "Access",
    "paramType": "list",
    "list": ["none", "public", "private", "org", "shared"],
    "description": "The access field, for example, access:public returns public items. This field is predefined, and the options are public, private, org, or shared. You will only see private or shared items that you can access."
  },
  "numratings": {
    "label": "Num Ratings",
    "paramType": "number",
    "range":true,
    "description": "Number of ratings, for example, numratings:6 returns items with six ratings."
  },
  "numcomments": {
    "label": "Num Comments",
    "paramType": "number",
    "range":true,
    "description": "Number of comments, for example, numcomments:[1 TO 3] returns items that have one to three comments."
  },
  "avgrating": {
    "label": "Avg Rating",
    "paramType": "number",
    "range":true,
    "description": "Average rating, for example, avgrating:3.5 returns items with 3.5 as the average rating."
  },
  "group": {
    "label": "Group ID",
    "paramType": "string",
    "description": "The ID of the group, for example, group:1652a410f59c4d8f98fb87b25e0a2669 returns items within the given group."
  },
  "orgID": {
    "label": "Organization ID",
    "paramType": "string",
    "description": "The ID of the organization, for example, orgID:5uh3wwYLNzBuU0Ef returns items within the given organization."
  }
};

