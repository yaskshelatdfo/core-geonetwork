package org.fao.geonet.services.harvesting;

import static org.junit.Assert.*;

import jeeves.server.context.ServiceContext;
import org.fao.geonet.domain.HarvestHistory;
import org.fao.geonet.domain.ISODate;
import org.fao.geonet.kernel.harvest.AbstractHarvesterServiceIntegrationTest;
import org.fao.geonet.kernel.harvest.harvester.csw.CswHarvesterIntegrationTest;
import org.fao.geonet.repository.HarvestHistoryRepository;
import org.fao.geonet.utils.Xml;
import org.jdom.Element;
import org.jdom.JDOMException;
import org.junit.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * Test the history DAO
 * User: Jesse
 * Date: 10/23/13
 * Time: 8:11 PM
 */
public class HistoryIntegrationTest extends AbstractHarvesterServiceIntegrationTest {
    @Autowired
    private HarvestHistoryRepository _repo;

    @Test
    public void testExecWithHistory() throws Exception {
        final ServiceContext context = createServiceContext();
        loginAsAdmin(context);
        
        final Element csw = createHarvesterParams("csw");
        CswHarvesterIntegrationTest.addCswSpecificParams(csw);
        final String id = _harvestManager.addHarvesterReturnId(csw, context.getUserSession().getUserId());
        final Element harvesterConfig = _harvestManager.get(id, context, null);
        final String harvesterName = "Name";
        final String harvesterUuid = Xml.selectString(harvesterConfig, "*//uuid");
        final HarvestHistory history = createHistory(harvesterName, harvesterUuid, new ISODate("1980-01-01T10:00:00"));
        final HarvestHistory history2 = createHistory(harvesterName, harvesterUuid, new ISODate("1980-02-01T10:00:00"));
        final HarvestHistory history3 = createHistory(harvesterName, harvesterUuid, new ISODate("1979-02-01T10:00:00"));

        final History historyService = new History();
        Element params = Xml.loadString("<request><id>"+id+"</id><uuid>"+harvesterUuid+"</uuid></request>", false);
        final Element results = historyService.exec(params, context);


        assertEquals(1, results.getChildren("harvesthistory").size());
        final List<Element> harvestHistory = results.getChild("harvesthistory").getChildren();
        assertEquals(3, harvestHistory.size());
        assertEquals(history2.getHarvestDate(), new ISODate(harvestHistory.get(0).getChildText("harvestdate")));
        assertEquals(history2.getId(), Integer.parseInt(harvestHistory.get(0).getChildText("id")));
        assertEquals(history.getHarvestDate(), new ISODate(harvestHistory.get(1).getChildText("harvestdate")));
        assertEquals(history.getId(), Integer.parseInt(harvestHistory.get(1).getChildText("id")));
        assertEquals(history3.getHarvestDate(), new ISODate(harvestHistory.get(2).getChildText("harvestdate")));
        assertEquals(history3.getId(), Integer.parseInt(harvestHistory.get(2).getChildText("id")));
    }

    @Test
    public void testExecWithoutHistory() throws Exception {
        final ServiceContext context = createServiceContext();
        loginAsAdmin(context);

        final Element csw = createHarvesterParams("csw");
        CswHarvesterIntegrationTest.addCswSpecificParams(csw);
        final String id = _harvestManager.addHarvesterReturnId(csw, context.getUserSession().getUserId());
        final Element harvesterConfig = _harvestManager.get(id, context, null);
        final String harvesterUuid = Xml.selectString(harvesterConfig, "*//uuid");

        final History historyService = new History();
        Element params = Xml.loadString("<request><id>"+id+"</id><uuid>"+harvesterUuid+"</uuid></request>", false);
        final Element results = historyService.exec(params, context);

        assertEquals(1, results.getChildren("harvesthistory").size());
        assertEquals(0, results.getChild("harvesthistory").getChildren().size());
    }

    private HarvestHistory createHistory(String harvesterName, String harvesterUuid, ISODate harvestDate) throws IOException, JDOMException {
        return _repo.save(new HarvestHistory()
                    .setDeleted(false)
                    .setElapsedTime((int) TimeUnit.SECONDS.toMillis(3))
                    .setHarvestDate(harvestDate)
                    .setHarvesterName(harvesterName)
                    .setHarvesterType("csw")
                    .setHarvesterUuid(harvesterUuid)
                    .setInfo(new Element("a").setText("b"))
                    .setParams(Xml.loadString("<param1>1</param1>", false)));
    }
}
