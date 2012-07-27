package org.fao.geonet.kernel.security.ldap;

import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

import javax.naming.NamingEnumeration;
import javax.naming.NamingException;
import javax.naming.directory.Attribute;

import jeeves.resources.dbms.Dbms;
import jeeves.utils.Log;
import jeeves.utils.PasswordUtil;

import org.fao.geonet.constants.Geonet.Profile;
import org.fao.geonet.kernel.search.spatial.Pair;
import org.fao.geonet.lib.Lib;
import org.fao.geonet.services.user.Update;
import org.jdom.Element;

public class LDAPUtils {
	/**
	 * Save or update an LDAP user to the local GeoNetwork database.
	 * 
	 * TODO : Shouldn't we flag LDAP (or shib) user ? with an LDAP user id column ?
	 * trunk is adding "(LDAP)" in surname (but surname is displayed in the UI) so
	 * it's maybe not the best option.
	 * 
	 * TODO : test when a duplicate username is in the local DB and from an LDAP
	 * Unique key constraint should return errors.
	 * 
	 * @param user
	 * @param dbms
	 * @throws Exception 
	 */
	static void saveUser(LDAPUser user, Dbms dbms, boolean createNonExistingLdapGroup) throws Exception {
		Element selectRequest = dbms.select("SELECT * FROM Users where username=?", user.getUsername());
		Element userXml = selectRequest.getChild("record");
		String id;
		if (Log.isDebugEnabled(Log.JEEVES)){
			Log.debug(Log.JEEVES, "LDAP user sync for " + user.getUsername() + " ...");
		}
		// FIXME : this part of the code is a bit redundant with update user code.
		if (userXml == null) {
			if (Log.isDebugEnabled(Log.JEEVES)){
				Log.debug(Log.JEEVES, "  - Create LDAP user " + user.getUsername() + " in local database.");
			}
			
			// FIXME : how to access to the serial factory ?
			// When clustering GeoNetwork proposal is committed, only a UUID will be required
			// so it will be easier.
			// id = context.getSerialFactory().getSerial(dbms, "Users") +"";
			Element nextIdRequest = dbms.select("SELECT max(id)+1 as max FROM Users");
			id = nextIdRequest.getChild("record").getChildText("max");
			
			String query = "INSERT INTO Users (id, username, password, surname, name, profile, "+
						"address, city, state, zip, country, email, organisation, kind, authtype) "+
						"VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
			dbms.execute(query, new Integer(id), user.getUsername(), "", user.getSurname(), user.getName(), 
					user.getProfile(), user.getAddress(), user.getCity(), user.getState(), user.getZip(), 
					user.getCountry(), user.getEmail(), user.getOrganisation(), user.getKind(), LDAPConstants.LDAP_FLAG);
		} else {
			// Update existing LDAP user
			
			// Retrieve user id
			Element nextIdRequest = dbms.select("SELECT id FROM Users WHERE username = ?", user.getUsername());
			id = nextIdRequest.getChild("record").getChildText("id");

			if (Log.isDebugEnabled(Log.JEEVES)){
				Log.debug(Log.JEEVES, "  - Update LDAP user " + user.getUsername() + " (" + id + ") in local database.");
			}
			
			// User update
			String query = "UPDATE Users SET username=?, password=?, surname=?, name=?, profile=?, address=?,"+
						" city=?, state=?, zip=?, country=?, email=?, organisation=?, kind=? WHERE id=?";
			dbms.execute (query, user.getUsername(), "", user.getSurname(), user.getName(), 
					user.getProfile(), user.getAddress(), user.getCity(), user.getState(), user.getZip(), 
					user.getCountry(), user.getEmail(), user.getOrganisation(), user.getKind(), new Integer(id));
			
			// Delete user groups
			dbms.execute("DELETE FROM UserGroups WHERE userId=?", new Integer(id));
		}

		// Add user groups
		if (!Profile.ADMINISTRATOR.equals(user.getProfile())) {
			dbms.execute("DELETE FROM UserGroups WHERE userId=?", new Integer(id));
			for(Pair<String, String> privilege : user.getPrivileges()) {
				// TODO : add profile info if multiple profile proposal pass the CFV
				
				// Retrieve group id
				String groupName = privilege.one();
				Element groupIdRequest = dbms.select("SELECT id FROM Groups WHERE name = ?", groupName);
				Element groupRecord = groupIdRequest.getChild("record");
				String groupId;
				
				if (groupRecord == null && createNonExistingLdapGroup) {
					if (Log.isDebugEnabled(Log.JEEVES)){
						Log.debug(Log.JEEVES, "  - Add non existing group '" + groupName + "' in local database.");
					}
					
					// If LDAP group does not exist in local database, create it
					Element nextIdRequest = dbms.select("SELECT max(id)+1 as max FROM Groups");
					groupId = nextIdRequest.getChild("record").getChildText("max");
					//groupId = context.getSerialFactory().getSerial(dbms, "Groups");
					String query = "INSERT INTO GROUPS(id, name) VALUES(?,?)";
					dbms.execute(query, new Integer(groupId), groupName);
					Lib.local.insert(dbms, "Groups", new Integer(groupId), groupName);
				} else {
					groupId = groupRecord.getChildText("id");
				}
				
				if (Log.isDebugEnabled(Log.JEEVES)){
					Log.debug(Log.JEEVES, "  - Add LDAP group " + groupName + " for user.");
				}
				
				if (groupRecord != null || createNonExistingLdapGroup) {
					Update.addGroup(dbms, id, groupId);
				}
			}
		}
		user.setId(id);
		
		dbms.commit();
	}
	
	static Map<String, ArrayList<String>> convertAttributes(
			NamingEnumeration<? extends Attribute> attributesEnumeration) {
		Map<String, ArrayList<String>> userInfo = new HashMap<String, ArrayList<String>>();
		try {
			while (attributesEnumeration.hasMore()) {
				Attribute attr = attributesEnumeration.next();
				String id = attr.getID();
				
				ArrayList<String> values = userInfo.get(id);
				if (values == null) {
					values = new ArrayList<String>();
					userInfo.put(id, values);
				}
				
				// --- loop on all attribute's values
				NamingEnumeration valueEnum;
				valueEnum = attr.getAll();
				
				while (valueEnum.hasMore()) {
					Object value = valueEnum.next();
					// Only retrieve String attribute
					if (value instanceof String) {
						values.add((String) value);
					}
				}
			}
		} catch (NamingException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		return userInfo;
	}
}
