import jsforce from 'jsforce';

const actionsToParse = ['PermSetAssign', 'changedValidationActive'];
const metadataBasedRegex = {
    'PermSetAssign' : {
        metadataType: "PermissionSet",
        memberName: /(?<=Permission set\s)[^:]+(?=:)/,
        // memberApiName: "",
        userID: /(?<=UserID:\s\[)(.*?)(?=\])/
    },
    'changedValidationActive' : {
        metadataType: "validationRules",
        memberName: /(?<=flag for\s)(.*?)(?=\svalidation)/,
        // validationRuleAPIName: /UserID:\s*\[(.*?)\]/,
        // objectAPIName: /UserID:\s*\[(.*?)\]/,
        propertyName: /(?<=validation\s")[^"]+/,
        oldValue: /(?<=from\s)\d+/,
        newValue: /(?<=to\s)\d+/,
    }
};

var sfOrgConnection;

async function authenticateOrg() {
    sfOrgConnection = new jsforce.Connection({
        instanceUrl: 'https://tefb2b--b2bct.sandbox.my.salesforce.com',
        accessToken: '00D7Y000000BEMp!AQEAQBP.0L8awsxUdNMyS9C.qigmaqU_R5QeDkE_odQjn8FS1tTBJcHxz5MNAlsjpIHYDtxKmpxVGtZG.v90rmZ0deDFkZpi'
    });
    // await sfOrgConnection.login('saurabh.kumar83@wipro.com.tefb2b.b2bct', 'NHOXkzNvMSqumBZ47cOLK7MqM');
}

async function querySf(query) {
    const output = await sfOrgConnection.query(query);
    return output;
}

async function eventMessageParser(eventName, eventMessage) {
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
    });
    console.log(parsedObj)
    return parsedObj;
}

async function formatting(data) {
    var filtered = data.map(async record => {
        if(actionsToParse.includes(record.Action)){
            const parsedMessage = await eventMessageParser(record.Action, record.Display);
            // console.log(parsedMessage)
            // const user = await sfOrgConnection.sobject("User").retrieve("0059K000006duIE");
            // console.log(user);
            return {
                eventId: record.Id,
                eventName: record.Action,
                eventMessage: record.Display,
                eevntSection: record.Section,
            };
        }
    });
    // console.log(filtered); 
}

async function main(username, password, query) {
    await authenticateOrg(username, password);
    const data = await querySf(query);
    await formatting(data.records);
}

main(
    '',
    '',
    "SELECT Id, CreatedDate, CreatedBy.Username, Action,Display,Section FROM SetupAuditTrail WHERE Action IN ('changedValidationActive','PermSetAssign') ORDER BY CreatedDate Desc"
);