(function() {
  goog.provide('gn_harvest_controller');





  goog.require('gn_category');
  goog.require('gn_harvester');
  goog.require('gn_importxsl');

  var module = angular.module('gn_harvest_controller',
      ['gn_harvester', 'gn_category', 'gn_importxsl']);


  /**
   *
   */
  module.controller('GnHarvestController', [
    '$scope', '$http', '$translate', '$injector', '$rootScope',
    'gnSearchManagerService', 'gnUtilityService',
    function($scope, $http, $translate, $injector, $rootScope,
             gnSearchManagerService, gnUtilityService) {

      $scope.pageMenu = {
        folder: 'harvest/',
        defaultTab: 'harvest',
        tabs: []
      };
      $scope.searchObj = {
        params: {
          template: 'y or s or n',
          sortBy: 'title'
        }};

      $scope.harvesterTypes = {};
      $scope.harvesters = null;
      $scope.harvesterSelected = null;
      $scope.harvesterUpdated = false;
      $scope.harvesterNew = false;
      $scope.harvesterHistory = {};
      $scope.harvesterHistoryPaging = {
        page: 1,
        size: 3,
        pages: 0,
        total: 0
      };
      $scope.isLoadingHarvester = false;
      $scope.isLoadingHarvesterHistory = false;


      var unbindStatusListener = null;

      function loadHarvesters() {
        $scope.isLoadingHarvester = true;
        $scope.harvesters = null;

        return $http.get('admin.harvester.list?_content_type=json').success(
            function(data) {
              if (data != 'null') {
                $scope.harvesters = data;
                gnUtilityService.parseBoolean($scope.harvesters);
                pollHarvesterStatus();
              }
              $scope.isLoadingHarvester = false;
            }).error(function(data) {
          // TODO
          $scope.isLoadingHarvester = false;
        });
      }

      var getRunningHarvesterIds = function() {
        var runningHarvesters = [];
        for (var i = 0; $scope.harvesters && i < $scope.harvesters.length; i++) {
          var h = $scope.harvesters[i];
          if (h.info.running) {
            runningHarvesters.push(h['@id']);
          }
        }

        return runningHarvesters;
      };
      var isPolling = false;
      var pollHarvesterStatus = function() {
        if (isPolling) {
          return;
        }
        var runningHarvesters = getRunningHarvesterIds();
        if (runningHarvesters.length == 0) {
          return;
        }
        isPolling = true;

        $http.get('admin.harvester.list?onlyInfo=true&_content_type=json&id='+runningHarvesters.join("&id=")).success(
          function(data) {
            isPolling = false;
            if (data != 'null') {
              if (!angular.isArray(data)) {
                data = [data];
              }
              var harvesterIndex = {};
              angular.forEach($scope.harvesters, function(oldH) {
                harvesterIndex[oldH['@id']] = oldH;
              });

              for (var i = 0; i < data.length; i++) {
                var h = data[i];
                gnUtilityService.parseBoolean(h.info);
                var old = harvesterIndex[h['@id']];
                if (old && !angular.equals(old.info, h.info)) {
                  old.info = h.info;
                }
                if (old && !angular.equals(old.error, h.error)) {
                  old.error = h.error;
                }
              }

              setTimeout(pollHarvesterStatus, 5000);
            }
          }).error(function(data) {
            isPolling = false;
          });
      };

      function loadHistory(backgroundLoad) {
        var page, size, uuid;
        page = $scope.harvesterHistoryPaging.page - 1;
        size = $scope.harvesterHistoryPaging.size;
        uuid = $scope.harvesterSelected.site.uuid;
        var list;
        $scope.isLoadingHarvesterHistory = true;
        if (!backgroundLoad) {
          $scope.harvesterHistory = undefined;
        } else {
          list = $('ul.timeline, .timeline-panel');
          list.addClass('loading');
        }
        $http.get('admin.harvester.history?uuid=' + uuid + '&page=' +
            page + '&size=' + size + '&_content_type=json').success(
            function(data) {
              $scope.harvesterHistory = data.harvesthistory;
              $scope.harvesterHistoryPaging.pages = parseInt(data.pages);
              $scope.harvesterHistoryPaging.total = parseInt(data.total);
              $scope.isLoadingHarvesterHistory = false;
              if (list) {
                list.removeClass('loading');
              }
            }).error(function(data) {
          // TODO
          $scope.isLoadingHarvesterHistory = false;
        });
      }

      $scope.historyFirstPage = function() {
        $scope.harvesterHistoryPaging.page = 1;
        loadHistory(true);
      };
      $scope.historyLastPage = function() {
        $scope.harvesterHistoryPaging.page =
            $scope.harvesterHistoryPaging.pages;
        loadHistory(true);
      };
      $scope.historyNextPage = function() {
        $scope.harvesterHistoryPaging.page = Math.min(
            $scope.harvesterHistoryPaging.pages,
            $scope.harvesterHistoryPaging.page + 1);
        loadHistory(true);
      };
      $scope.historyPreviousPage = function() {
        $scope.harvesterHistoryPaging.page = Math.max(1,
            $scope.harvesterHistoryPaging.page - 1);
        loadHistory(true);
      };
      function loadHarvesterTypes() {
        $http.get('admin.harvester.info@json?type=harvesterTypes',
            {cache: true})
          .success(function(data) {
              angular.forEach(data[0], function(value) {
                $scope.harvesterTypes[value] = {
                  label: value,
                  text: $translate('harvester-' + value)
                };
                $.getScript('../../catalog/templates/admin/harvest/type/' +
                    value + '.js')
                .done(function(script, textStatus) {
                      $scope.$apply(function() {
                        $scope.harvesterTypes[value].loaded = true;
                      });
                      // FIXME: could we make those harvester specific
                      // function a controller
                    })
                .fail(function(jqxhr, settings, exception) {
                      $scope.harvesterTypes[value].loaded = false;
                    });
              });
            }).error(function(data) {
              // TODO
            });
      }

      $scope.getTplForHarvester = function() {
        // TODO : return view by calling harvester ?
        if ($scope.harvesterSelected) {
          return '../../catalog/templates/admin/' + $scope.pageMenu.folder +
              'type/' + $scope.harvesterSelected['@type'] + '.html';
        } else {
          return null;
        }
      };
      $scope.updatingHarvester = function() {
        $scope.harvesterUpdated = true;
      };
      $scope.addHarvester = function(type) {
        $scope.harvesterNew = true;
        $scope.harvesterHistory = {};
        $scope.harvesterSelected = window['gnHarvester' + type].createNew();
      };

      $scope.cloneHarvester = function(id) {
        $http.get('admin.harvester.clone@json?id=' +
            id)
          .success(function(data) {
              loadHarvesters().then(function() {
                // Select the clone
                angular.forEach($scope.harvesters, function(h) {
                  if (h['@id'] === data[0]) {
                    $scope.selectHarvester(h);
                  }
                });
              });
            }).error(function(data) {
              // TODO
            });
      };

      $scope.buildTranslations = function(h) {
        var translations = '';
        angular.forEach(h.site.translations, function(value, key) {
          translations += '<' + key + '>' + value + '</' + key + '>';
        });
        return "<translations>" + translations + "</translations>";
      };
      $scope.buildResponseGroup = function(h) {
        var groups = '';
        angular.forEach(h.privileges, function(p) {
          var ops = '';
          angular.forEach(p.operation, function(o) {
            ops += '<operation name="' + o['@name'] + '"/>';
          });
          groups +=
              '<group id="' + p['@id'] + '">' + ops + '</group>';
        });
        return '<privileges>' + groups + '</privileges>';
      };
      $scope.buildResponseCategory = function(h) {
        var cats = '';
        angular.forEach(h.categories, function(c) {
          cats +=
              '<category id="' + c['@id'] + '"/>';
        });
        return '<categories>' + cats + '</categories>';
      };


      $scope.saveHarvester = function() {
        // Activate or disable it
        $scope.setHarvesterSchedule();

        var body = window['gnHarvester' + $scope.harvesterSelected['@type']]
          .buildResponse($scope.harvesterSelected, $scope);

        $http.post('admin.harvester.' +
            ($scope.harvesterNew ? 'add' : 'update') +
            '?_content_type=json', body, {
              headers: {'Content-type': 'application/xml'}
            }).success(function(data) {
          if (!$scope.harvesterSelected['@id']) {
            $scope.harvesterSelected['@id'] = data[0];
          }
          loadHarvesters().then(refreshSelectedHarvester);
          $rootScope.$broadcast('StatusUpdated', {
            msg: $translate('harvesterUpdated'),
            timeout: 2,
            type: 'success'});
        }).error(function(data) {
          $rootScope.$broadcast('StatusUpdated', {
            msg: $translate('harvesterUpdated'),
            error: data,
            timeout: 2,
            type: 'danger'});
        });
      };
      $scope.selectHarvester = function(h) {

        // TODO: Specific to thredds
        if (h['@type'] === 'thredds') {

          $scope.threddsCollectionsMode =
              h.options.outputSchemaOnAtomicsDIF !== '' ? 'DIF' : 'UNIDATA';
          $scope.threddsAtomicsMode =
              h.options.outputSchemaOnCollectionsDIF !== '' ? 'DIF' : 'UNIDATA';


        }
        $scope.harvesterSelected = h;
        $scope.harvesterUpdated = false;
        $scope.harvesterNew = false;
        $scope.harvesterHistory = {};
        $scope.searchResults = null;

        loadHistory();

        // Retrieve records in that harvester
        angular.extend($scope.searchObj.params, {
          siteId: $scope.harvesterSelected.site.uuid
        });
        $scope.$broadcast('resetSearch', $scope.searchObj.params);
      };
      var refreshSelectedHarvester = function() {
        if ($scope.harvesterSelected) {
          // Refresh the selected harvester
          angular.forEach($scope.harvesters, function(h) {
            if (h['@id'] === $scope.harvesterSelected['@id']) {
              $scope.selectHarvester(h);
            }
          });
        }
      };
      $scope.refreshHarvester = function() {
        loadHarvesters().then(function() {
          // Select the clone
          angular.forEach($scope.harvesters, function(h) {
            if (h['@id'] === $scope.harvesterSelected['@id']) {
              $scope.selectHarvester(h);
            }
          });
        });
      };
      $scope.deleteHarvester = function() {
        $http.get('admin.harvester.remove?_content_type=json&id=' +
            $scope.harvesterSelected['@id'])
          .success(function(data) {
              $scope.harvesterSelected = {};
              $scope.harvesterUpdated = false;
              $scope.harvesterNew = false;
              loadHarvesters();
            }).error(function(data) {
              console.log(data);
            });
      };

      $scope.deleteHarvesterRecord = function() {
        $http.get('admin.harvester.clear?_content_type=json&id=' +
            $scope.harvesterSelected['@id'])
          .success(function(data) {
              $scope.harvesterSelected = {};
              $scope.harvesterUpdated = false;
              $scope.harvesterNew = false;
              loadHarvesters();
            }).error(function(data) {
              console.log(data);
            });
      };
      $scope.runHarvester = function() {
        $http.get('admin.harvester.run?_content_type=json&id=' +
            $scope.harvesterSelected['@id'])
          .success(function(data) {
              loadHarvesters().then(function() {refreshSelectedHarvester();});
            });
      };
      $scope.stopping = false;
      $scope.stopHarvester = function() {
        var status = $scope.harvesterSelected.options.status;
        var id = $scope.harvesterSelected['@id'];
        $scope.stopping = true;
        $http.get('admin.harvester.stop?_content_type=json&id=' +
            id + '&status=' + status)
          .success(function(data) {
              loadHarvesters().then(refreshSelectedHarvester);
            }).then(function() {
              $scope.stopping = false;
            });
      };

      $scope.setHarvesterSchedule = function() {
        if (!$scope.harvesterSelected) {
          return;
        }
        var status = $scope.harvesterSelected.options.status;
        $http.get('admin.harvester.' +
            (status === 'active' ? 'start' : 'stop') +
            '@json?id=' +
            $scope.harvesterSelected['@id'])
          .success(function(data) {

            }).error(function(data) {
              $rootScope.$broadcast('StatusUpdated', {
                title: $translate('harvesterSchedule' + status),
                error: data,
                timeout: 0,
                type: 'danger'});
            });
      };

      // Register status listener
      //unbindStatusListener =
      // $scope.$watch('harvesterSelected.options.status',
      //    function() {
      //      $scope.setHarvesterSchedule();
      //    });

      loadHarvesters();
      loadHarvesterTypes();


      // ---------------------------------------
      // Those function are harvester dependant and
      // should move in the harvester code
      // TODO
      $scope.geonetworkGetSources = function(url) {
        $http.get($scope.proxyUrl +
            encodeURIComponent(url + '/srv/eng/info?type=sources'))
          .success(function(data) {
              $scope.geonetworkSources = [];
              var i = 0;
              var xmlDoc = $.parseXML(data);
              var $xml = $(xmlDoc);
              $sources = $xml.find('uuid');
              $names = $xml.find('name');

              angular.forEach($sources, function(s) {
                // FIXME: probably some issue on IE ?
                $scope.geonetworkSources.push({
                  uuid: s.textContent,
                  name: $names[i].textContent
                });
                i++;
              });
            }).error(function(data) {
              // TODO
            });
      };

      // TODO: Should move to OAIPMH
      $scope.oaipmhSets = null;
      $scope.oaipmhPrefix = null;
      $scope.oaipmhInfo = null;
      $scope.oaipmhGet = function() {
        $scope.oaipmhInfo = null;
        var body = '<request><type url="' +
            $scope.harvesterSelected.site.url +
            '">oaiPmhServer</type></request>';
        $http.post('admin.harvester.info@json', body, {
          headers: {'Content-type': 'application/xml'}
        }).success(function(data) {
          if (data[0].sets && data[0].formats) {
            $scope.oaipmhSets = data[0].sets;
            $scope.oaipmhPrefix = data[0].formats;
          } else {
            $scope.oaipmhInfo = $translate('oaipmh-FailedToGetSetsAndPrefix');
          }
        }).error(function(data) {
        });
      };

      // TODO : enable watch only if OAIPMH
      $scope.$watch('harvesterSelected.site.url', function() {
        if ($scope.harvesterSelected &&
            $scope.harvesterSelected['@type'] === 'oaipmh') {
          $scope.oaipmhGet();
        }
      });

      // TODO: Should move to a CSW controller
      $scope.cswCriteria = [];
      $scope.cswCriteriaInfo = null;

      /**
       * Retrieve GetCapabilities document to retrieve
       * the list of possible search fields declared
       * in *Queryables.
       *
       * If the service is unavailable for a while and a user
       * go to the admin page, it may loose its filter.
       */
      $scope.cswGetCapabilities = function() {
        $scope.cswCriteriaInfo = null;

        if ($scope.harvesterSelected &&
            $scope.harvesterSelected.site &&
            $scope.harvesterSelected.site.capabilitiesUrl) {


          var url = $scope.harvesterSelected.site.capabilitiesUrl;

          // Add GetCapabilities if not already in URL
          // Parameter value is case sensitive.
          // Append a ? if not already in there and if not &
          if (url.indexOf('GetCapabilities') === -1) {
            url += (url.indexOf('?') === -1 ? '?' : '&') +
                'SERVICE=CSW&REQUEST=GetCapabilities&VERSION=2.0.2';
          }

          $http.get($scope.proxyUrl +
              encodeURIComponent(url))
            .success(function(data) {
                $scope.cswCriteria = [];

                var i = 0;
                try {
                  var xmlDoc = $.parseXML(data);

                  // Create properties in model if no criteria defined
                  if (!$scope.harvesterSelected.searches) {
                    $scope.harvesterSelected.searches = [{}];
                  }

                  var $xml = $(xmlDoc);
                  var matches = ['SupportedISOQueryables',
                    'SupportedQueryables',
                    'AdditionalQueryables'];
                  var parseCriteriaFn = function() {
                    // If the queryable has a namespace,
                    // replace the : with __
                    // to make valid XML tag name
                    var name = $(this).text().replace(':', '__');
                    $scope.cswCriteria.push(name);
                    if (!$scope.harvesterSelected.searches[0][name]) {
                      $scope.harvesterSelected.searches[0][name] =
                          {value: ''};
                    }
                  };
                  var parseQueryablesFn = function() {
                    if (matches.indexOf($(this).attr('name')) !== -1) {

                      // Add all queryables to the list of possible parameters
                      // and to the current harvester if not exist.
                      // When harvester is saved only criteria with
                      // value will be saved.
                      $(this).find('Value').each(parseCriteriaFn);
                      $(this).find('ows\\:Value').each(parseCriteriaFn);
                    }
                  };
                  // For Chrome and IE
                  $xml.find('Constraint').each(parseQueryablesFn);
                  // For FF, namespace parsing is different
                  if ($scope.cswCriteria.length === 0) {
                    $xml.find('ows\\:Constraint').each(parseQueryablesFn);
                  }

                  $scope.cswCriteria.sort();

                } catch (e) {
                  $scope.cswCriteriaInfo =
                      $translate('csw-FailedToParseCapabilities');
                }

              }).error(function(data) {
                // TODO
              });
        }
      };

      $scope.$watch('harvesterSelected.site.capabilitiesUrl', function() {
        $scope.cswGetCapabilities();
      });




      // WFS GetFeature harvester
      $scope.harvesterTemplates = null;
      var loadHarvesterTemplates = function() {
        $http.get('info@json?type=templates')
          .success(function(data) {
              $scope.harvesterTemplates = data.templates;
            });
      };


      $scope.harvesterGetFeatureXSLT = null;
      var wfsGetFeatureXSLT = function() {
        $scope.oaipmhInfo = null;
        var body = '<request><type>wfsFragmentStylesheets</type><schema>' +
            $scope.harvesterSelected.options.outputSchema +
            '</schema></request>';
        $http.post('admin.harvester.info@json', body, {
          headers: {'Content-type': 'application/xml'}
        }).success(function(data) {
          $scope.harvesterGetFeatureXSLT = data[0];
        });
      };


      // When schema change reload the available XSLTs and templates
      $scope.$watch('harvesterSelected.options.outputSchema', function() {
        if ($scope.harvesterSelected &&
            $scope.harvesterSelected['@type'] === 'wfsfeatures') {
          wfsGetFeatureXSLT();
          loadHarvesterTemplates();
        }
      });


      // Z3950 GetFeature harvester
      $scope.harvesterZ3950repositories = null;
      var loadHarvesterZ3950Repositories = function() {
        $http.get('info@json?type=z3950repositories', {cache: true})
          .success(function(data) {
              $scope.harvesterZ3950repositories = data.z3950repositories;
            });
      };
      $scope.$watch('harvesterSelected.site.repositories',
          function() {
            if ($scope.harvesterSelected &&
                $scope.harvesterSelected['@type'] === 'z3950') {
              loadHarvesterZ3950Repositories();
            }
          });



      // Thredds
      $scope.threddsCollectionsMode = 'DIF';
      $scope.threddsAtomicsMode = 'DIF';
      $scope.harvesterThreddsXSLT = null;
      var threddsGetXSLT = function() {
        $scope.oaipmhInfo = null;
        var opt = $scope.harvesterSelected.options;
        var schema = ($scope.threddsCollectionsMode === 'DIF' ?
            opt.outputSchemaOnCollectionsDIF :
            opt.outputSchemaOnCollectionsFragments);
        var body = '<request><type>threddsFragmentStylesheets</type><schema>' +
            schema +
            '</schema></request>';
        $http.post('admin.harvester.info@json', body, {
          headers: {'Content-type': 'application/xml'}
        }).success(function(data) {
          $scope.harvesterThreddsXSLT = data[0];
        });
      };
      $scope.$watch('harvesterSelected.options.outputSchemaOnCollectionsDIF',
          function() {
            if ($scope.harvesterSelected &&
                $scope.harvesterSelected['@type'] === 'thredds') {
              threddsGetXSLT();
              loadHarvesterTemplates();
            }
          });
      $scope.$watch(
          'harvesterSelected.options.outputSchemaOnCollectionsFragments',
          function() {
            if ($scope.harvesterSelected &&
                $scope.harvesterSelected['@type'] === 'thredds') {
              threddsGetXSLT();
              loadHarvesterTemplates();
            }
          });
      $scope.getHarvesterTypes = function() {
        var array = [];
        angular.forEach($scope.harvesterTypes, function(h) {
          array.push(h);
        });
        return array;
      };
    }]);

})();
