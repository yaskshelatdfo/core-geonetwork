<?xml version="1.0" encoding="UTF-8"?>
<!--  
Stylesheet used to update metadata for a service and 
attached it to the metadata for data.
-->
<xsl:stylesheet version="2.0" xmlns:gmd="http://www.isotc211.org/2005/gmd"
    xmlns:gco="http://www.isotc211.org/2005/gco" xmlns:gts="http://www.isotc211.org/2005/gts"
    xmlns:gml="http://www.opengis.net/gml" xmlns:srv="http://www.isotc211.org/2005/srv"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:xlink="http://www.w3.org/1999/xlink"
    xmlns:date="http://exslt.org/dates-and-times">

    <!-- ============================================================================= -->

    <xsl:param name="uuidref"/>
    <xsl:param name="extra_metadata_uuid"/>
    <xsl:param name="protocol" select="'OGC:WMS-1.1.1-http-get-map'"/>
    <xsl:param name="url"/>
    <xsl:param name="name"/>
    <xsl:param name="desc"/>
    
    <!-- ============================================================================= -->

    <xsl:template match="/gmd:MD_Metadata|*[@gco:isoType='gmd:MD_Metadata']">
        <xsl:copy>
            <xsl:copy-of select="@*"/>
            <xsl:copy-of
                select="gmd:fileIdentifier|
            gmd:language|
            gmd:characterSet|
            gmd:parentIdentifier|
            gmd:hierarchyLevel|
            gmd:hierarchyLevelName|
            gmd:contact|
            gmd:dateStamp|
            gmd:metadataStandardName|
            gmd:metadataStandardVersion|
            gmd:dataSetURI|
            gmd:locale|
            gmd:spatialRepresentationInfo|
            gmd:referenceSystemInfo|
            gmd:metadataExtensionInfo|
            gmd:identificationInfo|
            gmd:contentInfo"/>

            <xsl:choose>
                <xsl:when
                    test="gmd:identificationInfo/srv:SV_ServiceIdentification|
                gmd:identificationInfo/*[@gco:isoType='srv:SV_ServiceIdentification']">
                    <xsl:copy-of select="gmd:distributionInfo"/>
                </xsl:when>
                <!-- In a dataset add a link in the distribution section -->
                <xsl:otherwise>
                    <gmd:distributionInfo>
                        <gmd:MD_Distribution>
                            <xsl:copy-of
                                select="gmd:distributionInfo/gmd:MD_Distribution/gmd:distributionFormat"/>
                            <xsl:copy-of
                                select="gmd:distributionInfo/gmd:MD_Distribution/gmd:distributor"/>
                            
                            <xsl:apply-templates mode="onlinecopy" select="//extra/gmd:MD_Metadata/gmd:identificationInfo/gmd:MD_DataIdentification/gmd:citation/gmd:CI_Citation/
                                gmd:citedResponsibleParty"/>
                            <gmd:transferOptions>
                                <gmd:MD_DigitalTransferOptions>
                                    <xsl:copy-of
                                        select="gmd:distributionInfo/gmd:MD_Distribution/gmd:transferOptions[1]/gmd:MD_DigitalTransferOptions/gmd:unitsOfDistribution"/>
                                    <xsl:copy-of
                                        select="gmd:distributionInfo/gmd:MD_Distribution/gmd:transferOptions[1]/gmd:MD_DigitalTransferOptions/gmd:transferSize"/>
                                    <xsl:copy-of
                                        select="gmd:distributionInfo/gmd:MD_Distribution/gmd:transferOptions[1]/gmd:MD_DigitalTransferOptions/gmd:onLine"/>
                                    
                                    
                                    <!-- Add all online source from the target metadata to the
                                    current one -->
                                    <xsl:if test="//extra">
                                      <xsl:apply-templates mode="onlinecopy" select="//extra//gmd:onLine"/>
                                    </xsl:if>
                                    
                                    <xsl:if test="$url">
                                        <gmd:onLine>
                                            <xsl:if test="$uuidref">
                                                <xsl:attribute name="uuidref" select="$uuidref"/>
                                            </xsl:if>
                                            <gmd:CI_OnlineResource>
                                                <gmd:linkage>
                                                    <gmd:URL>
                                                    <xsl:value-of select="$url"/>
                                                    </gmd:URL>
                                                </gmd:linkage>
                                                <gmd:protocol>
                                                    <gco:CharacterString>
                                                    <xsl:value-of select="$protocol"/>
                                                    </gco:CharacterString>
                                                </gmd:protocol>
                                                <gmd:name>
                                                    <gco:CharacterString>
                                                    <xsl:value-of select="$name"/>
                                                    </gco:CharacterString>
                                                </gmd:name>
                                                <gmd:description>
                                                    <gco:CharacterString>
                                                    <xsl:value-of select="$desc"/>
                                                    </gco:CharacterString>
                                                </gmd:description>
                                            </gmd:CI_OnlineResource>
                                        </gmd:onLine>
                                    </xsl:if>
                                    <xsl:copy-of
                                        select="gmd:distributionInfo/gmd:MD_Distribution/gmd:transferOptions[1]/gmd:MD_DigitalTransferOptions/gmd:offLine"
                                    />
                                </gmd:MD_DigitalTransferOptions>
                            </gmd:transferOptions>
                            <xsl:copy-of
                                select="gmd:distributionInfo/gmd:MD_Distribution/gmd:transferOptions[position() > 1]"
                            />
                        </gmd:MD_Distribution>
                        
                    </gmd:distributionInfo>
                </xsl:otherwise>
            </xsl:choose>
            
            <xsl:copy-of
                select="gmd:dataQualityInfo|
            gmd:portrayalCatalogueInfo|
            gmd:metadataConstraints|
            gmd:applicationSchemaInfo|
            gmd:metadataMaintenance|
            gmd:series|
            gmd:describes|
            gmd:propertyType|
            gmd:featureType|
            gmd:featureAttribute"/>
            
        </xsl:copy>
    </xsl:template>
    
    
    <!-- Copy dataset distributor -->
    <xsl:template match="gmd:citedResponsibleParty" mode="onlinecopy">
        <xsl:variable name="email" select="gmd:CI_ResponsibleParty/gmd:contactInfo/gmd:CI_Contact/
            gmd:address/gmd:CI_Address/gmd:electronicMailAddress/gco:CharacterString"></xsl:variable>
        
        <xsl:if test="count(/gmd:MD_Metadata/gmd:distributionInfo/gmd:MD_Distribution/
            gmd:distributor/gmd:MD_Distributor/gmd:distributorContact/gmd:CI_ResponsibleParty
            [gmd:contactInfo/gmd:CI_Contact/
            gmd:address/gmd:CI_Address/gmd:electronicMailAddress/gco:CharacterString = $email]) = 0">
            <gmd:distributor>
                <gmd:MD_Distributor>
                    <gmd:distributorContact>
                        <xsl:copy-of select="*"/>
                    </gmd:distributorContact>
                </gmd:MD_Distributor>
            </gmd:distributor>
        </xsl:if>
    </xsl:template>
    
    
    <!-- MOTU specific (https://forge.ifremer.fr/mantis/view.php?id=14241) -->
    <xsl:template match="gmd:onLine[gmd:CI_OnlineResource/gmd:protocol/gco:CharacterString='MYO:MOTU-SUB']" mode="onlinecopy" priority="2">
        <xsl:copy>
            <xsl:choose>
                <xsl:when test="../../../../../gmd:fileIdentifier/gco:CharacterString">
                    <xsl:attribute name="uuidref" select="../../../../../gmd:fileIdentifier/gco:CharacterString"/>
                </xsl:when>
                <xsl:when test="$extra_metadata_uuid">
                    <xsl:attribute name="uuidref" select="$extra_metadata_uuid"/>
                </xsl:when>
            </xsl:choose>
            <gmd:CI_OnlineResource>
                <gmd:linkage>
                    <gmd:URL>
                        <xsl:value-of select="concat(gmd:CI_OnlineResource/gmd:linkage/gmd:URL,
                            '&amp;action=productdownloadhome&amp;service=http%3A%2F%2Fpurl.org%2Fmyocean%2Fontology%2Fservice%2Fdatabase%23', 
                             /gmd:MD_Metadata/gmd:fileIdentifier/gco:CharacterString,
                            '-TDS')"/>
                    </gmd:URL>
                </gmd:linkage>
                <xsl:copy-of select="gmd:protocol|gmd:name|gmd:description"/>
            </gmd:CI_OnlineResource>
        </xsl:copy>
    </xsl:template>
    
    <xsl:template match="gmd:onLine[gmd:CI_OnlineResource/gmd:protocol/gco:CharacterString='MYO:MOTU-DGF']" mode="onlinecopy" priority="2">
        <xsl:copy>
            <xsl:choose>
                <xsl:when test="../../../../../gmd:fileIdentifier/gco:CharacterString">
                    <xsl:attribute name="uuidref" select="../../../../../gmd:fileIdentifier/gco:CharacterString"/>
                </xsl:when>
                <xsl:when test="$extra_metadata_uuid">
                    <xsl:attribute name="uuidref" select="$extra_metadata_uuid"/>
                </xsl:when>
            </xsl:choose>
            <gmd:CI_OnlineResource>
                <gmd:linkage>
                    <gmd:URL>
                        <xsl:value-of select="concat(gmd:CI_OnlineResource/gmd:linkage/gmd:URL,
                            '&amp;action=productdownloadhome&amp;service=http%3A%2F%2Fpurl.org%2Fmyocean%2Fontology%2Fservice%2Fdatabase%23', 
                            /gmd:MD_Metadata/gmd:fileIdentifier/gco:CharacterString,
                            '-FILE')"/>
                    </gmd:URL>
                </gmd:linkage>
                <xsl:copy-of select="gmd:protocol|gmd:name|gmd:description"/>
            </gmd:CI_OnlineResource>
        </xsl:copy>
    </xsl:template>
    
    <!-- Copy for non MOTU -->
    <xsl:template match="gmd:onLine" mode="onlinecopy">
      <xsl:copy>
          <xsl:choose>
              <xsl:when test="../../../../../gmd:fileIdentifier/gco:CharacterString">
                  <xsl:attribute name="uuidref" select="../../../../../gmd:fileIdentifier/gco:CharacterString"/>
              </xsl:when>
              <xsl:when test="$extra_metadata_uuid">
                  <xsl:attribute name="uuidref" select="$extra_metadata_uuid"/>
              </xsl:when>
          </xsl:choose>
          <xsl:copy-of select="*"/>
      </xsl:copy>
    </xsl:template>
    
</xsl:stylesheet>
