<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="2.0"
	xmlns:gml="http://www.opengis.net/gml" xmlns:srv="http://www.isotc211.org/2005/srv"
	xmlns:gmx="http://www.isotc211.org/2005/gmx" xmlns:gco="http://www.isotc211.org/2005/gco"
	xmlns:gmd="http://www.isotc211.org/2005/gmd" xmlns:xlink="http://www.w3.org/1999/xlink"
	xmlns:sdn-product="http://seadatanet.org/geonetwork" xmlns:xs="http://www.w3.org/2001/XMLSchema"
	exclude-result-prefixes="#all">



	<xsl:template match="/root">
		<xsl:apply-templates select="gmd:MD_Metadata"/>
	</xsl:template>

	<xsl:template match="gmd:MD_Metadata">
		<xsl:copy>
			<xsl:apply-templates select="@*"/>
			
			<gmd:fileIdentifier>
				<gco:CharacterString>
					<xsl:value-of select="/root/env/uuid"/>
				</gco:CharacterString>
			</gmd:fileIdentifier>
			
			<xsl:apply-templates select="gmd:language"/>
			<xsl:apply-templates select="gmd:characterSet"/>
			
			<xsl:choose>
				<xsl:when test="/root/env/parentUuid!=''">
					<gmd:parentIdentifier>
						<gco:CharacterString>
							<xsl:value-of select="/root/env/parentUuid"/>
						</gco:CharacterString>
					</gmd:parentIdentifier>
				</xsl:when>
				<xsl:when test="gmd:parentIdentifier">
					<xsl:copy-of select="gmd:parentIdentifier"/>
				</xsl:when>
			</xsl:choose>
			<xsl:apply-templates select="node()[not(self::gmd:language) and not(self::gmd:characterSet)]"/>
		</xsl:copy>
	</xsl:template>


  <xsl:template match="gmd:dateStamp">
    <xsl:choose>
      <xsl:when test="/root/env/changeDate">
        <xsl:copy>
          <gco:DateTime>
            <xsl:value-of select="/root/env/changeDate"/>
          </gco:DateTime>
        </xsl:copy>
      </xsl:when>
      <xsl:otherwise>
        <xsl:copy-of select="."/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

	<!-- Remove indeterminatePosition attribute if a end position is defined. 
	If not, add indeterminate position. -->
	<xsl:template match="gml:endPosition[.='']">
		<xsl:copy>
			<xsl:attribute name="indeterminatePosition">unknown</xsl:attribute>
		</xsl:copy>
	</xsl:template>
	<xsl:template match="gml:endPosition[.!='' and @indeterminatePosition='']">
		<xsl:copy>
			<xsl:value-of select="."/>
		</xsl:copy>
	</xsl:template>

	<!-- ================================================================= -->
	<!-- Do not process MD_Metadata header generated by previous template  -->

	<xsl:template match="gmd:MD_Metadata/gmd:fileIdentifier|gmd:MD_Metadata/gmd:parentIdentifier" priority="10"/>

	<xsl:template match="gmd:MD_Metadata/gmd:identificationInfo/*/gmd:citation/*/gmd:identifier/gmd:MD_Identifier/gmd:code" priority="99">
		<xsl:copy>
			<xsl:copy-of select="@*"/>
			<gco:CharacterString>
				<xsl:value-of select="/root/gmd:MD_Metadata/gmd:fileIdentifier/gco:CharacterString/text()" />
			</gco:CharacterString>
		</xsl:copy>
	</xsl:template>


  <xsl:template match="@gml:id">
    <xsl:choose>
      <xsl:when test="normalize-space(.)=''">
        <xsl:attribute name="gml:id">
          <xsl:value-of select="generate-id(.)"/>
        </xsl:attribute>
      </xsl:when>
      <xsl:otherwise>
        <xsl:copy-of select="."/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!-- ==================================================================== -->
  <!-- Fix srsName attribute generate CRS:84 (EPSG:4326 with long/lat
       ordering) by default -->

  <xsl:template match="@srsName">
    <xsl:choose>
      <xsl:when test="normalize-space(.)=''">
        <xsl:attribute name="srsName">
          <xsl:text>CRS:84</xsl:text>
        </xsl:attribute>
      </xsl:when>
      <xsl:otherwise>
        <xsl:copy-of select="."/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!-- Add required gml attributes if missing -->
  <xsl:template match="gml:Polygon[not(@gml:id) and not(@srsName)]">
    <xsl:copy>
      <xsl:attribute name="gml:id">
        <xsl:value-of select="generate-id(.)"/>
      </xsl:attribute>
      <xsl:attribute name="srsName">
        <xsl:text>urn:x-ogc:def:crs:EPSG:6.6:4326</xsl:text>
      </xsl:attribute>
      <xsl:copy-of select="@*"/>
      <xsl:copy-of select="*"/>
    </xsl:copy>
  </xsl:template>
  <xsl:template match="*[gco:CharacterString]">
    <xsl:copy>
      <xsl:apply-templates select="@*[not(name()='gco:nilReason')]"/>
      <xsl:choose>
        <xsl:when test="normalize-space(gco:CharacterString)=''">
          <xsl:attribute name="gco:nilReason">
            <xsl:choose>
              <xsl:when test="@gco:nilReason"><xsl:value-of select="@gco:nilReason"/></xsl:when>
              <xsl:otherwise>missing</xsl:otherwise>
            </xsl:choose>
          </xsl:attribute>
        </xsl:when>
        <xsl:when test="@gco:nilReason!='missing' and normalize-space(gco:CharacterString)!=''">
          <xsl:copy-of select="@gco:nilReason"/>
        </xsl:when>
      </xsl:choose>
      <xsl:apply-templates select="node()"/>
    </xsl:copy>
  </xsl:template>

  <!-- ================================================================= -->
  <!-- codelists: set @codeList path -->
  <!-- ================================================================= -->
  <xsl:template match="gmd:LanguageCode[@codeListValue]" priority="10">
    <gmd:LanguageCode codeList="http://www.loc.gov/standards/iso639-2/">
      <xsl:apply-templates select="@*[name(.)!='codeList']"/>
    </gmd:LanguageCode>
  </xsl:template>


  <xsl:template match="gmd:*[@codeListValue]">
    <xsl:copy>
      <xsl:apply-templates select="@*"/>
      <xsl:attribute name="codeList">
        <xsl:value-of select="concat('http://standards.iso.org/ittf/PubliclyAvailableStandards/ISO_19139_Schemas/resources/Codelist/ML_gmxCodelists.xml#',local-name(.))"/>
      </xsl:attribute>
    </xsl:copy>
  </xsl:template>

  <!-- can't find the location of the 19119 codelists - so we make one up -->

  <xsl:template match="srv:*[@codeListValue]">
    <xsl:copy>
      <xsl:apply-templates select="@*"/>
      <xsl:attribute name="codeList">
        <xsl:value-of select="concat('http://www.isotc211.org/2005/iso19119/resources/Codelist/gmxCodelists.xml#',local-name(.))"/>
      </xsl:attribute>
    </xsl:copy>
  </xsl:template>


  <!-- ================================================================= -->
  <!-- Set local identifier to the first 3 letters of iso code. Locale ids
    are used for multilingual charcterString using #iso2code for referencing.
  -->
  <xsl:template match="gmd:PT_Locale">
    <xsl:element name="gmd:{local-name()}">
      <xsl:variable name="id" select="upper-case(
				substring(gmd:languageCode/gmd:LanguageCode/@codeListValue, 1, 3))"/>

      <xsl:apply-templates select="@*"/>
      <xsl:if test="normalize-space(@id)='' or normalize-space(@id)!=$id">
        <xsl:attribute name="id">
          <xsl:value-of select="$id"/>
        </xsl:attribute>
      </xsl:if>
      <xsl:apply-templates select="node()"/>
    </xsl:element>
  </xsl:template>

  <!-- Apply same changes as above to the gmd:LocalisedCharacterString -->
  <xsl:variable name="language" select="//gmd:PT_Locale" /> <!-- Need list of all locale -->
  <xsl:template  match="gmd:LocalisedCharacterString">
    <xsl:element name="gmd:{local-name()}">
      <xsl:variable name="currentLocale" select="upper-case(replace(normalize-space(@locale), '^#', ''))"/>
      <xsl:variable name="ptLocale" select="$language[@id=string($currentLocale)]"/>
      <xsl:variable name="id" select="upper-case(substring($ptLocale/gmd:languageCode/gmd:LanguageCode/@codeListValue, 1, 3))"/>
      <xsl:apply-templates select="@*"/>
      <xsl:if test="$id != '' and ($currentLocale='' or @locale!=concat('#', $id)) ">
        <xsl:attribute name="locale">
          <xsl:value-of select="concat('#',$id)"/>
        </xsl:attribute>
      </xsl:if>
      <xsl:apply-templates select="node()"/>
    </xsl:element>
  </xsl:template>


  <xsl:template name="correct_ns_prefix">
    <xsl:param name="element" />
    <xsl:param name="prefix" />
    <xsl:choose>
      <xsl:when test="local-name($element)=name($element) and $prefix != '' ">
        <xsl:element name="{$prefix}:{local-name($element)}">
          <xsl:apply-templates select="@*|node()"/>
        </xsl:element>
      </xsl:when>
      <xsl:otherwise>
        <xsl:copy>
          <xsl:apply-templates select="@*|node()"/>
        </xsl:copy>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <xsl:template match="gmd:*">
    <xsl:call-template name="correct_ns_prefix">
      <xsl:with-param name="element" select="."/>
      <xsl:with-param name="prefix" select="'gmd'"/>
    </xsl:call-template>
  </xsl:template>

  <xsl:template match="gco:*">
    <xsl:call-template name="correct_ns_prefix">
      <xsl:with-param name="element" select="."/>
      <xsl:with-param name="prefix" select="'gco'"/>
    </xsl:call-template>
  </xsl:template>

  <xsl:template match="gml:*">
    <xsl:call-template name="correct_ns_prefix">
      <xsl:with-param name="element" select="."/>
      <xsl:with-param name="prefix" select="'gml'"/>
    </xsl:call-template>
  </xsl:template>


  <xsl:template match="@*|node()">
    <xsl:copy>
      <xsl:apply-templates select="@*|node()"/>
    </xsl:copy>
  </xsl:template>
</xsl:stylesheet>
