import jsforce from 'jsforce';

const actionsToParse = [ 'PermSetAssign', 'changedValidationActive'];
const metadataBasedRegex = {
    'PermSetAssign' : {
        metadataType: "PermissionSet",
        memberLabel: /(?<=Permission set\s)[^:]+(?=:)/,
        userID: /(?<=UserID:\s\[)(.*?)(?=\])/
    },
    'changedValidationActive' : {
        metadataType: "ValidationRule",
        memberLabel: /(?<=flag for\s)(.*?)(?=\svalidation)/,
        propertyName: /(?<=validation\s")[^"]+/,
        oldValue: /(?<=from\s)\d+/,
        newValue: /(?<=to\s)\d+/,
    }
};

var sfOrgConnection;
const sObjects = new Map();
const permissionSet = new Map();
const usersData = new Map();

//this function (authenticateOrg) has a side effect on the global scope
//should this function be inside of a class so that you
//can encapsulate the side effects?
async function authenticateOrg(loginUrl, username, passwordPlusToken) {
    sfOrgConnection = new jsforce.Connection({
        loginUrl: loginUrl
    });
    await sfOrgConnection.login(username, passwordPlusToken);
    return;
}

function singularize(word) {
    if (word.endsWith("ses") || word.endsWith("xes") || word.endsWith("zes")) {
      return word.slice(0, -3);
    }
    if (word.endsWith("shes") || word.endsWith("ches")) {
      return word.slice(0, -4);
    }
  
    if (word.endsWith("ies")) {
      return word.slice(0, -3) + "y";
    }
    return word.slice(0, -1);
};

async function querySf(sfOrgConnection, query) {
    const output = await sfOrgConnection.query(query);
    //why are you limiting the query to 2000 records?
    //what if there are more than 2000 records? 
    //what would you do then?
    const sObjectsRes = await sfOrgConnection.query('SELECT Label, QualifiedApiName FROM EntityDefinition limit 2000');
    Object.entries(sObjectsRes.records).forEach(([key, value]) => {
        sObjects.set(value.Label, {
            objectApiName: value.QualifiedApiName,
        });
    });

    const permissionSetRes = await sfOrgConnection.query('SELECT Label, Name FROM PermissionSet limit 2000');
    Object.entries(permissionSetRes.records).forEach(([key, value]) => {
        permissionSet.set(value.Label, {
            apiName: value.Name
        });
    });

    //there could be more than 2000 users in an org
    // why doesn't this one have a limit like the other queries?
    //what's the difference?
    const usersRes = await sfOrgConnection.query('SELECT Id, ProfileId FROM User');
    Object.entries(usersRes.records).forEach(([key, value]) => {
        const baseUserID = value.Id.substring(0, 15);
        usersData.set(baseUserID, {
            userId: value.Id,
            profileId: value.ProfileId
        });
    });
    return output;
}

function eventMessageParser(eventName, eventMessage) {
    const parsedObj = {};
    Object.entries(metadataBasedRegex[eventName]).forEach(([key, value]) => {
        if(key != 'metadataType'){
            parsedObj[key] = eventMessage.match(value)[0];
        }else{
            parsedObj[key] = value;
        }
        parsedObj['eventMessage'] = eventMessage;
    });
    return parsedObj;
}

async function parseDataByRegex(data) {
    var filtered = [];
    Object.entries(data).forEach(([key, value]) => {
        if(actionsToParse.includes(value.Action)){
            filtered.push(eventMessageParser(value.Action, value.Display));
        }
    });
    return filtered; 
}

export default async function parseEvents(loginUrl, username, passwordPlusToken, query) {
   
    await authenticateOrg(loginUrl, username, passwordPlusToken);
    const data = await querySf(sfOrgConnection, query);
    const res = await parseDataByRegex(data.records);

    var filtered = res.map(record => {
        //if we were to support all 250 metadata types, this switch statement would be huge
        //how would you refactor it to be more maintainable?
        switch (record.metadataType) {
            case "PermissionSet":

                //what if this is null?
                //what if the event you are mapping refers to a permission set that has been renamed 
                // or deleted?
                const psVal = permissionSet.get(record.memberLabel);
                const userVal = usersData.get(record.userID);
                return {
                    ...record,
                    ...psVal,
                    ...userVal
                }
            case "ValidationRule":
                const sobjVal = sObjects.get(singularize(record.memberLabel));
                return {
                    propertyAPIName: `${sobjVal.objectApiName}.${record.propertyName}`,
                    ...record,
                    ...sobjVal
                }
            default:
                break;
        }
    });
    return filtered;
}