package iso19139

public class Functions {
    def handlers;
    def f
    def env

    def isoText = { el ->
        def uiCode = '#'+env.lang2.toUpperCase()
        def locStrings = el.'**'.findAll{ it.name() == 'gmd:LocalisedCharacterString' && !it.text().isEmpty()}
        def ptEl = locStrings.find{it.'@locale' == uiCode}
        if (ptEl != null) return ptEl.text()
        def charString = el.'**'.findAll {it.name() == 'gco:CharacterString' && !it.text().isEmpty()}
        if (!charString.isEmpty()) return charString[0].text()
        if (!locStrings.isEmpty()) return locStrings[0].text()
        ""
    }

    def isoURL = {urlEl ->
        def charString = urlEl.'gco:CharacterString'
    }
}