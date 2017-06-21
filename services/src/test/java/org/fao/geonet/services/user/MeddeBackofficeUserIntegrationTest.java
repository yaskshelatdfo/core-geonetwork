package org.fao.geonet.services.user;

import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import java.util.Arrays;

import org.fao.geonet.constants.Params;
import org.fao.geonet.domain.User;
import org.fao.geonet.repository.UserRepository;
import org.fao.geonet.services.AbstractServiceIntegrationTest;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.junit4.SpringJUnit4ClassRunner;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.context.WebApplicationContext;

/**
 * Specific testsuite (integration tests) for the MEDDE custom webservices
 * used by their backoffice. 4 endpoints have been added to the regular GeoNetwork codebase:
 * 
 * <ul>
 *   <li>geoide.backoffice.user.remove, @see {@link org.fao.geonet.services.user.Remove}</li>
 *   <li>geoide.backoffice.user.update, @see {@link org.fao.geonet.services.user.Update}</li>
 *   <li>geoide.backoffice.user.create, @see {@link org.fao.geonet.services.user.Update}</li>
 *   <li>geoide.backoffice.users.list, @see {@link org.fao.geonet/services.user.List}</li>
 * </ul>
 * 
 * @author pmauduit
 *
 */
@RunWith(SpringJUnit4ClassRunner.class)
public class MeddeBackofficeUserIntegrationTest extends AbstractServiceIntegrationTest {

    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepo;

    private static final String USERTESTNAME = "backofficetests";
    private static final String USERTESTEMAIL = "medde_geoide@aaaa.com";

    @Before
    public void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup((WebApplicationContext) _applicationContext).build();
    }

    @Test
    public void testGeoIdeBackOfficeUsersList() throws Exception {
        MockHttpSession admSession = loginAsAdmin();

        // Note: this will be prefixed by the node name (usually /srv)
        ResultActions rs = mockMvc.perform(MockMvcRequestBuilders.get("/eng/geoide.backoffice.users.list")
                .session(admSession));
        MvcResult result = rs.andReturn();
        String output = result.getResponse().getContentAsString();

        assertTrue("Unexpected result: output should contain <name>admin</name>",
                output.contains("<name>admin</name>"));
    }
    
    @Test
    public void testGeoIdeBackOfficeUserCreate() throws Exception {
        MockHttpSession admSession = loginAsAdmin();
        String content = String.format("<request>"
                + "<operation>%s</operation>"
                + "<username>%s</username>"
                + "<password>yyy</password>"
                + "<profile>RegisteredUser</profile>"
                + "<name>aaaa</name>"
                + "<groups_RegisteredUser>ggggg</groups_RegisteredUser>"
                + "</request>", Params.Operation.NEWUSER, USERTESTNAME);
        ResultActions rs = mockMvc.perform(MockMvcRequestBuilders.post("/eng/geoide.backoffice.user.create")
                .session(admSession)
                .accept(MediaType.APPLICATION_XML)
                .content(content));
        MvcResult result = rs.andReturn();
        String output = result.getResponse().getContentAsString();

        assertTrue("Unexpected response, '<response><operation>added</operation></response>' expected in the output",
                output.contains("<response><operation>added</operation></response>"));
    }

    @Test
    public void testGeoIdeBackOfficeUserUpdate() throws Exception {
        MockHttpSession admSession = loginAsAdmin();
        insertTestUser(admSession);
        User testuser = userRepo.findOneByEmail(USERTESTEMAIL);
        String content = String.format("<request>"
                + "<id>%d</id>"
                + "<username>%s</username>"
                + "<operation>%s</operation>"
                + "<surname>%s</surname>"
                + "<name>%s</name>"
                + "<email>%s</email>"
                + "<enabled>%s</enabled>"
                + "</request>", testuser.getId(),
                USERTESTNAME,  Params.Operation.EDITINFO, "backoffice_integration_test_updated",
                "medde_geoide", USERTESTEMAIL, "true");

        ResultActions rs = mockMvc.perform(MockMvcRequestBuilders.post("/eng/geoide.backoffice.user.update")
                .session(admSession)
                .accept(MediaType.APPLICATION_XML)
                .content(content));
        MvcResult result = rs.andReturn();
        String output = result.getResponse().getContentAsString();
        User testuser2 = userRepo.findOneByEmail(USERTESTEMAIL);
        assertTrue("Unexpected answer from update webservice, expected "
                + "'<response><operation>updated</operation></response>' in the output",
                output.contains("<response><operation>updated</operation></response>"));
        assertNotNull("Newly updated user not found", testuser2);
        String surname = testuser2.getSurname();
        userRepo.delete(testuser2);

        assertTrue("Unexpected user, expected 'backoffice_integration_test_updated' as surname",
                    surname != null && surname.equals("backoffice_integration_test_updated"));
    }

    @Test
    public void testGeoIdeBackOfficeUserRemove() throws Exception {
        MockHttpSession admSession = loginAsAdmin();
        insertTestUser(admSession);
        User testuser = userRepo.findOneByEmail(USERTESTEMAIL);
        String content = String.format("<request>"
                + "  <id>%d</id>"
                + "</request>", testuser.getId());

        ResultActions rs = mockMvc.perform(MockMvcRequestBuilders.post("/eng/geoide.backoffice.user.remove")
                .session(admSession)
                .accept(MediaType.APPLICATION_XML)
                .content(content));
        MvcResult result = rs.andReturn();
        String output = result.getResponse().getContentAsString();
        assertTrue("Unexpected output of user.remove service, expected '<response><operation>removed</operation></response>'",
                output.contains("<response><operation>removed</operation></response>"));
        // Makes sure the user cannot be found back after removal
        assertNull("User can be found after removal, this should not happen", userRepo.findOneByEmail(USERTESTEMAIL));
    }

    private void insertTestUser(MockHttpSession session) throws Exception {
        String content = String.format("<request>"
                + "  <operation>%s</operation>"
                + "  <username>%s</username>"
                + "  <surname>%s</surname>"
                + "  <name>%s</name>"
                + "  <password>%s</password>"
                + "  <email>%s</email>"
                + "  <enabled>%s</enabled>" // TODO: useful ? waiting for customer's feedback
                + "</request>", Params.Operation.NEWUSER , USERTESTNAME, "backoffice_integration_test", "medde_geoide", "superSecretPassword123",
                USERTESTEMAIL, "true");

        ResultActions rs = mockMvc.perform(MockMvcRequestBuilders.post("/eng/geoide.backoffice.user.create")
                .session(session)
                .accept(MediaType.APPLICATION_XML)
                .content(content));
    }
}
