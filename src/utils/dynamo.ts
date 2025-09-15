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
    list?.map((v) => (v.S ? v.S : "")).filter(Boolean) || [];

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
        learners: item.Learners?.L ? getStringList(item.Learners.L) : [],
        adminLevel:
            getString(item.AdminLevel) || (item.AdminLevel?.N ?? undefined),
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
        if (typeof user.adminLevel === "number") {
            item.AdminLevel = { N: user.adminLevel.toString() };
        } else {
            item.AdminLevel = { S: user.adminLevel };
        }
    }

    return item;
};

export const marshallUserUpdate = (
    userId: string,
    updates: Partial<User>
): Omit<UpdateItemCommandInput, "TableName"> => {
    const setParts: string[] = [];
    const removeParts: string[] = [];
    const attrNames: Record<string, string> = {};
    const attrValues: Record<string, AttributeValue> = {};

    const handleField = (
        key: keyof User,
        val: any,
        convert?: (v: any) => AttributeValue
    ) => {
        const placeholder = `#${key}`;
        attrNames[placeholder] = key;

        if (val === null) {
            removeParts.push(placeholder);
        } else if (val !== undefined) {
            setParts.push(`${placeholder} = :${key}`);
            attrValues[`:${key}`] = convert ? convert(val) : { S: val };
        }
    };

    handleField("firstName", updates.firstName);
    handleField("lastName", updates.lastName);
    handleField("email", updates.email);
    handleField("pin", updates.pin);
    handleField("status", updates.status);
    handleField("lastClockTransaction", updates.lastClockTransaction);
    handleField("roles", updates.roles, (v: string[]) => ({
        L: v.map((r) => ({ S: r })),
    }));
    handleField("learners", updates.learners, (v: string[]) => ({
        L: v.map((l) => ({ S: l })),
    }));
    handleField("adminLevel", updates.adminLevel, (v) =>
        typeof v === "number" ? { N: v.toString() } : { S: v }
    );

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

// Get by UserId (primary key)
export const getUserById = async (userId: string) => {
    const result = await client.send(
        new GetItemCommand({
            TableName: USERS_TABLE,
            Key: { UserId: { S: userId } },
        })
    );
    return unmarshallUser(result.Item);
};

// Get by Pin (via GSI)
export const getUserByPin = async (pin: string) => {
    const result = await client.send(
        new QueryCommand({
            TableName: USERS_TABLE,
            IndexName: "PinIndex",
            KeyConditionExpression: "Pin = :pin",
            ExpressionAttributeValues: {
                ":pin": { S: pin },
            },
            Limit: 1,
        })
    );
    return result.Items?.length ? unmarshallUser(result.Items[0]) : null;
};

// Get by Email (via GSI)
export const getUserByEmail = async (email: string) => {
    const result = await client.send(
        new QueryCommand({
            TableName: USERS_TABLE,
            IndexName: "EmailIndex",
            KeyConditionExpression: "Email = :email",
            ExpressionAttributeValues: {
                ":email": { S: email },
            },
            Limit: 1,
        })
    );
    return result.Items?.length ? unmarshallUser(result.Items[0]) : null;
};

// ---------- Mutations ----------

// Add or update a user
export const putUser = async (user: User) => {
    await client.send(
        new PutItemCommand({
            TableName: USERS_TABLE,
            Item: marshallUser(user),
        })
    );
};

// Update user status + last clock transaction
export const updateUserStatus = async (
    userId: string,
    status: string
) => {
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
