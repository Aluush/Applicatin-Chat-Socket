db.createUser(
    {
        user: "chat_admin",
        pwd: "chat_password",
        roles: [
            {
                role: "readWrite",
                db: "chat"
            }
        ]
    }
);