(function() {
  goog.provide('gn_wfsfilter_service');

  var module = angular.module('gn_wfsfilter_service', [
  ]);

  module.service('wfsFilterService', [
    'gnHttp',
    'gnUrlUtils',
    '$http',
    function(gnHttp, gnUrlUtils, $http) {

      var solrProxyUrl = gnHttp.getService('solrproxy');

      var buildSolrUrl = function(params) {
        return gnUrlUtils.append(solrProxyUrl + '/select',
            gnUrlUtils.toKeyValue(params));
      };

      var getFacetType = function(solrPropName) {
        var type = '';
        if(solrPropName == 'facet_ranges') {
          type = 'range';
        }
        else if(solrPropName == 'facet_intervals') {
          type = 'interval';
        }
        else if(solrPropName == 'facet_fields') {
          type = 'field';
        }
        else if(solrPropName == 'facet_dates') {
          type = 'date';
        }
        return type;
      };

      /**
       * Parse the solr response to create the facet UI config object.
       * Solr reponse contains all values for facets fields, and help to build
       * the facet ui.
       *
       * @param solrData response from solr request
       * @returns {Array} All definition for each field
       */
      var createFacetConfigFromSolr = function(solrData) {
        var fields = [];
        for(var kind in solrData.facet_counts) {
          var facetType = getFacetType(kind);
          for(var fieldProp in solrData.facet_counts[kind]) {
            var field = solrData.facet_counts[kind][fieldProp];
            var facetField = {
              name: fieldProp,
              values: {},
              type: facetType
            };

            if(kind == 'facet_ranges') {
              var counts = field.counts;
              for (var i = 0; i < counts.length; i+=2) {
                if(counts[i+1] > 0) {
                  var label = '';
                  if(i >= counts.length-2) {
                    label = '> ' + counts[i];
                  }
                  else {
                    label = counts[i] + ',' + counts[i+2];
                  }
                  facetField.values[label] = counts[i+1];
                }
              }
              fields.push(facetField);
            }
            else if(kind == 'facet_fields' && field.length > 0) {
              for (var i = 0; i<  field.length; i+=2) {
                facetField.values[field[i]] = field[i+1];
              }
              fields.push(facetField);
            }
            else if(kind == 'facet_intervals' && Object.keys(field).length > 0) {
              facetField.values = field;
              fields.push(facetField);
            }
          }
        }
        return fields;

      };

      /**
       * Create a SLD filter for the facet rule. Those filters while be
       * gathered to create the full SLD filter config to send to the
       * generateSLD service.
       *
       * @param key index key of the field
       * @param type of the facet field (range, field etc..)
       */
      var buildSldFilter = function(key, type) {
        var res;
        if(type == 'interval' || type == 'range') {
          res = {
            filter_type: 'PropertyIsBetween',
            params: key.match(/\d+(?:[.]\d+)*/g)
          }
        }
        else if(type == 'field' ) {
          res = {
            filter_type: 'PropertyIsEqualTo',
            params: [key]
          }
        }
        return res;
      };


      /**
       * Create the generateSLD service config from the facet ui state.
       * @param {Object} facetState represents the choices from the facet ui
       * @returns the sld config object
       */
      this.createSLDConfig = function(facetState) {
        var sldConfig = {
          filters: []
        };

        angular.forEach(facetState, function(attrValue, attrName) {
          var field = {
            // TODO : remove the field type suffix
            field_name: attrName.substr(0,attrName.length-2),
            filter: []
          };
          angular.forEach(attrValue.values, function(v, k) {
            field.filter.push(buildSldFilter(k, attrValue.type));
          });
          sldConfig.filters.push(field);
        });
        return sldConfig;
      };

      /**
       * Get the indexed fields for the given feature
       * @param {string} featureTypeName featuretype name
       * @param {string} wfsUrl url of the wfs service
       * @returns {httpPromise} return array of field names
       */
      this.getWfsIndexFields = function(featureTypeName, wfsUrl) {
        var url = buildSolrUrl({
          rows: 1,
          q: 'featureTypeId:*' + featureTypeName.replace(':', '\\:'),
          wt: 'json'
        });

        return $http.get(url).then(function(response) {
          // TODO: check here is the layer is not indexed
          var fields = Object.keys(response.data.response.docs[0]);
          return fields;
        });
      };

      /**
       * Get the applicationProfile content from the metadata of the given
       * online resource.
       *
       * @param {string} uuid of the metadata
       * @param {string} featureTypeName featuretype name
       * @param {string} wfsUrl url of the wfs service
       */
      this.getApplicationProfile = function(uuid, featureTypeName, wfsUrl) {
        return gnHttp.callService('wfsIndexConfig', {
          uuid: uuid,
          url: wfsUrl,
          typename: featureTypeName
        });
      };

      /**
       * Build the solr request that will be used for generating the facet ui.
       * The request is build from features attributes index fields.
       * This is the generic way used if the application profile is null
       *
       * @param {Array} fields array of the field names
       * @param {string} featureTypeName featuretype name
       * @param {string} wfsUrl url of the wfs service
       * @returns {string} solr url
       */
      this.getSolrRequestFromFields = function(fields, featureTypeName, wfsUrl) {
        var url = buildSolrUrl({
          rows: 0,
          q: 'featureTypeId:*' + featureTypeName.replace(':', '\\:'),
          wt: 'json',
          facet: 'true',
          "facet.mincount" : 1
        });

        // don't build facet on useless fields
        // * manager field eg. id
        // * common field irrelevant for facet like the_geom
        var listOfFieldsToExclude = ['geom', 'the_geom', 'ms_geometry',
          'id', '_version_', 'featuretypeid', 'doctype'];
        angular.forEach(fields, function(f) {
          var fname = f.toLowerCase();
          if($.inArray(fname, listOfFieldsToExclude) === -1) {
            url += '&facet.field=' + f;
          }
        });
        return url;
      };

      /**
       * Build solr request from config of the applicationProfile.
       * This config determines what fields to have in facet, and gives
       * interval and range properties.
       *
       * @param {Object} config the applicationProfile definition
       * @param {string} featureTypeName featuretype name
       * @param {string} wfsUrl url of the wfs service
       */
      this.getSolrRequestFromApplicationProfile =
          function(config,featureTypeName, wfsUrl) {

            var url = buildSolrUrl({
              rows: 0,
              q: 'featureTypeId:*' + featureTypeName.replace(':', '\\:'),
              wt: 'json',
              facet: 'true',
              "facet.mincount" : 1
            });

            angular.forEach(config.fields, function(field) {
              var p = '&facet.field=' + field.name;
              angular.forEach(field.fq, function(v, k) {
                if(angular.isString(v)) {
                  p += '&' + k + '=' + v;
                }
                else if(angular.isArray(v)) {
                  angular.forEach(v, function(range) {
                    p += '&f.' + field.name + '.' + k + '=' + range;
                  });
                }
              });
              url += p;
            });

            return url;
          };

      /**
       * Call solr request to get info about facet to build.
       * Then build the facet ui config from the response.
       *
       * @param {string} url of the solr request
       * @returns {httpPromise} return facet ui config
       */
      this.getFacetsConfigFromSolr = function(url) {

        return $http.get(url).then(function(solrResponse) {
          return createFacetConfigFromSolr(solrResponse.data);
        });
      };

      /**
       * Update solr url depending on the current facet ui selection state.
       * Each time a facet is selected, we trigger a new search on the index
       * to build the facet ui again with updated occurencies.
       *
       * Will build the solr Q query like:
       *  +(LABEL_s:"Abyssal" LABEL_s:Infralittoral)
       *  +featureTypeId:*IFR_AAMP_ZONES_BIO_ATL_P
       *
       * @param {string} url of the base solr url
       * @param {object} facetState strcture representing ui selection
       * @returns {string} the updated url
       */
      this.updateSolrUrl = function(url, facetState) {
        var fieldsQ = [];

        angular.forEach(facetState, function(field, fieldName) {
          var valuesQ = [];
          for (var p in field.values) {
            valuesQ.push(fieldName + ':"' + p + '"');
          }
          if(valuesQ.length) {
            fieldsQ.push('+(' + valuesQ.join(' ') + ')');
          }
        });
        if(fieldsQ.length) {
          url = url.replace('&q=', '&q=' +
              encodeURIComponent(fieldsQ.join(' ') + ' +'));
        }
        return url;
      };

      /**
       * Call generateSLD service to create the SLD and get an url to reach it.
       *
       * @param {Object} rulesObj strcture of the SLD rules to apply
       * @param {string} wfsUrl url of the WFS service
       * @param {string} featureTypeName of the featuretype
       * @returns {HttpPromise} promise
       */
      this.getSldUrl = function(rulesObj, wfsUrl, featureTypeName) {

        var params = {
          filters: JSON.stringify(rulesObj),
          serverURL: wfsUrl.replace('/wfs', '/wms'), // TODO: this may be wrong
          layers: featureTypeName
        };

        return gnHttp.callService('generateSLD', undefined, {
          method: 'POST',
          data: $.param(params),
          headers: {'Content-Type': 'application/x-www-form-urlencoded'}
        });
      };

      /**
       * Run the indexation of the feature
       *
       * @param {string} wfs service url
       * @param {string} featuretype name
       * @returns {httpPromise} when indexing is done
       */
      this.indexWFSFeatures = function(url, type) {
        return $http.get('wfs.harvest?' +
            'uuid=' + '' +
            '&url=' + encodeURIComponent(url) +
            '&typename=' + encodeURIComponent(type))
            .success(function (data) {
              console.log(data);
            }).error(function (response) {
              console.log(response);
            });
      };
    }]);
})();
