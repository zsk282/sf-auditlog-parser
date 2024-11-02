import parseEvents from '@zsk282/sf-auditlog-parser';

async function auditLogParser(loginUrl, username, passwordPlusToken, query) {
    const parsedEventData  = await parseEvents(loginUrl, username, passwordPlusToken, query);
    console.log(parsedEventData );
}

auditLogParser(
    // for sandbox org use: https://test.salesforce.com
    // for production org use: https://login.salesforce.com
    "<salesforce Org URL>",
    "<salesforce Org username>",
    "<password+securitytoken>", //without "+" sign
    // samplequery: SELECT Id, CreatedDate, CreatedBy.Username, Action,Display,Section FROM SetupAuditTrail WHERE Action IN ('changedValidationActive','PermSetAssign') ORDER BY CreatedDate Desc
    "<query to get audit log>"
)