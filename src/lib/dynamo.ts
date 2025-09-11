import { DynamoDB } from "aws-sdk";

const options: DynamoDB.DocumentClient.DocumentClientOptions & DynamoDB.Types.ClientConfiguration = {
    region: process.env.AWS_REGION || "us-east-1",
};

// If running locally, use SSO profile
if (process.env.NODE_ENV === "development" && process.env.AWS_PROFILE) {
    options.credentials = undefined; // SDK automatically picks up the profile
    console.log(`Using local AWS profile: ${process.env.AWS_PROFILE}`);
}

export const dynamoClient = new DynamoDB.DocumentClient(options);
