(function() {
  goog.provide('sxt_layertree');

  var module = angular.module('sxt_layertree', []);

  module.directive('sxtLayertree', [
    'gnLayerFilters',
    '$filter',
    'gnWmsQueue',
    '$timeout',
    'gnViewerSettings',
    function (gnLayerFilters, $filter, gnWmsQueue, $timeout, gnViewerSettings) {
      return {
        restrict: 'A',
        templateUrl: '../../catalog/views/sextant/directives/' +
            'partials/layertree.html',
        controller: [ '$scope', '$compile', function($scope, $compile) {
          var $this = this;

          this.setWPS = function(process, layer) {
            $scope.loadTool('wps');

            var scope = $scope.$new();
            scope.wpsUri = process.url;
            scope.wpsProcessId = process.name;
            scope.applicationProfile = process.applicationProfile;
            var el = angular.element('<gn-wps-process-form map="map" data-uri="wpsUri" data-process-id="wpsProcessId" defaults="applicationProfile"></gn-wps-process-form>');
            $compile(el)(scope);
            var element = $('.sxt-wps-panel');
            element.empty();
            element.append(el);
          };

          /**
           * $compile the wfsFilter directive to build the facet form
           */
          this.setWFSFilter = function(layer, wfsLink) {
            $scope.loadTool('wfsfilter');

            var scope = $scope.$new();
            scope.layer = layer;
            var url = wfsLink.url;
            var featureTypeName = wfsLink.name;

            var el = angular.element('<div data-gn-wfs-filter-facets="" data-layer="layer" data-wfs-url="'+url+'" data-feature-type-name="'+featureTypeName+'"></div>');
            $compile(el)(scope);
            var element = $('.sxt-wfsfilter-panel');
            element.empty();
            element.append(el);
          },

          this.setNCWMS = function(layer) {
            $scope.active.NCWMS = layer;
            $scope.loadTool('ncwms');
          };

          this.comboGroups = {};
          this.switchGroupCombo = function(groupcombo) {
            var activeLayer = this.comboGroups[groupcombo];
            var fLayers = $filter('filter')($scope.layers,
                $scope.layerFilterFn);
            for (var i = 0; i < fLayers.length; i++) {
              var l = fLayers[i];
              if(l.get('groupcombo') == groupcombo) {
                l.visible = false;
              }
            }
            activeLayer.visible = true;
          };

          $scope.setActiveComboGroup = function(l) {
            $this.comboGroups[l.get('groupcombo')] = l;
          };
          this.addToPanier = function(md, link) {
            $scope.resultviewFns.addMdLayerToPanier(link, md);
          }
        }],
        link: function(scope, element, attrs) {

          scope.layers = scope.map.getLayers().getArray();
          scope.layerFilterFn = gnLayerFilters.selected;

          scope.displayFilter = gnViewerSettings.layerFilter;

          var findChild = function(node, name) {
            var n;
            if (node.nodes) {
              for (var i = 0; i < node.nodes.length; i++) {
                n = node.nodes[i];
                if (name == n.name) {
                  return n;
                }
              }
            }
          };

          var sortNodeFn = function(a, b) {
            var aName = a.name || a.get('label');
            var bName = b.name || b.get('label');
            return aName < bName ? -1 : 1;
          };

          var createNode = function(layer, node, g, index) {
            var group = g[index];
            if (group) {
              var newNode = findChild(node, group);
              if (!newNode) {
                newNode = {
                  name: group
                };
                if (!node.nodes) node.nodes = [];
                node.nodes.push(newNode);
                node.nodes.sort(sortNodeFn);
              }
              createNode(layer, newNode, g, index + 1);
            } else {
              if (!node.nodes) node.nodes = [];
              node.nodes.push(layer);
              node.nodes.sort(sortNodeFn);


            }
          };

          // on OWS Context loading, we don't want to build the tree on each
          // layer remove or add. The delay also helps to get layer properties
          // (i.e 'group') that are set after layer is added to map.
          var debounce = 0;

          // Build the layer manager tree depending on layer groups
          var buildTree = function() {
            if(debounce > 0) {
              return;
            }

            // Remove active popovers
            $('[sxt-layertree] .dropdown-toggle').each(function(i, button) {
              $(button).popover('hide');
            });

            debounce++;
            $timeout(function() {
              scope.layerTree = {
                nodes: []
              };
              var sep = '/';
              var fLayers = $filter('filter')(scope.layers,
                  scope.layerFilterFn);

              if(scope.layerFilter.length > 2) {
                fLayers = $filter('filter')(fLayers, filterFn);
              }

              for (var i = 0; i < fLayers.length; i++) {
                var l = fLayers[i];
                var groups = l.get('group');
                if (!groups) {
                  scope.layerTree.nodes.push(l);
                  scope.layerTree.nodes.sort(sortNodeFn);

                }
                else {
                  if (groups[0] != '/') {
                    groups = '/' + groups;
                  }
                  var g = groups.split(sep);
                  createNode(l, scope.layerTree, g, 1);
                }
                if(l.visible && l.get('groupcombo')) {
                  scope.setActiveComboGroup(l);
                }
              }
              debounce--;
            }, 100);
          };

          scope.map.getLayers().on('change:length', buildTree);

          scope.failedLayers = gnWmsQueue.errors;
          scope.removeFailed = function(layer) {
            gnWmsQueue.removeFromError(layer);
          };

          scope.layerFilter = '';
          var filterFn = function(layer) {
            var labelLc = layer.get('label') && layer.get('label').
                toLowerCase();
            var groupLc = layer.get('group') && layer.get('group').
                toLowerCase();
            var filterLc = scope.layerFilter.toLowerCase();
            return (labelLc && labelLc.indexOf(filterLc)) >= 0 ||
                (groupLc && groupLc.indexOf(filterLc) >= 0);
          };

          scope.filterLayers = function() {
            if(scope.layerFilter == '' || scope.layerFilter.length > 2) {
              buildTree();
            }
          };

          scope.filterClear = function() {
            scope.layerFilter = '';
            scope.filterLayers();
          };

        }
      };
    }]);

  module.directive('sxtLayertreeCol', [
    function() {
      return {
        restrict: 'E',
        replace: true,
        scope: {
          collection: '=',
          map: '=map'
        },
        template: "<ul class='sxt-layertree-node'><sxt-layertree-elt ng-repeat='member" +
            " in collection' member='member' map='map'></sxt-layertree-elt></ul>"
      };
    }]);

  module.directive('sxtLayertreeElt', [
    '$compile', '$http', 'gnMap', 'gnMdView',
    function($compile, $http, gnMap, gnMdView) {
      return {
        restrict: 'E',
        replace: true,
        require: '^sxtLayertree',
        scope: {
          member: '=',
          map: '='
        },
        templateUrl: '../../catalog/views/sextant/directives/' +
            'partials/layertreeitem.html',
        link: function(scope, element, attrs, controller) {
          var el = element;
          if (angular.isArray(scope.member.nodes)) {
            element.append("<sxt-layertree-col class='list-group' " +
                "collection='member.nodes' map='map'></sxt-layertree-col>");
            $compile(element.contents())(scope);
          }
          scope.toggleNode = function(evt) {
            el.find('.fa').first().toggleClass('fa-minus-square')
                .toggleClass('fa-plus-square');
            el.children('ul').toggle();
            evt.stopPropagation();
            return false;
          };
          scope.isParentNode = function() {
            return angular.isDefined(scope.member.nodes);
          };

          scope.indexWFSFeatures = function(url, type) {
            $http.get('wfs.harvest?' +
                'uuid=' + '' +
                '&url=' + encodeURIComponent(url) +
                '&typename=' + encodeURIComponent(type))
              .success(function(data) {
                console.log(data);
              }).error(function(response) {
              console.log(response);
            });
            //$http.get('wfs.harvest/' + md['geonet:info'].uuid)
            // .success(function(data) {
            //  console.log(data);
            //}).error(function(response) {
            //  console.log(response);
            //});
          };
          scope.mapService = gnMap;

          scope.setNCWMS = controller.setNCWMS;

          scope.remove = function() {
            scope.map.removeLayer(scope.member);
          };

          if(!scope.isParentNode()) {
            scope.groupCombo = scope.member.get('groupcombo');
            scope.comboGroups = controller.comboGroups;
            scope.switchGroupCombo = controller.switchGroupCombo;

            var d =  scope.member.get('downloads');
            if(angular.isArray(d)) {
              scope.download = d[0];
            }
            scope.process =  scope.member.get('processes');

            var wfs =  scope.member.get('wfs');
            if(angular.isArray(wfs)) {
              scope.wfs = wfs[0];
            }
          }

          scope.addToPanier = function(download) {
            controller.addToPanier(scope.member.get('md'), download);
          };

          scope.showMetadata = function() {
            gnMdView.openMdFromLayer(scope.member);
          };

          scope.showWPS = function(process) {
            controller.setWPS(process, scope.member);
          };

          scope.showWFSFilter = function() {
            controller.setWFSFilter(scope.member, scope.wfs);
          };
       }
      };
    }]);

})();
