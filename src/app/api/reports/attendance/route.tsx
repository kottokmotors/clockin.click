import { NextResponse } from 'next/server';
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({});

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    if (!date) return NextResponse.json([], { status: 400 });

    const startOfDay = `${date}T00:00:00`;
    const endOfDay = `${date}T23:59:59`;

    const command = new QueryCommand({
        TableName: `clockinclick-${process.env.SCHOOL_NAME}-TimeAttendance`,
        IndexName: 'DateTimeStamp-index',
        KeyConditionExpression: '#d BETWEEN :start AND :end',
        ExpressionAttributeNames: { '#d': 'DateTimeStamp' },
        ExpressionAttributeValues: {
            ':start': { S: startOfDay },
            ':end': { S: endOfDay },
        },
    });

    const result = await client.send(command);
    return NextResponse.json(
        result.Items?.map((item) => ({
            UserTypeYearMonth: item.UserTypeYearMonth.S,
            UserId: item.UserId.S,
            State: item.State.S,
            ClockedBy: item.ClockedBy.S,
            DateTimeStamp: item.DateTimeStamp.S,
        })) ?? []
    );
}
