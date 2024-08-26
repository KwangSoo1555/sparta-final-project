import { DataSource } from "typeorm";
import { UsersEntity } from "./src/entities/users.entity";
import { RefreshTokensEntity } from "./src/entities/refresh-tokens.entity";
import { ReportsEntity } from "./src/entities/reports.entity";
import { NotificationMessagesEntity } from "./src/entities/notification-messages.entity";
import { NotificationLogsEntity } from "./src/entities/notification-logs.entity";
import { NoticesEntity } from "./src/entities/notices.entity";
import { JobsEntity } from "./src/entities/jobs.entity";
import { JobsMatchingEntity } from "./src/entities/jobs-matching.entity";
import { ChatRoomsEntity } from "./src/entities/chat-rooms.entity";
import { BlacklistsEntity } from "./src/entities/blacklists.entity";
import { ChatsEntity } from "./src/entities/chats.entity";
import { LocalCodesEntity } from "./src/entities/local-codes.entity";
import { UsersLocalCodesEntity } from "./src/entities/users-localcodes.entity";

export const config = new DataSource({
  type: "mysql",
  url: process.env.MYSQL_URI,
  entities: [
    UsersEntity,
    RefreshTokensEntity,
    ReportsEntity,
    NotificationLogsEntity,
    NotificationMessagesEntity,
    NoticesEntity,
    JobsEntity,
    JobsMatchingEntity,
    ChatsEntity,
    ChatRoomsEntity,
    BlacklistsEntity,
    LocalCodesEntity,
    UsersLocalCodesEntity,
  ],
  synchronize: true,
  logging: true,
});
