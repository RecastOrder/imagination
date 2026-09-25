/**
 * 运行环境开关（部署时通过环境变量设置，见 deploy/.env.example）。
 */
export const IS_PROD = process.env.NODE_ENV === "production"

/** 演示数据（示例成员、项目、共享…）：开发时默认有；正式服务器默认没有，除非 DEMO_DATA=1 */
export const DEMO_DATA = process.env.DEMO_DATA ? process.env.DEMO_DATA === "1" : !IS_PROD
