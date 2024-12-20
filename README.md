# Salesforce Audit Log Parser

This library uses the **JSforce** library and regular expressions to parse Salesforce audit logs and generate JSON data for specific events. It extracts two types of events:
1. `PermSetAssign`: Records when a permission set is assigned to a user.
2. `changedValidationActive`: Tracks changes in the active flag for validation rules.

## Features
- Parses Salesforce audit logs for specific events.
- Extracts and formats data fields like `metadataType`, `eventMessage`, `propertyAPIName`, `objectApiName`,  `userId`, and `profileId`.
- Generates JSON output with an array of objects for each event, formatted as shown below.

## Installation
To use this library, first install it via npm:

```bash
npm install @zsk282/sf-auditlog-parser
```

## ****Note: Currently package only works with query to SetupAuditTrail Object*
```
SELECT Id, CreatedDate, CreatedBy.Username, Action,Display,Section FROM SetupAuditTrail WHERE Action IN ('changedValidationActive','PermSetAssign') ORDER BY CreatedDate Desc
```

## Sample Code:

```bash
import parseEvents from '@zsk282/sf-auditlog-parser';

async function auditLogParser(loginUrl, username, passwordPlusToken, query) {
    const parsedEventData = await parseEvents(loginUrl, username, passwordPlusToken, query);
    console.log(parsedEventData);
}

auditLogParser(
    // for sandbox org use: https://test.salesforce.com
    // for production org use: https://test.salesforce.com
    "<salesforce Org URL>",
    "<salesforce Org username>",
    "<password+securitytoken>", //without "+" sign
    // samplequery: SELECT Id, CreatedDate, CreatedBy.Username, Action,Display,Section FROM SetupAuditTrail WHERE Action IN ('changedValidationActive','PermSetAssign') ORDER BY CreatedDate Desc
    "<query to get audit log>"
)
```

### Example Output
The output is an array of JSON objects containing relevant information about each event:

#### Sample Output for PermissionSet:

```json
[
  {
    "metadataType": "PermissionSet",
    "eventMessage": "Permission set QueryAllFilesForArchival: assigned to user Barath aCM (UserID: [0059K000006pPKH])",
    "memberLabel": "QueryAllFilesForArchival",
    "userID": "0059K000006pPKH",
    "apiName": "QueryAllFilesForArchival",
    "userId": "0059K000006pPKHQA2",
    "profileId": "00e7Y000000hCsbQAE"
  }
]
```
#### Sample Output for ValidationRule:
```json
[
  {
    "propertyAPIName": "Quote.Quote_Status_cant_changed_from_Accepted",
    "metadataType": "ValidationRule",
    "eventMessage": "Changed active flag for Quotes validation \"Quote_Status_cant_changed_from_Accepted\" from 1 to 0",
    "memberLabel": "Quotes",
    "propertyName": "Quote_Status_cant_changed_from_Accepted",
    "oldValue": "1",
    "newValue": "0",
    "objectApiName": "Quote"
  }
]
```
#### Sample Output for for both PermissionSet & ValidationRule together:
The output is an array of JSON objects containing relevant information about each event:

```json
[
  {
    "metadataType": "PermissionSet",
    "eventMessage": "Permission set QueryAllFilesForArchival: assigned to user Test User (UserID: [0059K000006pPKH])",
    "memberLabel": "QueryAllFilesForArchival",
    "userID": "0059K000006pPKH",
    "apiName": "QueryAllFilesForArchival",
    "userId": "0059K000006pPKHQA2",
    "profileId": "00e7Y000000hCsbQAE"
  },
  {
    "propertyAPIName": "Quote.Quote_Status_cant_changed_from_Accepted",
    "metadataType": "ValidationRule",
    "eventMessage": "Changed active flag for Quotes validation \"Quote_Status_cant_changed_from_Accepted\" from 1 to 0",
    "memberLabel": "Quotes",
    "propertyName": "Quote_Status_cant_changed_from_Accepted",
    "oldValue": "1",
    "newValue": "0",
    "objectApiName": "Quote"
  }
]
```