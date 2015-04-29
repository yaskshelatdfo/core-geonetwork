(function() {

  goog.provide('gn_search_sextant');

  goog.require('gn_search');
  goog.require('gn_search_sextant_config');
  goog.require('gn_thesaurus');
  goog.require('gn_related_directive');
  goog.require('gn_search_default_directive');
  goog.require('gn_legendpanel_directive');
  goog.require('sxt_directives');
  goog.require('sxt_panier');
  goog.require('sxt_interceptors');
  goog.require('sxt_mdactionmenu');

  var module = angular.module('gn_search_sextant', [
    'gn_search',
    'gn_search_sextant_config',
    'gn_related_directive',
    'gn_search_default_directive',
    'gn_legendpanel_directive',
    'gn_thesaurus',
    'sxt_directives',
    'sxt_panier',
    'sxt_interceptors',
    'sxt_mdactionmenu'
  ]);

  module.value('sxtGlobals', {});

  module.config(['$LOCALES', function($LOCALES) {
    $LOCALES.push('sextant');
  }]);

  module.controller('gnsSextant', [
    '$scope',
    '$location',
    '$window',
    'suggestService',
    '$http',
    'gnSearchSettings',
    'gnViewerSettings',
    'gnMap',
    'gnThesaurusService',
    'sxtGlobals',
    'gnNcWms',
    '$timeout',
    'gnMdView',
    'gnMdViewObj',
    'gnSearchLocation',
    'gnMetadataActions',
    function($scope, $location, $window, suggestService,
             $http, gnSearchSettings,
        gnViewerSettings, gnMap, gnThesaurusService, sxtGlobals, gnNcWms,
        $timeout, gnMdView, mdView, gnSearchLocation, gnMetadataActions) {

      var viewerMap = gnSearchSettings.viewerMap;
      var searchMap = gnSearchSettings.searchMap;
      $scope.mainTabs = gnSearchSettings.mainTabs;
      $scope.layerTabs = gnSearchSettings.layerTabs;
      $scope.gnMetadataActions = gnMetadataActions;

      var localStorage = $window.localStorage || {};


      // Manage routing
      if (!$location.path()) {
        gnSearchLocation.setSearch();
      }

      gnMdView.initFormatter(gnSearchSettings.formatterTarget || '.gn');
      gnSearchLocation.initTabRouting($scope.mainTabs);

      $scope.gotoPanier = function() {
        $location.path('/panier');
      };

      //
      if(gnSearchSettings.tabOverflow && gnSearchSettings.tabOverflow.search) {
        var updateTabVisibility = function() {
          if(gnSearchLocation.isMdView()) {
            $scope.inMdView = true;
          }
          else {
            $scope.inMdView = false;
          }
        };
        updateTabVisibility();
        $scope.$on('$locationChangeSuccess', updateTabVisibility);
      }

      $scope.locService = gnSearchLocation;


      // make sure search map is correctly rendered
      var unregisterMapsize = $scope.$on('locationBackToSearch', function() {
        if (angular.isUndefined(searchMap.getSize()) ||
            searchMap.getSize()[0] == 0 ||
            searchMap.getSize()[1] == 0) {
          $timeout(function() {searchMap.updateSize()}, 100);
        }
        unregisterMapsize();
      });


      // Manage the collapsed search panel
      $scope.collapsed = localStorage.searchWidgetCollapsed ?
          JSON.parse(localStorage.searchWidgetCollapsed) :
          { search: true};

      $scope.toggleSearch = function() {
        $scope.collapsed.search = !$scope.collapsed.search;
        $timeout(function() {
          gnSearchSettings.searchMap.updateSize();
        }, 300);
      };

      var storeCollapsed = function() {
        localStorage.searchWidgetCollapsed = JSON.stringify($scope.collapsed);
      };
      $scope.$watch('collapsed.search', storeCollapsed);

      var mapVisited = false; // Been once in mapviewer
      var waitingLayers = []; // Layers added from catalog but not visited yet

      $scope.displayMapTab = function() {

        // Make sure viewer map is correctly rendered
        if (angular.isUndefined(viewerMap.getSize()) ||
            viewerMap.getSize()[0] == 0 ||
            viewerMap.getSize()[1] == 0) {
          $timeout(function() {
            viewerMap.updateSize();
/*
            if (gnViewerSettings.initialExtent) {
              viewerMap.getView().fitExtent(gnViewerSettings.initialExtent,
                  viewerMap.getSize());
            }
*/
            // Zoom to last added layer on first visit to viewer map
            if(!mapVisited) {
              var extent = ol.extent.createEmpty();
              for(var i=0;i<waitingLayers.length;++i) {
                ol.extent.extend(extent, waitingLayers[i].get('cextent'));
              }
              if (!ol.extent.isEmpty(extent)) {
                viewerMap.getView().fitExtent(extent, viewerMap.getSize());
              }
              mapVisited = true;
            }
            waitingLayers = [];

          }, 0);
        }
        $scope.mainTabs.map.titleInfo = 0;
      };

      $scope.displayPanierTab = function() {
        $timeout(function() {
          $scope.$broadcast('renderPanierMap');
        },0)
      };

      //Check if a added layer is NcWMS
      viewerMap.getLayers().on('add', function(e) {
        var layer = e.element;
        if (layer.get('isNcwms') == true) {
          gnNcWms.feedOlLayer(layer);
        }
      });

      // Manage sextantTheme thesaurus translation
      gnThesaurusService.getKeywords(undefined, 'local.theme.sextant-theme',
          200, 1).then(function(data) {
        sxtGlobals.sextantTheme = data;
        $scope.$broadcast('sextantThemeLoaded');
      });

      ///////////////////////////////////////////////////////////////////
      ///////////////////////////////////////////////////////////////////
      $scope.getAnySuggestions = function(val) {
        var url = suggestService.getUrl(val, 'anylight',
            ('STARTSWITHONLY'));

        return $http.get(url, {
        }).then(function(res) {
          return res.data[1];
        });
      };

      /** Manage metadata view */
/*
      $scope.mdView = mdView;
      gnMdView.initMdView();

      $scope.openRecord = function(index, md, records) {
        gnMdView.feedMd(index, md, records);
      };

      $scope.closeRecord = function() {
        gnMdView.removeLocationUuid();
      };
      $scope.nextRecord = function() {
        // TODO: When last record of page reached, go to next page...
        $scope.openRecord(mdView.current.index + 1);
      };
      $scope.previousRecord = function() {
        $scope.openRecord(mdView.current.index - 1);
      };
*/

      ///////////////////////////////////////////////////////////////////

      var feedLayerWithDownloads = function(layer, linkGroup) {
        var md = layer.get('md');
        var downloads = md && md.getLinksByType(linkGroup,
            'WWW:DOWNLOAD-1.0-link--download', 'FILE', 'DB',
            'WFS', 'WCS', 'COPYFILE');

        layer.set('downloads', downloads);

      };

      $scope.$on('layerAddedFromContext', function(e,l) {
        var md = l.get('md');
        if(md) {
          var linkGroup = md.getLinkGroup(l);
          feedLayerWithDownloads(l,linkGroup);
        }
      });

      $scope.resultviewFns = {
        addMdLayerToMap: function(link, md) {

          if(gnMap.isLayerInMap($scope.searchObj.viewerMap,
              link.name, link.url)) {
            return;
          }

          var group, theme = md.sextantTheme;
          if(angular.isArray(sxtGlobals.sextantTheme)) {
            for (var i = 0; i < sxtGlobals.sextantTheme.length; i++) {
              var t = sxtGlobals.sextantTheme[i];
              if (t.props.uri == theme) {
                group = t.label;
                break;
              }
            }
          }

          gnMap.addWmsFromScratch($scope.searchObj.viewerMap,
              link.url, link.name, undefined, md).then(function(layer) {
                layer.set('group', group);
                feedLayerWithDownloads(layer, link.group);
                waitingLayers.push(layer);
              });
          $scope.mainTabs.map.titleInfo += 1;

        },
        addAllMdLayersToMap: function (layers, md) {
          angular.forEach(layers, function (layer) {
            $scope.resultviewFns.addMdLayerToMap(layer, md);
          });
        },

        addMdLayerToPanier: function(link, md) {
          $scope.searchObj.panier.push({
            link: link,
            md: md
          });
          $scope.mainTabs.panier.titleInfo += 1;
        },

        addAllMdLayersToPanier: function (layers, md) {
          angular.forEach(layers, function (layer) {
            $scope.resultviewFns.addMdLayerToPanier(layer, md);
          });
        }

      };

      // Manage tabs height for api
      $scope.tabOverflow = gnSearchSettings.tabOverflow;

      angular.extend($scope.searchObj, {
        advancedMode: false,
        viewerMap: viewerMap,
        searchMap: searchMap,
        panier: [],
        hiddenParams: gnSearchSettings.hiddenParams
      });
    }]);

  module.controller('gnsSextantSearch', [
    '$scope',
    'gnOwsCapabilities',
    'gnMap',
    'sxtGlobals',
    function($scope, gnOwsCapabilities, gnMap, sxtGlobals) {

    }]);

  module.controller('gnsSextantSearchForm', [
    '$scope', 'gnSearchSettings',
    function($scope, searchSettings) {

      $scope.isFacetsCollapse = function(facetKey) {
        return !$scope.searchObj.params[facetKey];
      };

      // Run search on bbox draw
      $scope.$watch('searchObj.params.geometry', function(v){
        if(angular.isDefined(v)) {
          $scope.triggerSearch();
        }
      });

      // Get Thesaurus config and set first one as active
      $scope.thesaurus = searchSettings.defaultListOfThesaurus;

      $scope.mapfieldOpt = {
        relations: ['within']
      };

      // Disable/enable reset button
      var defaultSearchParams = ['sortBy', 'from', 'to', 'fast',
        '_content_type'];
      $scope.$watch('searchObj.params', function(v) {
        for (var p in v) {
          if(defaultSearchParams.indexOf(p) < 0) {
            $scope.searchObj.canReset = true;
            return;
          }
        }
        $scope.searchObj.canReset = false;
      });
    }]);

  module.directive('sxtFixMdlinks', [
    function() {

      return {
        restrict: 'A',
        scope: false,
        link: function(scope) {
          scope.links = scope.md.getLinksByType('LINK');

          scope.downloads = scope.md.getGroupedLinksByTypes('#FILE',
              '#COPYFILE', '#DB', '#WFS', 'WCS', 'WWW:DOWNLOAD');
          scope.layers = scope.md.getGroupedLinksByTypes('OGC:WMTS',
              'OGC:WMS', 'OGC:OWS-C');

        }
      };
    }]);

  module.directive('sxtSize', [
    function() {

      return {
        restrict: 'A',
        scope: {
          size: '@sxtSize'
        },
        link: function(scope, element) {
          if (scope.size == 'auto') {
            var fitHeight = function() {
              var height = $(document.body).height() - $(element).offset().top;
              element.css('height', height+'px');
            };
            $(window).on('resize', fitHeight);
            fitHeight();
          } else if (parseInt(scope.size, 10) != NaN) {
            var height = parseInt(scope.size, 10) + 'px';
            element.css('height', height);
          }

        }
      };
    }]);



})();
