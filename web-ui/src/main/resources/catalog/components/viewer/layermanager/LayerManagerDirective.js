(function () {
  goog.provide('gn_layermanager_directive');

  var module = angular.module('gn_layermanager_directive', [
  ]);

    var findChild = function(node, name) {
        var n;
        if(node.nodes) {
            for(var i=0;i<node.nodes.length;i++) {
                n = node.nodes[i];
                if(name == n.name) {
                    return n;
                  }
              }
         }
      };
   var createNode = function(layer, node, g, index) {
       var group = g[index];
       if(group) {
           var newNode = findChild(node, group);
           if(!newNode) {
               newNode = {
                     name: group
               };
             if(!node.nodes) node.nodes = [];
             node.nodes.push(newNode);
           }
         createNode(layer, newNode, g, index+1);
       } else {
         if(!node.nodes) node.nodes = [];
         node.nodes.push(layer);
       }
   };

  /**
   * @ngdoc filter
   * @name gn_wmsimport_directive.filter:gnReverse
   *
   * @description
   * Filter for the gnLayermanager directive's ngRepeat. The filter
   * reverses the array of layers so layers in the layer manager UI
   * have the same order as in the map.
   */
  module.filter('gnReverse', function() {
    return function(items) {
      return items.slice().reverse();
    };
  });

  /**
   * @ngdoc directive
   * @name gn_wmsimport_directive.directive:gnWmsImport
   *
   * @description
   * Panel to load WMS capabilities service and pick layers.
   * The server list is given in global properties.
   */
  module.directive('gnLayermanager', [
    'gnLayerFilters',
    '$filter',
    function (gnLayerFilters, $filter) {
    return {
      restrict: 'A',
      templateUrl: '../../catalog/components/viewer/layermanager/' +
        'partials/layermanagertree.html',
      scope: {
        map: '=gnLayermanagerMap'
      },
      controllerAs: 'gnLayermanagerCtrl',
      controller: [ '$scope', function($scope) {

        /**
         * Change layer index in the map.
         *
         * @param layer
         * @param delta
         */
        this.moveLayer = function(layer, delta) {
          var index = $scope.layers.indexOf(layer);
          var layersCollection = $scope.map.getLayers();
          layersCollection.removeAt(index);
          layersCollection.insertAt(index + delta, layer);
        };

        /**
         * Set a property to the layer 'showInfo' to true and
         * false to all other layers. Used to display layer information
         * in the layer manager.
         *
         * @param layer
         */
        this.showInfo = function(layer) {
          angular.forEach($scope.layers, function(l) {
            if(l != layer){
              l.showInfo = false;
            }
          });
          layer.showInfo = !layer.showInfo;
        }
      }],
      link: function (scope, element, attrs) {

        scope.layers = scope.map.getLayers().getArray();
        scope.layerFilterFn = gnLayerFilters.selected;

        scope.map.getLayers().on('change:length', function(e) {
          scope.layerTree = {
            nodes: []
          };
          var sep = '/';
          var fLayers = $filter('filter')(scope.layers, scope.layerFilterFn);
          for (var i = 0; i < fLayers.length; i++) {
            var l = fLayers[i];
            var groups = l.get('group');
            if (!groups) {
              scope.layerTree.nodes.push(l);
            }
            else {
              var g = groups.split(sep);
              createNode(l, scope.layerTree, g, 1);
            }
          }
        });
      }
    };
  }]);

  module.directive('gnLayertreeCol', [
    function () {
      return {
        restrict: 'E',
        replace: true,
        scope: {
          collection: '='
        },
        template: "<ul class='list-group'><gn-layertree-elt ng-repeat='member in collection' member='member'></gn-layertree-elt></ul>"
      }
    }]);
  module.directive('gnLayertreeElt', [
    '$compile',
    function ($compile) {
      return {
        restrict: "E",
        replace: true,
        require: '^gnLayermanager',
        scope: {
          member: '='
        },
        templateUrl: '../../catalog/components/viewer/layermanager/' +
            'partials/layermanagertreeitem.html',
        link: function (scope, element, attrs, controller) {
          var el = element;
          scope.gnLayermanagerCtrl = controller;
          if (angular.isArray(scope.member.nodes)) {
            element.append("<gn-layertree-col class='list-group' collection='member.nodes'></gn-layertree-col>");
            $compile(element.contents())(scope);
          }
          scope.toggleNode = function(evt) {
            el.find('.fa').first().toggleClass('fa-minus-square-o').toggleClass('fa-plus-square-o');
            el.children('ul').toggle();
            evt.stopPropagation();
            return false;
          };
          scope.isParentNode = function() {
            return angular.isDefined(scope.member.nodes);
          }
        }
      }
    }]);

  module.directive('gnLayermanagerItem', [ 'gnPopup',
    function (gnPopup) {
      return {
        require: '^gnLayermanager',
        restrict: 'A',
        replace: false,
        templateUrl: '../../catalog/components/viewer/layermanager/' +
            'partials/layermanageritem.html',
        scope: true,
        link: function (scope, element, attrs, ctrl) {
          scope.layer = scope.$eval(attrs['gnLayermanagerItem']);
          scope.showInfo = ctrl.showInfo;
          scope.moveLayer = ctrl.moveLayer;

          scope.showMetadata = function(url, title) {
            if(url) {
              gnPopup.create({
                title: title,
                url : 'http://sextant.ifremer.fr/geonetwork/srv/fre/metadata.formatter.html?xsl=mdviewer&style=sextant&url=' + encodeURIComponent(url),
                content: '<div class="gn-popup-iframe">' +
                    '<iframe frameBorder="0" border="0" style="width:100%;height:100%;" src="{{options.url}}" ></iframe>' +
                    '</div>'
              });
            }
          };

          scope.zoomToExtent = function(layer, map) {
            if(layer.get('cextent')) {
              map.getView().fitExtent(layer.get('cextent'), map.getSize());
            }
          };
        }
      };
    }]);
})();
