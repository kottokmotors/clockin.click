import {
    DynamoDBClient,
    GetItemCommand,
    QueryCommand,
    QueryCommandInput,
    QueryCommandOutput,
    PutItemCommand,
    UpdateItemCommand,
    UpdateItemCommandInput,
    AttributeValue,
    ScanCommand,
    ScanCommandOutput,
    DeleteItemCommand,
    BatchGetItemCommand
} from "@aws-sdk/client-dynamodb";
import { isGuardian, BaseUser, GuardianUser, RegularUser, User } from "@/types/user";
import { TimeAttendanceRecord, RawTimeAttendanceItem} from "@/types/attendance";

export const client = new DynamoDBClient({ region: process.env.AWS_REGION });
export const USERS_TABLE = `clockinclick-${process.env.SCHOOL_NAME}-Users` || "users";
export const TIME_ATTENDANCE_TABLE = `clockinclick-${process.env.SCHOOL_NAME}-TimeAttendance`;


// ---------- Helpers ----------
const getString = (val?: AttributeValue): string | undefined =>
    val && "S" in val ? val.S : undefined;

const getStringList = (list?: AttributeValue[]): string[] =>
    list?.map((v) => v.S).filter((v): v is string => !!v) || [];

// ---------- Unmarshall ----------
export const unmarshallUser = async (
    item: Record<string, AttributeValue>
): Promise<User> => {

    const roles = item.Roles?.L ? getStringList(item.Roles.L) : [];
    if (roles.includes("guardian")) {
        const learnerIds = item.Learners?.L ? getStringList(item.Learners.L) : [];

        const guardianRoles: [...string[], "guardian"] = [...roles.filter(r => r !== "guardian"), "guardian"];

        // Hydrate learners
        const learners: BaseUser[] = (
            await Promise.all(
                learnerIds.map(async (id) => {
                    const learner = await getUserById(id);
                    if (!learner) return null;
                    return {
                        userId: learner.userId,
                        firstName: learner.firstName,
                        lastName: learner.lastName,
                        status: learner.status,
                    } as BaseUser;
                })
            )
        ).filter(Boolean) as BaseUser[];

        const guardian: GuardianUser = {
            userId: getString(item.UserId) ?? "",
            firstName: getString(item.FirstName) ?? "",
            lastName: getString(item.LastName) ?? "",
            roles: guardianRoles,
            status: getString(item.Status),
            email: getString(item.Email),
            pin: getString(item.Pin) ?? "",
            lastClockTransaction: getString(item.LastClockTransaction),
            learners,
            adminLevel: getString(item.AdminLevel),
        };

        return guardian;
    }

    const regular: RegularUser = {
        userId: getString(item.UserId) ?? "",
        firstName: getString(item.FirstName) ?? "",
        lastName: getString(item.LastName) ?? "",
        roles,
        status: getString(item.Status),
        email: getString(item.Email),
        pin: getString(item.Pin) ?? "",
        lastClockTransaction: getString(item.LastClockTransaction),
        adminLevel: getString(item.AdminLevel),
    };

    return regular;
};

// ---------- Marshall ----------
export const marshallUser = (user: User): Record<string, AttributeValue> => {
    const item: Record<string, AttributeValue> = {
        UserId: { S: user.userId },
        FirstName: { S: user.firstName },
        LastName: { S: user.lastName },
        Roles: { L: user.roles.map((r: string) => ({ S: r })) },
    };

    if (user.email) item.Email = { S: user.email };
    if (user.pin) item.Pin = { S: user.pin };
    if (user.status) item.Status = { S: user.status };
    if (user.lastClockTransaction)
        item.LastClockTransaction = { S: user.lastClockTransaction };

    // Only add learners if this is a GuardianUser
    if (isGuardian(user) && user.learners.length > 0) {
        item.Learners = { L: user.learners.map((l: User) => ({ S: l.userId })) };
    }

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
    // map TS keys -> DynamoDB attribute names (PascalCase)
    const ATTR_MAP: Record<string, string> = {
        userId: "UserId",
        firstName: "FirstName",
        lastName: "LastName",
        email: "Email",
        pin: "Pin",
        status: "Status",
        lastClockTransaction: "LastClockTransaction",
        roles: "Roles",
        learners: "Learners",
        adminLevel: "AdminLevel",
    };

    const setParts: string[] = [];
    const removeParts: string[] = [];
    const attrNames: Record<string, string> = {};
    const attrValues: Record<string, AttributeValue> = {};

    const handleField = <T extends keyof User>(key: T, val: User[T] | undefined) => {
        if (val === undefined) return; // nothing to do for this field

        const keyStr = key as string;
        const placeholder = `#${keyStr}`; // placeholder used in expression (any stable token)
        const valuePlaceholder = `:${keyStr}`; // value placeholder
        const attrName = ATTR_MAP[keyStr] ?? keyStr; // the actual attribute name in DynamoDB

        if (val === null) {
            // remove attribute
            removeParts.push(placeholder);
            attrNames[placeholder] = attrName;
            return;
        }

        // SET clause
        setParts.push(`${placeholder} = ${valuePlaceholder}`);
        attrNames[placeholder] = attrName;

        // Build AttributeValue depending on field type
        let attrVal: AttributeValue;
        switch (keyStr) {
            case "roles": {
                const arr = (val as unknown) as string[];
                attrVal = { L: arr.map((v) => ({ S: String(v) })) };
                break;
            }
            case "learners": {
                attrVal = { L: (val as BaseUser[]).map(u => ({ S: String(u.userId) })) };
                break;
            }
            case "adminLevel": {
                const v = val as unknown;
                if (typeof v === "number") {
                    attrVal = { N: String(v) };
                } else {
                    attrVal = { S: String(v) };
                }
                break;
            }
            default: {
                // default to string
                attrVal = { S: String(val as unknown) };
                break;
            }
        }

        attrValues[valuePlaceholder] = attrVal;
    };

    handleField("firstName", updates.firstName);
    handleField("lastName", updates.lastName);
    handleField("email", updates.email);
    handleField("pin", updates.pin);
    handleField("status", updates.status);
    handleField("lastClockTransaction", updates.lastClockTransaction);
    handleField("roles", updates.roles);
    // If roles changed and includes guardian, allow learners to be set/updated
    if (updates.roles?.includes("guardian")) {
        handleField("learners", updates.learners);
    } else if (updates.learners !== undefined) {
        // If caller passed learners explicitly but didn't add guardian role, still allow it
        handleField("learners", updates.learners);
    }
    handleField("adminLevel", updates.adminLevel);

    let updateExpression = "";
    if (setParts.length) updateExpression += "SET " + setParts.join(", ");
    if (removeParts.length)
        updateExpression += (updateExpression ? " " : "") + "REMOVE " + removeParts.join(", ");

    return {
        Key: { UserId: { S: userId } },
        UpdateExpression: updateExpression,
        // Only include these maps if they have entries — avoids Dynamo errors about unused names/values
        ExpressionAttributeNames: Object.keys(attrNames).length ? attrNames : undefined,
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

    return result.Item ? await unmarshallUser(result.Item) : null;
};

export const getUserByPin = async (pin: string) => {
    console.log(USERS_TABLE)
    const result = await client.send(
        new QueryCommand({
            TableName: USERS_TABLE,
            IndexName: "PinIndex",
            KeyConditionExpression: "Pin = :pin",
            ExpressionAttributeValues: { ":pin": { S: pin } },
            Limit: 1,
        })
    );

    return result.Items && result.Items.length
        ? await unmarshallUser(result.Items[0])
        : null;
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

    return result.Items && result.Items.length
        ? await unmarshallUser(result.Items[0])
        : null;
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

export const updateUserStatus = async (
    userId: string,
    status: string
): Promise<User | null> => {
    const timestamp = new Date().toISOString();

    // Build the update expression
    const updateCommand = marshallUserUpdate(userId, {
        status,
        lastClockTransaction: timestamp,
    });

    // Run the update
    await client.send(
        new UpdateItemCommand({
            TableName: USERS_TABLE,
            ...updateCommand,
        })
    );

    // Fetch the updated user (hydrated)
    return await getUserById(userId);
};

export async function logTimeClock(
    userId: string,
    userType: string,
    status: "In" | "Out",
    clockedById: string
) {
    const now = new Date();
    const yearMonth = now.toISOString().slice(0, 7);
    const UserTypeYearMonth = `${userType}#${yearMonth}`;
    const DateTimeStamp = now.toISOString();

    const params = {
        TableName: TIME_ATTENDANCE_TABLE,
        Item: {
            UserTypeYearMonth: { S: UserTypeYearMonth },
            DateTimeStamp: { S: DateTimeStamp },
            UserId: { S: userId },
            State: { S: status },
            ClockedBy: { S: clockedById },
        },
    };

    await client.send(new PutItemCommand(params));
}

/**
 * Checks if a user with a given email has the 'administrator' role using GSI.
 * @param email - user's email
 * @returns boolean - true if admin
 */
export const isAdmin = async (email: string): Promise<boolean> => {
    try {
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

        if (!result.Items || result.Items.length === 0) return false;

        const user = await unmarshallUser(result.Items[0]);
        return user.roles.includes("administrator");
    } catch (err) {
        console.error("Error checking admin:", err);
        return false;
    }
};

/**
 * Fetch all users from the DynamoDB Users table
 */
export const getAllUsers = async (): Promise<User[]> => {
    let users: User[] = [];
    let lastEvaluatedKey: Record<string, AttributeValue> | undefined = undefined;

    do {
        const result: ScanCommandOutput = await client.send(
            new ScanCommand({
                TableName: USERS_TABLE,
                ExclusiveStartKey: lastEvaluatedKey,
            })
        );

        if (result.Items) {
            const batch = await Promise.all(result.Items.map(unmarshallUser));
            users = users.concat(batch);
        }

        lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    return users;
};

export const updateUser = async (userId: string, updates: Partial<User>): Promise<User | null> => {
    // Build the DynamoDB update command
    const updateCommand: Omit<UpdateItemCommandInput, "TableName"> = marshallUserUpdate(userId, updates);

    const command = new UpdateItemCommand({
        TableName: USERS_TABLE,
        Key: updateCommand.Key,
        UpdateExpression: updateCommand.UpdateExpression,
        ExpressionAttributeNames: updateCommand.ExpressionAttributeNames,
        ExpressionAttributeValues: updateCommand.ExpressionAttributeValues,
    });

    await client.send(command);

    // Return the updated user (hydrated)
    return await getUserById(userId);
};

export const deleteUser = async (userId: string): Promise<void> => {
    await client.send(
        new DeleteItemCommand({
            TableName: USERS_TABLE,
            Key: { UserId: { S: userId } },
        })
    );
}

/**
 * Query all pages from DynamoDB until no more results remain.
 * Returns an array of Items (raw AttributeValue maps).
 */
export const queryAllAttendance = async <RawTimeAttendanceItem>(
    params: QueryCommandInput
): Promise<RawTimeAttendanceItem[]> => {
    const items: RawTimeAttendanceItem[] = [];
    let lastEvaluatedKey: Record<string, AttributeValue> | undefined = undefined;

    do {
        const response: QueryCommandOutput = await client.send(
            new QueryCommand({
                ...params,
                ExclusiveStartKey: lastEvaluatedKey,
            })
        );

        if (response.Items) {
            items.push(...(response.Items as RawTimeAttendanceItem[]));
        }

        lastEvaluatedKey = response.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    return items;
};

/**
 * Batch get multiple users by their UserIds.
 * Automatically chunks requests into batches of 100 keys.
 */
export const batchGetUsersByIds = async (userIds: string[]): Promise<Map<string, User>> => {
    if (!userIds.length) return new Map();

    const uniqueIds = [...new Set(userIds)];
    const userMap = new Map<string, User>();
    console.log(userIds)

    const chunk = <T>(arr: T[], size: number): T[][] => {
        const res: T[][] = [];
        for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
        return res;
    };

    for (const batch of chunk(uniqueIds, 100)) {
        const params = {
            RequestItems: {
                [USERS_TABLE]: {
                    Keys: batch.map((id) => ({ UserId: { S: id } })),
                },
            },
        };
        console.log(params);

        const response = await client.send(new BatchGetItemCommand(params));
        const rawUsers = response.Responses?.[USERS_TABLE] ?? [];

        const unmarshalled = await Promise.all(rawUsers.map(unmarshallUser));
        unmarshalled.forEach((u) => userMap.set(u.userId, u));
    }
    return userMap;
};

export function unmarshallTimeAttendance(
    item: RawTimeAttendanceItem
): TimeAttendanceRecord {
    return {
        userTypeYearMonth: item.UserTypeYearMonth.S ?? "",
        dateTimeStamp: item.DateTimeStamp.S ?? "",
        userId: item.UserId.S ?? "",
        state: item.State.S ?? "",
        clockedBy: item.ClockedBy.S ?? "",
    };
}