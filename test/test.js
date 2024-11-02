import parseEvents from '@zsk282/sf-auditlog-parser';

async function main(query) {
    const a = await parseEvents(query);
    console.log('>>>',a);
}

main(
    "SELECT Id, CreatedDate, CreatedBy.Username, Action,Display,Section FROM SetupAuditTrail WHERE Action IN ('changedValidationActive','PermSetAssign') ORDER BY CreatedDate Desc"
)
