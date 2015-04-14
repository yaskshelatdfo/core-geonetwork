(function() {
  goog.provide('gn_facets_service');


  var module = angular.module('gn_facets_service', []);

  /**
   * TODO: Translate indexkey/facetkey
   */
  module.factory('gnFacetService', [
    '$translate',
    function($translate) {

      var add = function(currentFacets, field, value, label, reset) {
        var facet = {
          value: value,
          label: label || value,
          field: field
        };
        for(var i=0;i<currentFacets.length;i++) {
          if(currentFacets[i].field == facet.field &&
              currentFacets[i].value == facet.value) return;
        }
        currentFacets.push(facet);
      };

      var remove = function(facets, facet) {
        var index = -1;
        for (var i = 0; i < facets.length; ++i) {
          if (facets[i].field == facet.field &&
              facets[i].value == facet.value) {
            index = i;
          }
        }
        if (index >= 0) {
          facets.splice(index, 1);
        }
      };

      /**
       * Get search parameters from facets object.
       * Facet object is usually stored in the searchFrom controller
       *
       * @param {Array} facets
       * @return {Object} search parameters object
       */
      var getParamsFromFacets = function(facets) {
        var params = {};
        angular.forEach(facets, function(facet) {
          if (angular.isArray(params[facet.field])) {
            params[facet.field].push(facet.value);
          }
          else if (angular.isDefined(params[facet.field])) {
            params[facet.field] = [params[facet.field], facet.value];
          }
          else {
            params[facet.field] = facet.value;
          }
        });
        return params;
      };

      var removeFacetsFromParams = function(facets, params) {
        angular.forEach(facets, function(f) {
          var keep = false;
          for (p in params) {
            if (p == f.field) {
              if(params[p] == f.value ||(angular.isArray(params[p]) &&
                  params[p].indexOf(f.value) >= 0)) {
                keep = true;
              }
            }
          }
          if(!keep) {
            remove(facets, f);
          }

        });
      };

      return {
        add: add,
        remove: remove,
        getParamsFromFacets: getParamsFromFacets,
        removeFacetsFromParams: removeFacetsFromParams
      };
    }
  ]);
})();
