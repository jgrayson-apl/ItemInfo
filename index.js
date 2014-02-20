require([
  "dojo/ready",
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/connect",
  "dojo/_base/array",
  "dojo/aspect",
  "dojo/query",
  "dojo/json",
  "dojo/on",
  "dojo/mouse",
  "dojo/dom",
  "dojo/dom-construct",
  "dojo/dom-class",
  "dojo/dom-style",
  "dojo/number",
  "dojo/string",
  "dojo/_base/Deferred",
  "dojo/promise/all",
  "dojo/data/ObjectStore",
  "dojo/store/Memory",
  "dojo/store/Observable",
  "dgrid/List",
  "dgrid/Grid",
  "dgrid/OnDemandList",
  "dgrid/OnDemandGrid",
  "dgrid/extensions/ColumnHider",
  "dgrid/Selection",
  "dgrid/selector",
  "dgrid/extensions/DijitRegistry",
  "put-selector/put",
  "dojo/date/locale",
  "dijit/TitlePane",
  "dijit/Dialog",
  "dijit/popup",
  "dijit/TooltipDialog",
  "dijit/Menu",
  "dijit/MenuItem",
  "dijit/form/Button",
  "dijit/form/TextBox",
  "dijit/form/NumberTextBox",
  "dijit/form/DateTextBox",
  "dijit/form/Select",
  "dijit/registry",
  "esri/request",
  "esri/kernel",
  "esri/config",
  "esri/urlUtils",
  "esri/domUtils",
  "esri/arcgis/utils",
  "esri/arcgis/Portal",
  "esri/IdentityManager"
], function (ready, declare, lang, connect, array, aspect, query, json, on, mouse, dom, domConstruct, domClass, domStyle, number, string, Deferred, all, ObjectStore, Memory, Observable, List, Grid, OnDemandList, OnDemandGrid, ColumnHider, Selection, selector, DijitRegistry, put, locale, TitlePane, Dialog, popup, TooltipDialog, Menu, MenuItem, Button, TextBox, NumberTextBox, DateTextBox, Select, registry, esriRequest, esriKernel, esriConfig, urlUtils, domUtils, arcgisUtils, esriPortal, IdentityManager) {

  var portalUser = null;
  var sourceFoldersList = null;
  var sourceGroupsList = null;
  var sourceTagsList = null;
  var sourceItemList = null;
  var tagsList = null;
  var tagItemList = null;
  var countsItemList = null;
  var getFolderItemsDeferred = null;
  var getGroupItemsDeferred = null;
  var getTagItemsDeferred = null;
  var queryCountDeferred = null;
  var getSearchItemsDeferred = null;

  ready(function () {

    // PROXY URL //
    esriConfig.defaults.io.proxyUrl = "./resources/proxy.ashx";

    // PORTAL //
    var portalUrl = document.location.protocol + '//www.arcgis.com';
    var portal = new esriPortal.Portal(portalUrl);
    // PORTAL LOADED //
    portal.on('load', lang.hitch(this, function () {

      // FOLDERS LIST //
      sourceFoldersList = declare([OnDemandList, Selection, DijitRegistry])({
        store: new Observable(new Memory({
          data: []
        })),
        loadingMessage: "Loading folders...",
        noDataMessage: "User Folders",
        selectionMode: "single",
        allowTextSelection: true,
        renderRow: renderFolderRow
      }, "sourceFoldersList");
      sourceFoldersList.startup();
      sourceFoldersList.on("dgrid-select", sourceFolderSelected);

      // GROUPS LIST //
      sourceGroupsList = declare([OnDemandList, Selection, DijitRegistry])({
        store: new Observable(new Memory({
          data: []
        })),
        loadingMessage: "Loading groups...",
        noDataMessage: "User Groups",
        selectionMode: "single",
        allowTextSelection: true,
        renderRow: renderGroupRow
      }, "sourceGroupList");
      sourceGroupsList.startup();
      sourceGroupsList.on("dgrid-select", sourceGroupSelected);

      // TAGS LIST //
      sourceTagsList = declare([OnDemandList, Selection, DijitRegistry])({
        store: new Observable(new Memory({
          data: []
        })),
        selectionMode: "single",
        renderRow: renderTagRow,
        loadingMessage: "Loading tags...",
        noDataMessage: "User Tags",
        allowTextSelection: true
      }, "sourceTagList");
      sourceTagsList.startup();
      sourceTagsList.on("dgrid-select", sourceTagSelected);

      // ITEM LIST //
      sourceItemList = declare([OnDemandGrid, ColumnHider, DijitRegistry])({
        store: new Observable(new Memory({
          data: []
        })),
        columns: getColumns(),
        loadingMessage: "Loading items...",
        noDataMessage: "No items found"
      }, "sourceItemList");
      sourceItemList.startup();
      aspect.after(sourceItemList, 'renderArray', sourceListUpdated, true);
      sourceItemList.on("dgrid-columnstatechange", lang.hitch(this, filterSourceItems));
      sourceItemList.on(".dgrid-row:click", lang.partial(displayItemInAGOL, sourceItemList));
      sourceItemList.on('.dgrid-cell:contextmenu', function (evt) {
        evt.preventDefault();
      });

      // FIND SIMILAR MENU //
      var findSimilarMenu = new Menu({
        targetNodeIds: [sourceItemList.domNode],
        selector: "td.dgrid-cell.field-tags"
      });
      findSimilarMenu.addChild(new MenuItem({
        label: "Find items with SIMILAR tags",
        onClick: lang.partial(findSimilarTags, false)
      }));

      // FILTER TITLE KEY UP //
      on(registry.byId('sourceItemsFilterInput'), 'keyup', filterSourceItems);

      // FILTER TYPE CHANGE //
      on(registry.byId('itemTypeSelect'), 'change', filterSourceItems);

      // SOURCE LIST CHANGE //
      connect.connect(registry.byId('sourceListsContainer'), 'selectChild', sourceListChange);

      // USER OWNED CHANGED //
      on(registry.byId('userOwnedChk'), 'change', filterSourceItems);

      // APPLY SEARCH QUERY //
      on(registry.byId('applySearchBtn'), 'click', lang.hitch(this, applySearchQuery));

      // CLEAR SARCH PARAMETERS //
      on(registry.byId('clearSearchBtn'), 'click', lang.hitch(this, clearSearchQuery));

      // USE FIELD NAMES IN CSV OUTPUT //
      on(registry.byId('useFieldNamesChk'), 'change', lang.hitch(this, exportItemList, null));

      // GET ITEM COUNTS //
      //on(registry.byId('getCountsBtn'), 'click', lang.hitch(this, getItemCounts));

      // SYNC ITEM AND SEARCH COUNTS //
      //on(registry.byId('applySyncCountsBtn'), 'click', lang.hitch(this, syncItemCounts));


      // OPTIONS STACK CONTAINER CHILD SELECTED //
      connect.connect(registry.byId('optionsContainer'), 'selectChild', lang.hitch(this, function (selectedChild) {

        var checked = ((selectedChild.title === "Tags") || (selectedChild.title === "Counts"));
        registry.byId('userOwnedChk').set('checked', checked);
        registry.byId('userOwnedChk').set('disabled', checked);

        sourceItemList.refresh();
        if(tagItemList) {
          tagItemList.clearSelection();
        }
        if(tagsList) {
          tagsList.clearSelection();
        }

        /*
         sourceFoldersList.set('selectionMode', checked ? "none" : "single");
         sourceGroupsList.set('selectionMode', checked ? "none" : "single");
         sourceTagsList.set('selectionMode', checked ? "none" : "single");

         query("#sourceListController .dijitToggleButton").forEach(lang.hitch(this, function (node) {
         var toggleButton = registry.byNode(node);
         if(toggleButton) {
         toggleButton.set('disabled', checked);
         }
         }));

         query("#sourceListsContainer .dgrid-row").forEach(lang.hitch(this, function (node) {
         if(checked) {
         domClass.add(node, 'paneDisabled');
         } else {
         domClass.remove(node, 'paneDisabled');
         }
         }));
         */

      }));

      // EXPAND/COLLAPSE LEFT PANE //
      on(dom.byId('expandoImage'), 'click', lang.hitch(this, function () {
        var expandoImage = dom.byId('expandoImage');
        domClass.toggle(dom.byId('expandoImage'), "expand");
        var newSize = (domClass.contains(expandoImage, "expand")) ? {w: 70} : {w: 500};
        registry.byId('typeContainer').resize(newSize);
        registry.byId('mainContainer').layout();
      }));

      // SHOW/HIDE LEFT PANE CONTENT WHEN RE-SIZED //
      aspect.after(registry.byId('typeContainer'), 'resize', lang.hitch(this, function (newSize) {
        var sourceListController = registry.byId('sourceListController');
        var sourceListsContainer = registry.byId('sourceListsContainer');
        var sourcePanelInfo = registry.byId('sourcePanelInfo');
        if(newSize.w) {
          if(newSize.w < 100) {
            domClass.add(dom.byId('expandoImage'), "expand");
            domUtils.hide(sourceListController.domNode);
            domUtils.hide(sourceListsContainer.domNode);
            domUtils.hide(sourcePanelInfo.domNode);
          } else {
            domClass.remove(dom.byId('expandoImage'), "expand");
            domUtils.show(sourceListController.domNode);
            domUtils.show(sourceListsContainer.domNode);
            domUtils.show(sourcePanelInfo.domNode);
          }
        }
      }), true);


      // SIGN IN //
      portal.signIn().then(lang.hitch(this, function (user) {
        portalUser = user;

        dom.byId('loggedInUser').innerHTML = portalUser.fullName;

        // GET USER FOLDERS //
        portalUser.getFolders().then(function (folders) {
          // ROOT FOLDER //
          var rootFolder = {
            id: '',
            title: portalUser.username,
            isRoot: true
          };
          // FOLDER STORE //
          var folderStore = new Observable(new Memory({
            data: [rootFolder].concat(folders)
          }));
          // SET LISTS STORE //
          sourceFoldersList.set('store', folderStore);
        });

        // GET USER GROUPS //
        portalUser.getGroups().then(function (groups) {

          /*var favoritesGroup = {
            id: portalUser.favGroupId,
            title: "Favorites"
          };*/

          // GROUPS STORE //
          var groupStore = new Observable(new Memory({
            data: groups
          }));
          // SET LISTS STORE //
          sourceGroupsList.set('store', groupStore);
        });

        // GET USER TAGS //
        portalUser.getTags().then(function (tagItems) {
          var tagStore = new Observable(new Memory({
            data: array.map(tagItems, function (tagItem) {
              return {id: tagItem.tag, tag: tagItem.tag};
            })
          }));
          // SET LISTS STORE //
          sourceTagsList.set('store', tagStore);
        });

        buildSearchParameterUI();
      }));
    }));

    /*
     *
     */

    // BUILD SEARCH PARAMETER UI //
    function buildSearchParameterUI() {

      var parameterListPane = registry.byId('parameterListPane');

      for (var paramName in searchParameters) {
        if(searchParameters.hasOwnProperty(paramName)) {
          var parameter = searchParameters[paramName];

          var parameterPane = new TitlePane({
            id: "parameterPane." + paramName,
            "class": "parameterTitlePane",
            title: parameter.label,
            open: false
          }, put(parameterListPane.containerNode, 'div'));

          var parameterDescNode = put(parameterPane.containerNode, 'div.parameterDescNode', parameter.description);
          var parameterInputsNode = put(parameterPane.containerNode, 'div.parameterInputsNode');
          var parameterInputs = [];

          switch (parameter.paramType) {
            case "string":
              put(parameterInputsNode, 'label.parameterLabelNode', lang.replace("{label}: ", parameter));
              var stringInput = new TextBox({
                intermediateChanges: true,
                placeHolder: lang.replace("Enter {label} here...", parameter),
                "class": "parameterInput parameter_" + paramName,
                parameterName: paramName
              }, put(parameterInputsNode, 'div'));
              stringInput.startup();
              createClearImg(parameterInputsNode, stringInput);
              parameterInputs.push(stringInput);

              if(parameter.range) {
                put(parameterInputsNode, 'div.parameterLabelNode', "TO");
                put(parameterInputsNode, 'label.parameterLabelNode', lang.replace("{label}: ", parameter));
                var stringInput2 = new TextBox({
                  intermediateChanges: true,
                  placeHolder: lang.replace("Enter {label} here...", parameter),
                  "class": "parameterInput parameter_" + paramName,
                  parameterName: paramName
                }, put(parameterInputsNode, 'div'));
                stringInput2.startup();
                createClearImg(parameterInputsNode, stringInput2);
                parameterInputs.push(stringInput2);
              }
              break;

            case "number":
              put(parameterInputsNode, 'label.parameterLabelNode', lang.replace("{label}: ", parameter));
              var numberInput = new NumberTextBox({
                intermediateChanges: true,
                placeHolder: lang.replace("Enter {label} here...", parameter),
                "class": "parameterInput parameter_" + paramName,
                parameterName: paramName
              }, put(parameterInputsNode, 'div'));
              numberInput.startup();
              createClearImg(parameterInputsNode, numberInput);
              parameterInputs.push(numberInput);

              if(parameter.range) {
                put(parameterInputsNode, 'div.parameterLabelNode', "TO");
                put(parameterInputsNode, 'label.parameterLabelNode', lang.replace("{label}: ", parameter));
                var numberInput2 = new NumberTextBox({
                  intermediateChanges: true,
                  placeHolder: lang.replace("Enter {label} here...", parameter),
                  "class": "parameterInput parameter_" + paramName,
                  parameterName: paramName
                }, put(parameterInputsNode, 'div'));
                numberInput2.startup();
                createClearImg(parameterInputsNode, numberInput2);
                parameterInputs.push(numberInput2);
              }
              break;

            case "date":
              put(parameterInputsNode, 'label.parameterLabelNode', lang.replace("{label}: ", parameter));
              var dateInput = new DateTextBox({
                intermediateChanges: true,
                placeHolder: lang.replace("Enter {label} here...", parameter),
                "class": "parameterInput parameter_" + paramName,
                parameterName: paramName
              }, put(parameterInputsNode, 'div'));
              dateInput.startup();
              createClearImg(parameterInputsNode, dateInput);
              parameterInputs.push(dateInput);

              if(parameter.range) {
                put(parameterInputsNode, 'div.parameterLabelNode', "TO");
                put(parameterInputsNode, 'label.parameterLabelNode', lang.replace("{label}: ", parameter));
                var dateInput2 = new DateTextBox({
                  intermediateChanges: true,
                  placeHolder: lang.replace("Enter {label} here...", parameter),
                  "class": "parameterInput parameter_" + paramName,
                  parameterName: paramName
                }, put(parameterInputsNode, 'div'));
                dateInput2.startup();
                createClearImg(parameterInputsNode, dateInput2);
                parameterInputs.push(dateInput2);
              }
              break;

            case "extent":
              put(parameterInputsNode, 'label.parameterLabelNode', lang.replace("{label}: ", parameter));
              var extentInput = new TextBox({
                intermediateChanges: true,
                placeHolder: lang.replace("Enter {label} here...", parameter),
                "class": "parameterInput parameter_" + paramName,
                parameterName: paramName
              }, put(parameterInputsNode, 'div'));
              extentInput.startup();
              createClearImg(parameterInputsNode, extentInput);
              parameterInputs.push(extentInput);
              break;

            case "list":
              put(parameterInputsNode, 'label.parameterLabelNode', lang.replace("{label}: ", parameter));
              var selectInput = new Select({
                "class": "parameterInput parameter_" + paramName,
                parameterName: paramName,
                options: array.map(parameter.list, function (listItem) {
                  return { label: listItem, value: listItem };
                })
              }, put(parameterInputsNode, 'div'));
              selectInput.startup();
              createClearImg(parameterInputsNode, selectInput);
              parameterInputs.push(selectInput);
              break;

            default:
              console.warn("Unknown Parameter Type: ", parameter.paramType);
          }

          array.forEach(parameterInputs, lang.hitch(this, function (parameterInput) {
            /*if(paramName === 'owner') {
             parameterInput.set('value', portalUser.username);
             }*/
            parameterInput.on('change', lang.hitch(this, updateParameterQuery));
          }));

        }
      }
    }

    // FIND SIMILAR TAGS //
    function findSimilarTags() {

      var node = this.getParent().currentTarget;
      var item = sourceItemList.row(node).data;
      query('.parameter_tags').forEach(lang.hitch(this, function (node) {
        var input = registry.byNode(node);
        if(input) {
          registry.byId('sourceListsContainer').selectChild(registry.byId('searchPane'));
          if(!registry.byId('parameterPane.tags').open) {
            registry.byId('parameterPane.tags').toggle();
          }

          var hasMultipleTags = (item.tags.length > 1);
          var tagParam = array.map(item.tags, function (tag) {
            var tagTemplate = "";
            if(hasMultipleTags) {
              tagTemplate = (tag.indexOf(' ') > -1) ? '+"{0}"' : '+{0}';
            } else {
              tagTemplate = (tag.indexOf(' ') > -1) ? '"{0}"' : '{0}';
            }
            return lang.replace(tagTemplate, [tag]);
          });

          var tagParamTemplate = (hasMultipleTags) ? '({0})' : '{0}';
          input.set('value', lang.replace(tagParamTemplate, [tagParam.join(' ')]));
        }
      }));

    }

    // CLEAR PARAMETER IMAGE //
    function createClearImg(parentNode, input) {

      put(parentNode, 'img.actionImg', {
        src: "./images/DeleteRed16.png",
        title: "Clear Parameter",
        onclick: lang.hitch(this, clearParameter, input)
      });

      /*
       var actionNode = put(parentNode, 'span.actionNode');
       put(actionNode, 'img.actionImg', {
       src: "./images/BlueUp16.png",
       title: "Boost Parameter",
       onclick: lang.hitch(this, boostParameter, input)
       });

       put(actionNode, 'img.actionImg', {
       src: "./images/GenericBlueAdd16.png",
       title: "Require Parameter",
       onclick: lang.hitch(this, requireParameter, input)
       });

       put(actionNode, 'img.actionImg', {
       src: "./images/GenericBlueSubtract16.png",
       title: "Prohibit Parameter",
       onclick: lang.hitch(this, prohibitParameter, input)
       });
       */

    }

    // CLEAR PARAMETER //
    function clearParameter(input) {
      if(input.declaredClass === "dijit.form.Select") {
        input.set('value', 'none');
      } else {
        input.set('value', null);
      }
    }

    function boostParameter(input) {
      /**/
    }

    function requireParameter(input) {
      /**/
    }

    function prohibitParameter(input) {
      /**/
    }

    // CLEAR SEARCH QUERY //
    function clearSearchQuery() {
      query('.parameterInput').forEach(lang.hitch(this, function (node) {
        var input = registry.byNode(node);
        if(input) {
          clearParameter(input);
        }
      }));

      query(".parameterTitlePane").forEach(lang.hitch(this, function (node) {
        var titlePane = registry.byNode(node);
        if(titlePane && titlePane.open) {
          titlePane.toggle();
        }
      }));

      registry.byId('applySearchBtn').set('disabled', false);
      registry.byId('sourceListsContainer').selectChild(registry.byId('searchPane'));
    }

    // UPDATE PARAMETER QUERY //
    function updateParameterQuery() {

      var params = [];
      query('.parameterInput').forEach(lang.hitch(this, function (node) {
        var input = registry.byNode(node);
        if(input) {
          var val = input.get('value');
          if(val && (val != "") && (val != "none")) {

            //if(isNaN(val) && (val.indexOf(" ") > -1)) {
            //  val = lang.replace('"{0}"', [val]);
            //}

            var paramTemplate = (input.declaredClass === "dijit.form.DateTextBox") ? "{0}:000000{1}" : "{0}:{1}";
            //var paramTemplate = "{0}:{1}";
            var paramQuery = lang.replace(paramTemplate, [input.parameterName, val.valueOf()]);

            if(!params[input.parameterName]) {
              params[input.parameterName] = paramQuery;
            } else {
              var otherVal = params[input.parameterName].split(':')[1];
              var paramsTemplate = (input.declaredClass === "dijit.form.DateTextBox") ? "{0}:[{1} TO 000000{2}]" : "{0}:[{1} TO {2}]";
              //var paramsTemplate = "{0}:[{1} TO {2}]";
              params[input.parameterName] = lang.replace(paramsTemplate, [input.parameterName, otherVal, val.valueOf()])
            }
          }
        }
      }));

      var paramParts = [];
      for (var paramName in params) {
        if(params.hasOwnProperty(paramName)) {
          paramParts.push(params[paramName]);
        }
      }

      dom.byId('searchQueryString').innerHTML = paramParts.join(' AND ');
      getQueryCount();

    }

    // GET QUERY COUNT //
    function getQueryCount() {

      if(queryCountDeferred) {
        dom.byId('searchQueryResultCount').innerHTML = "";
        queryCountDeferred.cancel();
      }
      registry.byId('applySearchBtn').set('disabled', true);

      var searchQuery = dom.byId('searchQueryString').innerHTML;
      if(searchQuery && (searchQuery.length > 0)) {
        dom.byId('searchQueryResultCount').innerHTML = "Searching...";
        var queryParams = {
          q: searchQuery,
          num: 0
        };
        queryCountDeferred = portalUser.portal.queryItems(queryParams).then(lang.hitch(this, function (response) {
          queryCountDeferred = null;
          dom.byId('searchQueryResultCount').innerHTML = lang.replace("{total} items found", response);
          registry.byId('applySearchBtn').set('disabled', ((response.total < 1) || (response.total > 1000)));
        }));
      } else {
        dom.byId('searchQueryResultCount').innerHTML = "";
      }
    }


    // APPLY SEARCH QUERY //
    function applySearchQuery() {
      var searchQuery = dom.byId('searchQueryString').innerHTML;
      if(searchQuery && (searchQuery.length > 0)) {
        sourceFoldersList.clearSelection();
        sourceGroupsList.clearSelection();
        sourceTagsList.clearSelection();
        domClass.add('sourceItemsCount', 'searching');
        dom.byId('sourceItemsCount').innerHTML = 'Searching...';
        var emptyStore = new Observable(new Memory({ data: [] }));
        sourceItemList.set('store', emptyStore);
        searchPortalItemsByQuery(searchQuery).then(updateSourceItemList);
      }
    }


    // GET ARRAY OF COLUMNS //
    function getColumns() {
      var columns = [];
      columns.push({
        needsQuotes: true,
        label: "Thumbnail",
        field: "thumbnailUrl",
        hidden: true,
        renderCell: renderItemThumbnail
      });
      columns.push({
        needsQuotes: true,
        label: "Title",
        field: "title",
        unhidable: true,
        renderCell: renderItemTitle
      });
      columns.push({
        needsQuotes: true,
        label: "ID",
        field: "id",
        hidden: true
      });
      columns.push({
        needsQuotes: true,
        label: "Credits",
        field: "accessInformation",
        hidden: true
      });
      columns.push({
        needsQuotes: true,
        label: "Access",
        field: "licenseInfo",
        hidden: true
      });
      columns.push({
        needsQuotes: true,
        label: "Shared",
        field: "access",
        hidden: true
      });
      columns.push({
        needsQuotes: true,
        label: "Summary",
        field: "snippet",
        hidden: true
      });
      columns.push({
        needsQuotes: true,
        label: "Description",
        field: "description",
        hidden: true,
        renderCell: renderItemDescription
      });
      columns.push({
        needsQuotes: true,
        label: "Type",
        field: "type",
        hidden: true
      });
      columns.push({
        needsQuotes: true,
        label: "Type Keywords",
        field: "typeKeywords",
        hidden: true
      });
      columns.push({
        needsQuotes: true,
        label: "Tags",
        field: "tags",
        hidden: false
      });
      columns.push({
        needsQuotes: true,
        label: "Created",
        field: "created",
        hidden: true,
        formatter: formatDateValue
      });
      columns.push({
        needsQuotes: true,
        label: "Modified",
        field: "modified",
        hidden: true,
        formatter: formatDateValue
      });
      columns.push({
        needsQuotes: true,
        label: "Owner",
        field: "owner",
        hidden: true
      });
      columns.push({
        needsQuotes: false,
        label: "Avg Rating",
        field: "avgRating",
        hidden: true
      });
      columns.push({
        needsQuotes: false,
        label: "Num Ratings",
        field: "numRatings",
        hidden: true
      });
      columns.push({
        needsQuotes: false,
        label: "Num Views",
        field: "numViews",
        hidden: true
      });
      columns.push({
        needsQuotes: false,
        label: "Num Comments",
        field: "numComments",
        hidden: true
      });

      return columns;
    }

    // RENDER FOLDER ROW //
    function renderFolderRow(object, options) {
      var itemNode = put("div");
      var folderClass = object.isRoot ? '.folderItem.rootFolder.listItem' : '.folderItem.listItem';
      put(itemNode, "div" + folderClass, object.title);
      put(itemNode, 'div.itemDetails', object.id);
      return itemNode;
    }

    // RENDER GROUP ROW //
    function renderGroupRow(object, options) {
      var itemNode = put("div");
      put(itemNode, "div.groupItem.listItem", object.title);
      put(itemNode, 'div.itemDetails', object.id);
      return itemNode;
    }

    // RENDER TAG ROW //
    function renderTagRow(object, options) {
      return put("div.tagItem.listItem", lang.replace("{tag}", object));
    }

    // RENDER SELECTABLE TAGS ROW //
    function renderSelectableTagRow(object, options) {
      return put("div.selectableTagItem", lang.replace("{tag}", object));
    }

    // FORMAT DATES VALUES //
    function formatDateValue(value) {
      return (new Date(value)).toLocaleString();
    }

    // RENDER ITEM THUMBNAIL //
    function renderItemThumbnail(object, value, node, options) {
      return value ? put("img.itemThumbnail", {src: value}) : put("span", "No Thumbnail");
    }

    // RENDER ITEM TITLE TO SHOW TYPE ICON //
    function renderItemTitle(object, value, node, options) {
      var itemClass = '.icon' + object.type.replace(/ /g, '');
      return put("div.iconItem." + itemClass, value);
    }

    // RENDER ITEM DESCRIPTION //
    function renderItemDescription(object, value, node, options) {
      return put("div.descNode", {innerHTML: value});
    }


    // FILTER SOURCE ITEMS //
    function filterSourceItems() {

      // CLEAR COUNT //
      dom.byId('sourceItemsCount').innerHTML = '';

      // ITEM QUERY //
      var itemQuery = {};

      // TYPE FILTER //
      var itemType = registry.byId('itemTypeSelect').get('value');
      if(itemType !== 'none') {
        itemQuery.type = itemType;
      }

      // TITLE FILTER //
      var itemTitle = registry.byId('sourceItemsFilterInput').get('value');
      if(itemTitle !== "") {
        itemQuery.title = new RegExp(itemTitle, 'i');
      }

      // USER OWNED FILTER //
      var userOwned = registry.byId('userOwnedChk').get('checked');
      if(userOwned) {
        itemQuery.owner = portalUser.username;
      }

      // SET QUERY FOR SOURCE ITEM LIST //
      sourceItemList.set('query', itemQuery, {
        count: 1000,
        sort: 'title'
      });
    }

    // UPDATE TYPE LIST //
    function updateTypeList(results) {

      var itemTypeNames = [];
      var itemTypes = [
        {
          id: "none",
          label: "<div class='placeHolder'>...no type filter...</div>"
        }
      ];
      array.forEach(results, function (result) {
        if(array.indexOf(itemTypeNames, result.type) === -1) {
          itemTypeNames.push(result.type);

          var itemClass = 'icon' + result.type.replace(/ /g, '');
          itemTypes.push({
            id: result.type,
            label: lang.replace("<div class='iconItem {0}'>{1}</div>", [itemClass, result.type])
          });
        }
      });

      var objectStore = new ObjectStore({ objectStore: new Memory({
        data: itemTypes
      })});
      registry.byId('itemTypeSelect').setStore(objectStore);
      registry.byId('itemTypeSelect').set('value', 'none');
    }


    // SOURCE LIST CHANGED //
    function sourceListChange(selectedChild) {

      dom.byId('sourceItemsCount').innerHTML = '';
      registry.byId('sourceItemsFilterInput').set('value', "");

      updateTypeList([]);

      sourceGroupsList.clearSelection();
      sourceTagsList.clearSelection();
      sourceFoldersList.clearSelection();

      var emptyStore = new Observable(new Memory({ data: [] }));
      sourceItemList.set('store', emptyStore, {}, {count: 1000, sort: 'title'});
      registry.byId('sourceItemGallery').set('content', "");

      var panelContent = put('div.panelContent');
      switch (selectedChild.title) {
        case "Folders":
          put(panelContent, 'div', "Display items in a user folder.");
          break;
        case "Tags":
          put(panelContent, 'div', "Display items with a user tag.");
          break;
        case "Groups":
          put(panelContent, 'div', "Display items shared to a group.");
          break;
        case "Search":
          put(panelContent, 'div', "Display items that match search parameters.");
          break;
      }
      registry.byId('sourcePanelInfo').set('content', panelContent);
    }

    function displayItemDetails(row) {

      var itemDetailsNode = put('div');
      put(itemDetailsNode, 'label', "Item ID: ");
      put(itemDetailsNode, 'input', {value: row.data.id});

      var myTooltipDialog = new TooltipDialog({
        style: "width: 300px;",
        content: itemDetailsNode,
        onMouseLeave: function () {
          popup.close(myTooltipDialog);
        }
      });

      popup.open({
        popup: myTooltipDialog,
        around: row.element//,
        //orient: {'BR':'TR', 'BL':'TL', 'TR':'BR', 'TL':'BL'}
      });

    }


    // SOURCE FOLDER ITEM SELECTED //
    function sourceFolderSelected(evt) {
      sourceGroupsList.clearSelection();
      sourceTagsList.clearSelection();
      domClass.add('sourceItemsCount', 'searching');
      dom.byId('sourceItemsCount').innerHTML = 'Searching...';
      sourceItemList.set('store', null);
      var portalFolder = evt.rows[0].data;
      if(portalFolder) {
        getFolderItemStore(portalFolder).then(updateSourceItemList);
        //displayItemDetails(evt.rows[0]);
      }
    }

    // SOURCE GROUP ITEM SELECTED //
    function sourceGroupSelected(evt) {
      sourceFoldersList.clearSelection();
      sourceTagsList.clearSelection();
      domClass.add('sourceItemsCount', 'searching');
      dom.byId('sourceItemsCount').innerHTML = 'Searching...';
      sourceItemList.set('store', null);
      var portalGroup = evt.rows[0].data;
      if(portalGroup) {
        getGroupItemStore(portalGroup).then(updateSourceItemList);
      }
    }

    // SOURCE TAG ITEM SELECTED //
    function sourceTagSelected(evt) {
      sourceFoldersList.clearSelection();
      sourceGroupsList.clearSelection();
      domClass.add('sourceItemsCount', 'searching');
      dom.byId('sourceItemsCount').innerHTML = 'Searching...';
      sourceItemList.set('store', null);
      var userTag = evt.rows[0].data;
      if(userTag) {
        getTagsItemStore(userTag).then(updateSourceItemList);
      }
    }

    // SEARCH FOR ITEMS BY QUERY //
    function searchPortalItemsByQuery(searchQuery) {
      var deferred = new Deferred();

      if(getSearchItemsDeferred) {
        getSearchItemsDeferred.cancel();
      }

      var queryParams = {
        q: searchQuery,
        sortField: 'title',
        sortOrder: 'asc',
        start: 0,
        num: 100
      };
      getSearchItemsDeferred = searchPortalItems(queryParams).then(lang.hitch(this, function (allResults) {
        getSearchItemsDeferred = null;
        var itemStore = new Observable(new Memory({
          data: allResults
        }));
        deferred.resolve(itemStore);
      }));

      return deferred.promise;
    }


    // GET ITEM STORE FOR PORTAL FOLDER //
    function getFolderItemStore(portalFolder) {
      var deferred = new Deferred();
      if(getFolderItemsDeferred) {
        getFolderItemsDeferred.cancel();
      }
      getFolderItemsDeferred = portalUser.getItems(portalFolder.id).then(lang.hitch(this, function (items) {
        getFolderItemsDeferred = null;
        var itemStore = new Observable(new Memory({
          data: items
        }));
        deferred.resolve(itemStore);
      }));
      return deferred.promise;
    }

    // GET ITEM STORE FOR PORTAL GROUP //
    function getGroupItemStore(portalGroup) {
      var deferred = new Deferred();

      if(getGroupItemsDeferred) {
        getGroupItemsDeferred.cancel();
      }

      var queryParams = {
        q: '',
        sortField: 'title',
        sortOrder: 'asc',
        start: 0,
        num: 100
      };
      getGroupItemsDeferred = searchGroupItems(portalGroup, queryParams).then(lang.hitch(this, function (allResults) {
        getGroupItemsDeferred = null;
        var itemStore = new Observable(new Memory({
          data: allResults
        }));
        deferred.resolve(itemStore);
      }));

      return deferred.promise;
    }

    // GET ITEM STORE BASED ON USER TAG //
    function getTagsItemStore(userTag) {
      var deferred = new Deferred();

      if(getTagItemsDeferred) {
        getTagItemsDeferred.cancel();
      }

      var queryParams = {
        q: lang.replace('tags:"{0}" AND owner:{1}', [userTag.tag, portalUser.username]),
        sortField: 'title',
        sortOrder: 'asc',
        start: 0,
        num: 100
      };
      getTagItemsDeferred = searchPortalItems(queryParams).then(lang.hitch(this, function (allResults) {
        getTagItemsDeferred = null;

        //var exactMatchResults = array.filter(allResults, function (result) {
        //  return (array.indexOf(result.tags, userTag.tag) > -1);
        //});

        var itemStore = new Observable(new Memory({
          //data: exactMatchResults
          data: allResults
        }));
        deferred.resolve(itemStore);
      }));

      return deferred.promise;
    }

    /**
     * RECURSIVELY SEARCH UNTIL ALL RESULTS ARE RETURNED
     * NOTE: THIS CALL CAN BE DANGEROUS IF THE QUERY RESULTS
     * IN A VERY LARGE NUMBER OF RESULTS. USE CAUTIOUSLY.
     *
     * @param portalGroup
     * @param queryParams
     * @param allResults
     * @returns {*}
     */
    function searchGroupItems(portalGroup, queryParams, allResults) {
      var deferred = new Deferred();

      if(!allResults) {
        allResults = [];
      }
      portalGroup.queryItems(queryParams).then(lang.hitch(this, function (response) {
        allResults = allResults.concat(response.results);
        if(response.nextQueryParams.start > 0) {
          searchGroupItems(portalGroup, response.nextQueryParams, allResults).then(deferred.resolve, deferred.reject);
        } else {
          deferred.resolve(allResults);
        }
      }));

      return deferred.promise;
    }

    /**
     * RECURSIVELY SEARCH UNTIL ALL RESULTS ARE RETURNED
     * NOTE: THIS CALL CAN BE DANGEROUS IF THE QUERY RESULTS
     * IN A VERY LARGE NUMBER OF RESULTS. USE CAUTIOUSLY.
     * @param queryParams object
     * @param allResults array
     * @returns {*}
     */
    function searchPortalItems(queryParams, allResults) {
      var deferred = new Deferred();

      if(!allResults) {
        allResults = [];
      }
      portalUser.portal.queryItems(queryParams).then(lang.hitch(this, function (response) {
        allResults = allResults.concat(response.results);
        if(response.nextQueryParams.start > 0) {
          searchPortalItems(response.nextQueryParams, allResults).then(deferred.resolve, deferred.reject);
        } else {
          deferred.resolve(allResults);
        }
      }));

      return deferred.promise;
    }

    // UPDATE SOURCE ITEM LIST WITH NEW STORE //
    function updateSourceItemList(store) {
      registry.byId('sourceItemsFilterInput').set('value', "");
      updateTypeList(store.data);
      sourceItemList.set('store', store, {}, {count: 1000, sort: 'title'});
      domClass.remove('sourceItemsCount', 'searching');
    }


    /**
     * UPDATE ITEM COUNT AFTER LIST IS UPDATED
     *
     * @param results Array of items currently in the display.
     *                length: number of items in display
     *                total:  total number of items that match query
     */
    function sourceListUpdated(results) {
      var counts = {
        storeCount: sourceItemList.store.data.length,
        displayCount: results.total
      };
      dom.byId('sourceItemsCount').innerHTML = lang.replace('{displayCount} of {storeCount}', counts);

      // GET LIST OF ALL ITEMS DIRECTLY FROM THE   //
      // STORE BUT BASED ON CURRENT QUERY AND SORT //
      var allResults = sourceItemList.store.query(sourceItemList.query, {sort: sourceItemList._getSort()});
      updateGalleryView(allResults);
      updateTagEditor(allResults);
      exportItemList(allResults);
      updateCountEditor(allResults);
    }

    // UPDATE GALLERY VIEW //
    function updateGalleryView(allResults) {

      var galleryContent = put('div.galleryContent');
      array.forEach(allResults, lang.hitch(this, function (result) {
        var itemClass = result.type.replace(/ /g, '');

        var galleryItemNode = put(galleryContent, 'div.galleryItem', {
          title: lang.replace("A {type} by {owner} - '{snippet}'", result),
          onclick: lang.hitch(this, function () {
            displayItemInAGOL(result);
          })
        });

        put(galleryItemNode, "div.galleryItemTitle.icon" + itemClass, result.title);
        put(galleryItemNode, "img.galleryItemThumbnail", {src: result.thumbnailUrl || "./images/no_preview.gif"});

      }));

      registry.byId('sourceItemGallery').set('content', galleryContent);
    }

    // DISPLAY ITEM IN ARCGIS.COM - WILL REQUIRE SIGN-IN //
    function displayItemInAGOL(listOrItem, evt) {
      var item = (listOrItem.row) ? listOrItem.row(evt).data : listOrItem;
      var detailsUrlTemplate = (item.owner === portalUser.username) ? "{0}//{1}.{2}/home/item.html?id={3}" : "{0}//www.arcgis.com/home/item.html?id={3}";
      var agsDetailsUrl = lang.replace(detailsUrlTemplate, [document.location.protocol, portalUser.portal.urlKey, portalUser.portal.customBaseUrl, item.id]);
      window.open(agsDetailsUrl);
    }

    // EXPORT ITEM LIST //
    function exportItemList(allResults) {

      if(!allResults) {
        allResults = sourceItemList.store.query(sourceItemList.query, {sort: sourceItemList._getSort()});
      }

      // CREATE LIST OF COLUMN TEMPLATES //
      var fieldNames = [];
      var fieldsTemplateParts = [];
      for (var columnId in sourceItemList.columns) {
        var column = sourceItemList.columns[columnId];
        if(!sourceItemList.isColumnHidden(column.id)) {
          var columnTemplate = (column.needsQuotes) ? '"{' + column.field + '}"' : '{' + column.field + '}';
          fieldsTemplateParts.push(columnTemplate);
          fieldNames.push(lang.replace('"{field}"', column));
        }
      }
      // JOIN USING DELIMITER TO CREATE COLUMNS TEMPLATE //
      var fieldsTemplate = fieldsTemplateParts.join(',');

      // GET ARRAY OF VALUES BASED ON COLUMN TEMPLATE //
      var csvParts = allResults.map(function (result) {
        // REPLACE "null" WITH "" //
        return lang.replace(fieldsTemplate, lang.hitch(result, function (_, key) {
          return (this[key] !== null) ? this[key] : "";
        }));
      });

      // FIELD NAMES //
      var useFieldNames = registry.byId('useFieldNamesChk').get('checked');
      if(useFieldNames) {
        var allFieldNames = fieldNames.join(',');
        csvParts = [allFieldNames].concat(csvParts);
      }

      // JOIN USING NEWLINE TO CREATE CSV CONTENT //
      var csvContent = csvParts.join('\n');

      // ADD CSV CONTENT TO TEXTAREA //
      var csvTextArea = registry.byId('csvTextArea');
      csvTextArea.set('value', csvContent);
      csvTextArea.textbox.focus();
      csvTextArea.textbox.select();
    }

    // RETURN LENGTH OF LONGEST STRING //
    /*function getMaxLength(arr) {
     return arr.sort(function (a, b) {
     return b.length - a.length
     })[0].length;
     }*/

    // DISPLAY COUNTS EDITOR //
    function updateCountEditor(allResults) {

      if(!countsItemList) {
        countsItemList = new declare([OnDemandGrid, DijitRegistry])({
          store: null,
          columns: [
            {
              label: "Title",
              field: "title",
              renderCell: renderItemTitle
            },
            {
              label: "Search Count",
              field: "numViews"
            },
            {
              label: "Item Count",
              field: "itemCount",
              renderCell: renderNumViews
            },
            {
              label: "Count Diff",
              field: "countDiff",
              renderCell: renderCountDiff
            }
          ],
          loadingMessage: "Loading items...",
          noDataMessage: "No items found"
        }, "countsItemListPane");
        countsItemList.startup();
        countsItemList.on(".dgrid-row:click", lang.partial(displayItemInAGOL, countsItemList));
      }
      var itemStore = new Observable(new Memory({ data: allResults }));
      countsItemList.set('store', itemStore);

      //registry.byId('applySyncCountsBtn').set('disabled', true);
    }

    // RENDER NUMBER OF VIEWS //
    function renderNumViews(object, value, node, options) {
      return put("div", isNaN(value) ? "" : value);
    }

    // RENDER COUNT DIFFERENCE //
    function renderCountDiff(object, value, node, options) {
      if(value != null) {
        var percent = (value * 100.0);
        if(value < 1.0) {
          return put("div.lessThanOne", {innerHTML: lang.replace("<b>{0}</b>%", [number.format(percent, {places: 2})])});
        } else {
          return put("div.atLeastOne", lang.replace("{0}%", [number.format(percent, {places: 0})]));
        }
      } else {
        return put("div");
      }
    }

    //function getRealCount(webmap, node) {
    //  arcgisUtils.getItem(webmap.id).then(lang.hitch(this, function (response) {
    //    node.innerHTML = lang.replace('<b>{0}</b> ({1})', [webmap.numViews, response.item.numViews]);
    //  }));
    //}

    // GET ITEM COUNTS //
    // NOTE: DOING THIS IS BAD BECAUSE MAKING THIS CALL WILL       //
    // INCREASE THE numViews PROPERTY WHICH IS THE INFO WE WANT... //
    /*function getItemCounts() {

     var results = countsItemList.store.query(countsItemList.query, {sort: countsItemList._getSort()});
     array.forEach(results, lang.hitch(this, function (item) {
     portalUser.getItem(item.id).then(lang.hitch(this, function (userItem) {
     item.itemCount = userItem.numViews;
     item.countDiff = (item.numViews / item.itemCount);
     countsItemList.store.put(item);
     sourceItemList.store.put(item);
     }));
     }));

     registry.byId('applySyncCountsBtn').set('disabled', false);
     }*/

    // SYNC SEARCH AND ITEM COUNTS BY //
    // CALLING 'UPDATE' ON ALL ITEMS  //
    function syncItemCounts() {

      var results = countsItemList.store.query(countsItemList.query, {sort: countsItemList._getSort()});
      if(results.length > 0) {
        if(confirm("Synchronizing the search and item counts requires an 'update' call to EVERY item in the list.\nContinue?")) {

          array.forEach(results, lang.hitch(this, function (item) {
            //if(item.countDiff && (item.countDiff < 1.0)) {
            portalUser.getItem(item.id).then(lang.hitch(this, function (userItem) {
              esriRequest({
                url: lang.replace("{userItemUrl}/update", userItem),
                content: {
                  f: 'json',
                  token: portalUser.credential.token
                }
              }, {
                usePost: true
              }).then(lang.hitch(this, function (response) {
                    if(response.success) {
                      userItem.itemCount = userItem.numViews;
                      //userItem.countDiff = 1.0;
                      userItem.countDiff = (item.numViews / userItem.numViews);
                      countsItemList.store.put(userItem);
                      sourceItemList.store.put(userItem);
                    }
                  }));
            }));
            //}
          }));
        }
      }
    }

    // DISPLAY TAG EDITOR //
    function updateTagEditor(allResults) {

      var tagList = [];
      var tagItems = [];
      array.forEach(allResults, lang.hitch(this, function (result) {
        array.forEach(result.tags, lang.hitch(this, function (tag) {
          if(array.indexOf(tagList, tag) === -1) {
            tagList.push(tag);
            tagItems.push({
              id: tag,
              tag: tag
            });
          }
        }));
      }));

      if(!tagItemList) {
        tagItemList = new declare([OnDemandGrid, Selection, DijitRegistry])({
          store: null,
          selectionMode: "extended",
          columns: [
            {
              label: "Title",
              field: "title",
              renderCell: renderItemTitle
            },
            {
              label: "Tags",
              field: "tags"
            }
          ],
          loadingMessage: "Loading items...",
          noDataMessage: "No items found"
        }, "tagItemListPane");
        tagItemList.startup();
        tagItemList.on("dgrid-select", lang.hitch(this, tagItemSelected));
        tagItemList.on("dgrid-deselect", lang.hitch(this, tagItemSelected));
      }
      var itemStore = new Observable(new Memory({ data: allResults }));
      tagItemList.set('store', itemStore);


      if(!tagsList) {
        tagsList = new declare([OnDemandList, Selection, DijitRegistry])({
          selectionMode: "single",
          renderRow: renderTagRow,
          loadingMessage: "Loading tags...",
          noDataMessage: "User Tags"
        }, "tagListPane");
        tagsList.startup();
        tagsList.on("dgrid-select", lang.hitch(this, tagSelected, true));
        tagsList.on("dgrid-deselect", lang.hitch(this, tagSelected, false));

        on(registry.byId('selectAllBtn'), 'click', lang.hitch(this, updateTagItemSelection, true));
        on(registry.byId('selectNoneBtn'), 'click', lang.hitch(this, updateTagItemSelection, false));
        on(registry.byId('addNewTagBtn'), 'click', lang.hitch(this, addTagToSelection));
        on(registry.byId('removeTagBtn'), 'click', lang.hitch(this, removeTagsFromSelection));
        on(registry.byId('replaceTagBtn'), 'click', lang.hitch(this, replaceTagsFromSelection));

      }
      var tagStore = new Observable(new Memory({ data: tagItems }));
      tagsList.set('store', tagStore);
      tagsList.sort('tag', false);

      registry.byId('selectNoneBtn').set('disabled', true);
      registry.byId('addNewTagBtn').set('disabled', true);
      registry.byId('removeTagBtn').set('disabled', true);
      registry.byId('replaceTagBtn').set('disabled', true);

    }

    // TAG ITEM SELECTED //
    function tagItemSelected(evt) {

      var selectedTagItems = getSelectedTagItems();
      var hasSelection = (selectedTagItems.length > 0);
      if(evt.parentType) {
        registry.byId('selectNoneBtn').set('disabled', !hasSelection);
        registry.byId('addNewTagBtn').set('disabled', !hasSelection);
        registry.byId('removeTagBtn').set('disabled', true);
        registry.byId('replaceTagBtn').set('disabled', true);
        tagsList.clearSelection();
      }

    }

    // TAG SELECTED/DESELECTED //
    function tagSelected(hasSelection, evt) {
      if(evt.parentType) {
        registry.byId('selectNoneBtn').set('disabled', true);
        registry.byId('addNewTagBtn').set('disabled', true);
        registry.byId('removeTagBtn').set('disabled', !hasSelection);
        registry.byId('replaceTagBtn').set('disabled', !hasSelection);

        if(tagItemList) {
          tagItemList.clearSelection();
          var selectedTag = evt.rows[0].data.tag;
          var results = tagItemList.store.query(tagItemList.query, {sort: tagItemList._getSort()});
          array.forEach(results, lang.hitch(this, function (item) {
            var hasTag = (array.indexOf(item.tags, selectedTag) > -1);
            if(hasTag) {
              tagItemList.select(item.id);
            }
          }));
        }
      }
    }

    // GET ARRAY INTERSECTION //
    function intersection(a, b) {
      var result = [];
      while (a.length > 0 && b.length > 0) {
        if(a[0] < b[0]) {
          a.shift();
        }
        else if(a[0] > b[0]) {
          b.shift();
        }
        else {
          result.push(a.shift());
          b.shift();
        }
      }

      return result;
    }

    // SELECT ALL/NONE TAG ITEMS //
    function updateTagItemSelection(selectAll) {
      if(tagItemList.store.data.length > 0) {
        if(selectAll) {
          tagItemList.selectAll();
          tagsList.clearSelection();
          registry.byId('selectNoneBtn').set('disabled', false);
          registry.byId('addNewTagBtn').set('disabled', false);
          registry.byId('removeTagBtn').set('disabled', true);
          registry.byId('replaceTagBtn').set('disabled', true);
        } else {
          tagItemList.clearSelection();
          registry.byId('selectNoneBtn').set('disabled', true);
          registry.byId('addNewTagBtn').set('disabled', true);
          registry.byId('removeTagBtn').set('disabled', true);
          registry.byId('replaceTagBtn').set('disabled', true);
        }
      }
    }

    // GET SELECTED TAG ITEMS //
    function getSelectedTagItems() {
      var selectedTagItems = [];
      for (var id in tagItemList.selection) {
        if(tagItemList.selection[id]) {
          selectedTagItems.push(tagItemList.row(id).data);
        }
      }
      return selectedTagItems;
    }

    // GET SELECTED TAG //
    function getSelectedTag() {
      var selectedTagItem = null;
      for (var id in tagsList.selection) {
        if(tagsList.selection[id]) {
          selectedTagItem = tagsList.row(id).data;
          break;
        }
      }
      return selectedTagItem;
    }

    // REPLACE EXISTING TAG //
    function replaceTagsFromSelection() {
      var selectedTagItem = getSelectedTag();

      getNewTag(selectedTagItem.tag).then(lang.hitch(this, function (newTags) {

        var newTag = newTags[0];
        var updateDeferredArray = [];
        for (var id in tagItemList.selection) {
          if(tagItemList.selection[id]) {
            var item = tagItemList.row(id).data;
            var newTagIndex = array.indexOf(item.tags, newTag);
            var tagIndex = array.indexOf(item.tags, selectedTagItem.tag);
            if((newTagIndex === -1) && (tagIndex > -1)) {
              item.tags.splice(tagIndex, 1, newTag);

              var updateDeferred = updateItemTags(item, item.tags).then(lang.hitch(this, function (userItem) {
                //console.log('replaceTagsFromSelection.updateItemTags: ', userItem);
                sourceItemList.store.put(userItem);
                tagItemList.store.put(userItem);
                tagItemList.deselect(userItem.id);
              }));
              updateDeferredArray.push(updateDeferred);
            }
          }
        }

        all(updateDeferredArray).then(lang.hitch(this, function () {
          //console.log('replaceTagsFromSelection.all: ');
          tagItemList.clearSelection();
          tagsList.store.remove(selectedTagItem.id);
          sourceTagsList.store.remove(selectedTagItem.id);
          if(!tagsList.store.get(newTag)) {
            tagsList.store.add({id: newTag, tag: newTag});
          }
          if(!sourceTagsList.store.get(newTag)) {
            sourceTagsList.store.add({id: newTag, tag: newTag});
          }
          registry.byId('removeTagBtn').set('disabled', true);
          registry.byId('replaceTagBtn').set('disabled', true);
        }));

      }));

    }

    // REMOVE EXISTING TAG //
    function removeTagsFromSelection() {
      var selectedTagItem = getSelectedTag();

      var results = tagItemList.store.query(tagItemList.query, {sort: tagItemList._getSort()});
      var updateDeferredArray = [];
      array.forEach(results, lang.hitch(this, function (item) {
        var tagIndex = array.indexOf(item.tags, selectedTagItem.tag);
        if(tagIndex > -1) {
          item.tags.splice(tagIndex, 1);

          var updateDeferred = updateItemTags(item, item.tags).then(lang.hitch(this, function (userItem) {
            //console.log('removeTagsFromSelection.updateItemTags: ', userItem);
            sourceItemList.store.put(userItem);
            tagItemList.store.put(userItem);
            tagItemList.deselect(userItem.id);
          }));
          updateDeferredArray.push(updateDeferred);
        }
      }));

      all(updateDeferredArray).then(lang.hitch(this, function () {
        //console.log('removeTagsFromSelection.all: ');
        tagsList.store.remove(selectedTagItem.id);
        sourceTagsList.store.remove(selectedTagItem.id);
        tagItemList.clearSelection();
        registry.byId('removeTagBtn').set('disabled', true);
        registry.byId('replaceTagBtn').set('disabled', true);
      }));

    }

    // ADD NEW TAG //
    function addTagToSelection() {

      getNewTag().then(lang.hitch(this, function (newTags) {
        //console.log("addTagToSelection: ", newTags);

        var updateDeferredArray = [];
        for (var id in tagItemList.selection) {
          if(tagItemList.selection[id]) {
            var item = tagItemList.row(id).data;

            var tagsToAdd = [];
            array.forEach(newTags, lang.hitch(this, function (newTag) {
              if(array.indexOf(item.tags, newTag) === -1) {
                tagsToAdd.push(newTag);
              }
            }));
            if(tagsToAdd.length > 0) {
              var allTags = item.tags.concat(tagsToAdd);
              var updateDeferred = updateItemTags(item, allTags).then(lang.hitch(this, function (userItem) {
                sourceItemList.store.put(userItem);
                tagItemList.store.put(userItem);
              }));
              updateDeferredArray.push(updateDeferred);
            }
          }
        }

        all(updateDeferredArray).then(lang.hitch(this, function () {
          //console.log('addTagToSelection.all: ');
          array.forEach(newTags, lang.hitch(this, function (newTag) {
            if(!tagsList.store.get(newTag)) {
              tagsList.store.add({id: newTag, tag: newTag});
            }
            if(!sourceTagsList.store.get(newTag)) {
              sourceTagsList.store.add({id: newTag, tag: newTag});
            }
          }));
        }));


      }), lang.hitch(this, function (error) {
        console.log(error);
      }));

    }

    // UPDATE ITEM TAGS //
    function updateItemTags(item, newTags) {
      var deferred = new Deferred();

      portalUser.getItem(item.id).then(lang.hitch(this, function (userItem) {
        userItem.tags = newTags;
        esriRequest({
          url: lang.replace("{userItemUrl}/update", userItem),
          content: {
            f: 'json',
            clearEmptyFields: true,
            tags: userItem.tags.join(','),
            token: portalUser.credential.token
          }
        }, {
          usePost: true
        }).then(lang.hitch(this, function (response) {
              if(response.success) {
                deferred.resolve(userItem);
              } else {
                deferred.reject();
              }
            }));
      }));

      return deferred.promise;
    }

    // GET NEW TAG //
    function getNewTag(oldTag) {
      var deferred = new Deferred();

      var dialogContent = put('div');
      var contentAreaNode = put(dialogContent, 'div.dijitDialogPaneContentArea.tagEditorDialogContentArea');

      put(contentAreaNode, 'label', (oldTag != null) ? "New Tag:" : "New Tags:");
      var newTagInput = new TextBox({
        intermediateChanges: true,
        value: oldTag || ""
      }, put(contentAreaNode, 'div'));
      newTagInput.on('change', lang.hitch(this, function (val) {
        okBtn.set('disabled', (val.length === 0) || ((oldTag != null) && ((oldTag === val) || (val.indexOf(',') > -1))));
      }));
      newTagInput.on('keypress', lang.hitch(this, function (evt) {
        if(evt.keyCode === 13) {
          okBtn.onClick();
        }
      }));
      var actionMessage = (oldTag != null) ? ("Previous Tag: " + oldTag) : "Use commas to separate tags";
      put(contentAreaNode, 'span.actionMessageNode', actionMessage);

      var actionBarNode = put(dialogContent, 'div.dijitDialogPaneActionBar');
      var okBtn = new Button({
        label: (oldTag != null) ? "Replace" : "Add",
        disabled: true
      }, put(actionBarNode, 'div'));
      okBtn.on('click', lang.hitch(this, function () {
        var newTag = newTagInput.get('value');
        addTagDialog.hide();
        var newTags = newTag.split(',');
        var cleanedTags = array.map(newTags, function (newTag) {
          return string.trim(newTag);
        });
        deferred.resolve(cleanedTags);
      }));
      var cancelBtn = new Button({ label: "Cancel" }, put(actionBarNode, 'div'));
      cancelBtn.on('click', lang.hitch(this, function () {
        addTagDialog.hide();
        deferred.reject();
      }));

      var addTagDialog = new Dialog({
        title: oldTag ? "Replace Existing Tag" : "Add New Tags",
        closable: false,
        content: dialogContent
      });
      addTagDialog.show();
      newTagInput.textbox.focus();
      newTagInput.textbox.select();

      return deferred.promise;
    }

  });
});


