import { AttributeValue } from "@aws-sdk/client-dynamodb";

/**
 * Base type for all DynamoDB item shapes.
 * All items in DynamoDB are key-value maps where values are AttributeValue.
 */
export interface DynamoItem {
    [key: string]: AttributeValue;
}
