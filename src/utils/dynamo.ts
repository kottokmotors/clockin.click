import {
    DynamoDBClient,
    GetItemCommand,
    QueryCommand,
    PutItemCommand,
    UpdateItemCommand,
    UpdateItemCommandInput,
    AttributeValue
} from "@aws-sdk/client-dynamodb";
import { User } from "@/types/user";

export const client = new DynamoDBClient({ region: process.env.AWS_REGION });

export const USERS_TABLE = process.env.USERS_TABLE || "users";

// ---------- Helpers ----------
const getString = (val?: AttributeValue): string | undefined =>
    val && "S" in val ? val.S : undefined;

const getStringList = (list?: AttributeValue[]): string[] =>
    list?.map((v) => v.S).filter((v): v is string => !!v) || [];

const getUserList = (list?: AttributeValue[]): string[] =>
    list?.map((v) => v.S).filter((v): v is string => !!v) || [];

// ---------- Unmarshall ----------
export const unmarshallUser = (
    item: Record<string, AttributeValue> | undefined
): User | null => {
    if (!item) return null;

    return {
        userId: getString(item.UserId) ?? "",
        firstName: getString(item.FirstName) ?? "",
        lastName: getString(item.LastName) ?? "",
        roles: item.Roles?.L ? getStringList(item.Roles.L) : [],

        email: getString(item.Email),
        pin: getString(item.Pin),
        status: getString(item.Status),
        lastClockTransaction: getString(item.LastClockTransaction),
        learners: getUserList(item.Learners.L) ?? [],
        adminLevel: getString(item.AdminLevel),
    };
};

// ---------- Marshall ----------
export const marshallUser = (user: User): Record<string, AttributeValue> => {
    const item: Record<string, AttributeValue> = {
        UserId: { S: user.userId },
        FirstName: { S: user.firstName },
        LastName: { S: user.lastName },
        Roles: { L: user.roles.map((r) => ({ S: r })) },
    };

    if (user.email) item.Email = { S: user.email };
    if (user.pin) item.Pin = { S: user.pin };
    if (user.status) item.Status = { S: user.status };
    if (user.lastClockTransaction)
        item.LastClockTransaction = { S: user.lastClockTransaction };
    if (user.learners && user.learners.length > 0)
        item.Learners = { L: user.learners.map((l) => ({ S: l })) };
    if (user.adminLevel) {
        item.AdminLevel = { S: user.adminLevel };
    }

    return item;
};

// ---------- Marshall Update ----------
export const marshallUserUpdate = (
    userId: string,
    updates: Partial<User>
): Omit<UpdateItemCommandInput, "TableName"> => {
    const setParts: string[] = [];
    const removeParts: string[] = [];
    const attrNames: Record<string, string> = {};
    const attrValues: Record<string, AttributeValue> = {};

    const handleField = <T extends keyof User>(
        key: T,
        val: User[T] | undefined
    ) => {
        const placeholder = `#${key}`;
        attrNames[placeholder] = key as string;

        if (val === null) {
            removeParts.push(placeholder);
        } else if (val !== undefined) {
            setParts.push(`${placeholder} = :${key}`);

            // Convert to AttributeValue
            let attrVal: AttributeValue;
            switch (key) {
                case "roles":
                case "learners":
                    attrVal = { L: (val as string[]).map((v) => ({ S: v })) };
                    break;
                case "adminLevel":
                    attrVal = { S: val as string };
                    break;
                default:
                    attrVal = { S: val as string };
            }
            attrValues[`:${key}`] = attrVal;
        }
    };

    handleField("firstName", updates.firstName);
    handleField("lastName", updates.lastName);
    handleField("email", updates.email);
    handleField("pin", updates.pin);
    handleField("status", updates.status);
    handleField("lastClockTransaction", updates.lastClockTransaction);
    handleField("roles", updates.roles);
    handleField("learners", updates.learners);
    handleField("adminLevel", updates.adminLevel);

    let updateExpression = "";
    if (setParts.length) updateExpression += "SET " + setParts.join(", ");
    if (removeParts.length)
        updateExpression += (updateExpression ? " " : "") + "REMOVE " + removeParts.join(", ");

    return {
        Key: { UserId: { S: userId } },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: attrNames,
        ExpressionAttributeValues: Object.keys(attrValues).length ? attrValues : undefined,
    };
};

// ---------- Queries ----------
export const getUserById = async (userId: string) => {
    const result = await client.send(
        new GetItemCommand({
            TableName: USERS_TABLE,
            Key: { UserId: { S: userId } },
        })
    );
    return unmarshallUser(result.Item);
};

export const getUserByPin = async (pin: string) => {
    const result = await client.send(
        new QueryCommand({
            TableName: USERS_TABLE,
            IndexName: "PinIndex",
            KeyConditionExpression: "Pin = :pin",
            ExpressionAttributeValues: { ":pin": { S: pin } },
            Limit: 1,
        })
    );
    return result.Items?.length ? unmarshallUser(result.Items[0]) : null;
};

export const getUserByEmail = async (email: string) => {
    const result = await client.send(
        new QueryCommand({
            TableName: USERS_TABLE,
            IndexName: "EmailIndex",
            KeyConditionExpression: "Email = :email",
            ExpressionAttributeValues: { ":email": { S: email } },
            Limit: 1,
        })
    );
    return result.Items?.length ? unmarshallUser(result.Items[0]) : null;
};

// ---------- Mutations ----------
export const putUser = async (user: User) => {
    await client.send(
        new PutItemCommand({
            TableName: USERS_TABLE,
            Item: marshallUser(user),
        })
    );
};

export const updateUserStatus = async (userId: string, status: string) => {
    const timestamp = new Date().toISOString();
    const updateCommand = marshallUserUpdate(userId, {
        status,
        lastClockTransaction: timestamp,
    });
    await client.send(
        new UpdateItemCommand({
            TableName: USERS_TABLE,
            ...updateCommand,
        })
    );
};
