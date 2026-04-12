# Dinner Decider

一个面向家庭场景的晚餐决策应用，帮助一家人用更低的沟通成本完成“提需求 -> 定菜单 -> 用餐反馈 -> 沉淀历史偏好”这一整套流程。

项目基于 Next.js App Router 构建，使用 Prisma 管理本地 SQLite 数据库，并通过 HTTP Only Cookie 保存当前家庭会话。

## 核心功能

- 创建家庭并生成家庭码，首位创建者默认拥有厨师/管理权限
- 通过家庭码加入家庭，支持“直接加入”或“审核后加入”两种方式
- 家庭成员在 `/family` 页面快速提交今晚想吃的菜、标签偏好和备注
- 厨师在 `/chef` 工作台集中查看需求、采用推荐方案、追加菜品并发布今晚菜单
- 菜单发布后，成员可以按菜逐条提交反馈，形成后续推荐依据
- 在 `/history` 页面按时间或标签回看历史菜单、食材和反馈摘要
- 在 `/settings` 页面查看成员状态并处理待审核成员

## 典型使用流程

1. 创建家庭，系统自动初始化一组默认家常菜谱。
2. 成员通过家庭码加入家庭。
3. 晚餐前，成员在首页表达“今晚想吃什么”。
4. 厨师在工作台查看汇总需求与推荐方案，整理今晚菜单。
5. 菜单发布后，成员查看菜单并在用餐后提交反馈。
6. 历史菜单和反馈被保留，供后续决策和复盘使用。

## 技术栈

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Prisma 7
- `@libsql/client` + 本地 SQLite

## 页面说明

| 路径 | 用途 |
| --- | --- |
| `/` | 创建家庭、加入家庭、根据当前会话自动跳转 |
| `/family` | 家庭成员首页，提交今晚需求、查看菜单、填写反馈 |
| `/chef` | 厨师工作台，管理菜单、采用推荐、处理审核 |
| `/history` | 历史菜单与标签筛选 |
| `/settings` | 家庭信息、成员列表、待审核成员 |

## 项目结构

```text
app/
  actions.ts        Server Actions 入口
  page.tsx          创建/加入家庭首页
  family/page.tsx   家庭成员首页
  chef/page.tsx     厨师工作台
  history/page.tsx  历史菜单
  settings/page.tsx 家庭设置
components/
  action-forms.tsx  表单与交互组件
  ui.tsx            通用 UI 组件
lib/
  data.ts           核心业务逻辑与数据库读写
  prisma.ts         Prisma Client 与 SQLite 适配器
  session.ts        Cookie 会话读写
  constants.ts      常量、标签、默认菜谱、时区配置
prisma/
  schema.prisma     数据模型定义
scripts/
  prisma-sync.mjs   自定义数据库同步脚本
data/
  dinner-decider.sqlite 本地 SQLite 数据库文件
docs/
  figma-diner-first-redesign.md 产品/设计说明草稿
```

## 本地启动

### 1. 安装依赖

```bash
npm install
```

`postinstall` 会自动执行 `prisma generate`，生成 Prisma Client。

### 2. 初始化或同步数据库

```bash
npm run db:push
```

这个项目没有使用默认的 Prisma `db push` 流程，而是通过 `scripts/prisma-sync.mjs` 同步本地 SQLite。

如果现有数据库无法安全 diff，脚本会先把旧库备份到 `data/backups/`，再重新同步 schema。

### 3. 启动开发环境

```bash
npm run dev
```

然后访问 [http://localhost:3000](http://localhost:3000)。

## 可用脚本

```bash
npm run dev         # 启动开发服务器
npm run build       # 生产构建
npm run start       # 启动生产服务
npm run lint        # 运行 ESLint
npm run db:generate # 生成 Prisma Client
npm run db:push     # 同步 Prisma schema 到本地 SQLite
npm run db:studio   # 打开 Prisma Studio
```

## 数据与会话说明

- 数据库文件默认位于 `data/dinner-decider.sqlite`
- 会话通过 `dinner-decider-session` Cookie 保存，内容包含 `familyId` 和 `memberId`
- 创建家庭时会自动写入一批默认菜谱，方便首轮体验
- 数据库文件已在 `.gitignore` 中忽略，不建议提交到仓库

## 开发约定

- 业务规则优先放在 `lib/data.ts`
- 页面文件尽量只负责渲染和调用 Server Actions
- 表单写操作统一从 `app/actions.ts` 进入
- 日期逻辑默认使用 `Asia/Shanghai`
- 如果你需要查看设计背景，可参考 [docs/figma-diner-first-redesign.md](docs/figma-diner-first-redesign.md)

## 数据模型概览

当前 Prisma 模型主要包括：

- `Family`：家庭信息、家庭码、加入策略、默认份量
- `Member`：成员昵称、角色、是否 owner、审核状态
- `DinnerRequest`：成员当天的晚餐诉求
- `Recipe` / `RecipeIngredient` / `RecipeTag`：菜谱库
- `Menu` / `MenuItem`：当天菜单及菜单项
- `DishFeedback`：餐后逐菜反馈

## 适合继续扩展的方向

- 增加更完整的家庭权限模型
- 引入更智能的推荐策略
- 支持多餐次或一周菜单规划
- 增加测试用例与示例数据导入脚本
