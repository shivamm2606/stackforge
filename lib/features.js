export const features = {
  auth: {
    name: "Authentication",
    description: "JWT + bcrypt based auth system",
    templatePath: "fullstack-auth",
    dependencies: {
      server: {
        jsonwebtoken: "^9.0.2",
        bcryptjs: "^2.4.3",
        "cookie-parser": "^1.4.7"
      },
    },
  },
};
