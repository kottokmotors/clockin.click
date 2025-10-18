import { AttributeValue } from "@aws-sdk/client-dynamodb";

export interface RawTimeAttendanceItem {
    UserTypeYearMonth: AttributeValue;
    DateTimeStamp: AttributeValue;
    UserId: AttributeValue;
    State: AttributeValue;
    ClockedBy: AttributeValue;
}

export interface TimeAttendanceRecord {
    userTypeYearMonth: string;
    dateTimeStamp: string;
    userId: string;
    state: string;
    clockedBy: string;
}