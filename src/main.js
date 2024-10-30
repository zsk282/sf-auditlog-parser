import jsforce from 'jsforce';

const actionsToParse = [ 'changedValidationActive'];
const metadataBasedRegex = {
    'PermSetAssign' : {
        metadataType: "PermissionSet",
        memberLabel: /(?<=Permission set\s)[^:]+(?=:)/,
        // memberApiName: "",
        userID: /(?<=UserID:\s\[)(.*?)(?=\])/
    },
    'changedValidationActive' : {
        metadataType: "ValidationRule",
        memberLabel: /(?<=flag for\s)(.*?)(?=\svalidation)/,
        // validationRuleAPIName: /UserID:\s*\[(.*?)\]/,
        // objectAPIName: /UserID:\s*\[(.*?)\]/,
        propertyName: /(?<=validation\s")[^"]+/,
        oldValue: /(?<=from\s)\d+/,
        newValue: /(?<=to\s)\d+/,
    }
};

var sfOrgConnection;
const sObjects = new Map();
const permissionSet = new Map();

async function authenticateOrg() {
    sfOrgConnection = new jsforce.Connection({
        instanceUrl: 'https://tefb2b--b2bct.sandbox.my.salesforce.com',
        accessToken: '00D7Y000000BEMp!AQEAQG8bsy4OH7yV_kjYqiRkJHNNHLMMqKa1qJVDvFPtd1q1q3OIerANjyfGyEenmtOu7OocfbCqEVqofddNBwYA5iQNtFKd'
    });
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
    const sObjectsRes = await sfOrgConnection.query('SELECT Label, QualifiedApiName FROM EntityDefinition limit 2000');
    Object.entries(sObjectsRes.records).forEach(([key, value]) => {
        sObjects.set(value.Label, {
            // label: value.Label,
            apiName: value.QualifiedApiName,
        });
    });

    const permissionSetRes = await sfOrgConnection.query('SELECT Label, Name FROM PermissionSet limit 2000');
    Object.entries(permissionSetRes.records).forEach(([key, value]) => {
        permissionSet.set(value.Label, {
            // label: value.Label,
            apiName: value.Name
        });
    });
    // const metadata = await sfOrgConnection.describeGlobal()
    // const output1 = await sfOrgConnection.metadata.read('CustomObject', 'Quote')
    // const metadata = await sfOrgConnection.tooling.describeGlobal()
    // console.log(sObjects);
    return output;
}

function eventMessageParser(eventName, eventMessage) {
    // console.log('>>>',eventName, '>>>>',eventMessage)
    const parsedObj = {};
    Object.entries(metadataBasedRegex[eventName]).forEach(([key, value]) => {
        if(key != 'metadataType'){
            // console.log('>>>',eventMessage, eventMessage.match(value))
            parsedObj[key] = eventMessage.match(value)[0];
            // console.log('>>>',eventMessage,value.exec(eventMessage))
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
    /* var filtered = data.map(async record => {
        if(actionsToParse.includes(record.Action)){
            const parsedMessage = eventMessageParser(record.Action, record.Display);
            return parsedMessage;
        }
    }); */
    return filtered; 
}

export default async function parseEvents(query) {
    await authenticateOrg();
    const data = await querySf(sfOrgConnection, query);
    const res = await parseDataByRegex(data.records);

    var filtered = res.map(async record => {
        switch (record.metadataType) {
            case "PermissionSet":
                const psVal = permissionSet.get(record.memberLabel);
                return {
                    ...record,
                    ...psVal
                }
                // break;
            case "ValidationRule":
                const sobjVal = sObjects.get(singularize(record.memberLabel));
                return {
                    ...record,
                    ...sobjVal
                }
                // break;
            default:
                break;
        }
    });

    return filtered;
}