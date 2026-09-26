import { CardStatus, PrismaClient } from "@prisma/client";

import { hrDiagramPng } from "./demo-figure";

const prisma = new PrismaClient();

const USERS = [{ name: "佐藤 みなみ" }, { name: "鈴木 健一" }, { name: "田中 あおい" }];

const TAGS = [
  { name: "太陽系", category: "分野" },
  { name: "恒星", category: "分野" },
  { name: "銀河・宇宙論", category: "分野" },
  { name: "観測技術", category: "分野" },
  { name: "易", category: "難易度" },
  { name: "普通", category: "難易度" },
  { name: "難", category: "難易度" },
];

type SeedCard = {
  title: string;
  status: CardStatus;
  author: string;
  assignee?: string;
  tags: string[];
  questionText?: string;
  options?: [string, string, string, string];
  correctOptionIndex?: number;
  explanation?: string;
  comments?: { author: string; content: string }[];
  /** 同じ値を持つカード同士を1つの大問（セット）にする */
  group?: string;
};

const CARDS: SeedCard[] = [
  {
    title: "HR図における主系列星の位置を問う問題",
    status: CardStatus.IDEA,
    author: "佐藤 みなみ",
    tags: ["恒星", "普通"],
  },
  {
    title: "系外惑星のトランジット法の原理",
    status: CardStatus.IDEA,
    author: "鈴木 健一",
    assignee: "田中 あおい",
    tags: ["観測技術", "普通"],
  },
  {
    title: "恒星のスペクトル型と表面温度",
    status: CardStatus.IN_PROGRESS,
    author: "田中 あおい",
    assignee: "田中 あおい",
    tags: ["恒星", "易"],
    questionText: "次のスペクトル型のうち、表面温度が最も高い恒星はどれか。",
    options: ["O型", "A型", "G型", "M型"],
    correctOptionIndex: 1,
  },
  {
    title: "年周視差から距離を求める問題",
    status: CardStatus.IN_PROGRESS,
    author: "佐藤 みなみ",
    assignee: "佐藤 みなみ",
    tags: ["観測技術", "普通"],
    questionText:
      "年周視差が 0.1 秒角と測定された恒星までの距離はおよそいくらか。",
    options: ["1 パーセク", "10 パーセク", "100 パーセク", "1000 パーセク"],
    correctOptionIndex: 2,
    comments: [
      {
        author: "鈴木 健一",
        content:
          "距離 = 1 / 年周視差（秒角）であることを解説に書いておきたいです。",
      },
    ],
  },
  {
    title: "ハッブル−ルメートルの法則",
    status: CardStatus.REVIEW,
    author: "鈴木 健一",
    assignee: "佐藤 みなみ",
    tags: ["銀河・宇宙論", "普通"],
    questionText:
      "ハッブル−ルメートルの法則が示す、遠方の銀河の後退速度と距離の関係として正しいものはどれか。",
    options: [
      "後退速度は距離に比例する",
      "後退速度は距離に反比例する",
      "後退速度は距離の2乗に比例する",
      "後退速度は距離によらず一定である",
    ],
    correctOptionIndex: 1,
    explanation:
      "後退速度 v と距離 d の間には v = H0 d の関係があり、比例係数 H0 をハッブル定数と呼ぶ。",
    comments: [
      {
        author: "田中 あおい",
        content:
          "選択肢が「比例・反比例・2乗・一定」と機械的なので、1つは観測的な誤解に基づく文にしませんか。",
      },
      {
        author: "佐藤 みなみ",
        content: "賛成です。次の更新で差し替えます。",
      },
    ],
  },
  {
    title: "地球型惑星の分類",
    status: CardStatus.REVIEW,
    author: "田中 あおい",
    assignee: "鈴木 健一",
    tags: ["太陽系", "易"],
    questionText: "次の惑星のうち、地球型惑星に分類されるものはどれか。",
    options: ["水星", "木星", "土星", "天王星"],
    correctOptionIndex: 1,
    explanation:
      "地球型惑星は水星・金星・地球・火星の4つで、岩石を主成分とし密度が大きい。",
  },
  {
    title: "連星の公転周期と軌道の大きさ",
    status: CardStatus.COMPLETED,
    author: "田中 あおい",
    assignee: "田中 あおい",
    tags: ["恒星", "難"],
    group: "連星の質量",
    questionText:
      "ケプラーの第3法則によると、連星系の公転周期の2乗は何に比例するか。",
    options: [
      "軌道長半径の3乗",
      "軌道長半径の2乗",
      "2星の質量の和の2乗",
      "軌道離心率の3乗",
    ],
    correctOptionIndex: 1,
    explanation:
      "連星系では P^2 = a^3 /(M1 + M2)（P: 年、a: 天文単位、質量: 太陽質量）が成り立つ。",
  },
  {
    title: "分光連星の視線速度から質量比を求める",
    status: CardStatus.COMPLETED,
    author: "田中 あおい",
    assignee: "鈴木 健一",
    tags: ["恒星", "難"],
    group: "連星の質量",
    questionText:
      "分光連星において、星Aと星Bの視線速度の振幅の比が 2:1 であった。星Aと星Bの質量比 mA:mB はいくらか。",
    options: ["1:2", "2:1", "1:4", "4:1"],
    correctOptionIndex: 1,
    explanation:
      "重心のまわりの運動では mA・KA = mB・KB が成り立ち、速度振幅は質量に反比例する。KA:KB = 2:1 なので mA:mB = 1:2。",
    comments: [
      {
        author: "鈴木 健一",
        content: "前問とセットなので、冊子では続けて出題されるように並べています。",
      },
    ],
  },
  {
    title: "光年の定義",
    status: CardStatus.COMPLETED,
    author: "佐藤 みなみ",
    assignee: "佐藤 みなみ",
    tags: ["観測技術", "易"],
    questionText: "1光年の説明として正しいものはどれか。",
    options: [
      "光が1年間に進む距離",
      "地球が公転軌道上を1年間に進む距離",
      "太陽から地球までの距離",
      "光が太陽から地球まで届くのにかかる時間",
    ],
    correctOptionIndex: 1,
    explanation:
      "光年は時間ではなく距離の単位で、約9.46兆キロメートル（約0.307パーセク）に相当する。",
  },
  {
    title: "Ia型超新星の発生機構",
    status: CardStatus.COMPLETED,
    author: "鈴木 健一",
    assignee: "田中 あおい",
    tags: ["恒星", "難"],
    questionText: "Ia型超新星の発生機構として正しいものはどれか。",
    options: [
      "大質量星の中心核が重力崩壊して起こる",
      "白色矮星が限界質量に近づき、暴走的な核融合を起こす",
      "中性子星同士の合体によって起こる",
      "主系列星の表面で起こる大規模なフレアによる",
    ],
    correctOptionIndex: 2,
    explanation:
      "Ia型は連星系の白色矮星が質量を獲得し、炭素の暴走的核融合で爆発する。明るさがほぼ一定のため距離指標として使われる。",
  },
];

async function main() {
  console.log("シードデータを投入します…");

  // 何度実行しても同じ状態になるよう、既存データを消してから投入する
  await prisma.cardImage.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.card.deleteMany();
  await prisma.cardGroup.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.user.deleteMany();

  const users = await Promise.all(
    USERS.map((user) => prisma.user.create({ data: user })),
  );
  const userByName = new Map(users.map((user) => [user.name, user]));

  await prisma.tag.createMany({ data: TAGS });
  const tags = await prisma.tag.findMany();
  const tagByName = new Map(tags.map((tag) => [tag.name, tag]));

  const orderByStatus = new Map<CardStatus, number>();
  const groupMembers = new Map<string, string[]>();

  for (const card of CARDS) {
    const author = userByName.get(card.author);
    if (!author) throw new Error(`作成者が見つかりません: ${card.author}`);
    const assignee = card.assignee ? userByName.get(card.assignee) : null;

    const order = orderByStatus.get(card.status) ?? 0;
    orderByStatus.set(card.status, order + 1);

    const created = await prisma.card.create({
      data: {
        title: card.title,
        status: card.status,
        order,
        questionText: card.questionText ?? null,
        option1: card.options?.[0] ?? null,
        option2: card.options?.[1] ?? null,
        option3: card.options?.[2] ?? null,
        option4: card.options?.[3] ?? null,
        correctOptionIndex: card.correctOptionIndex ?? null,
        explanation: card.explanation ?? null,
        authorId: author.id,
        assignedToId: assignee?.id ?? null,
        tags: {
          connect: card.tags
            .map((name) => tagByName.get(name))
            .filter((tag): tag is NonNullable<typeof tag> => Boolean(tag))
            .map((tag) => ({ id: tag.id })),
        },
        comments: card.comments
          ? {
              create: card.comments.map((comment) => {
                const commenter = userByName.get(comment.author);
                if (!commenter) {
                  throw new Error(
                    `コメント投稿者が見つかりません: ${comment.author}`,
                  );
                }
                return { content: comment.content, userId: commenter.id };
              }),
            }
          : undefined,
      },
    });

    if (card.group) {
      const members = groupMembers.get(card.group) ?? [];
      members.push(created.id);
      groupMembers.set(card.group, members);
    }
  }

  // 同じ group を指定したカードを1つの大問にまとめる
  for (const [, memberIds] of groupMembers) {
    if (memberIds.length < 2) continue;
    const group = await prisma.cardGroup.create({ data: {} });
    for (const [groupOrder, id] of memberIds.entries()) {
      await prisma.card.update({
        where: { id },
        data: { groupId: group.id, groupOrder },
      });
    }
  }

  // デモ用の図版を1枚添付する（実際はブラウザからアップロードする）
  const figureCard = await prisma.card.findFirst({
    where: { title: { startsWith: "HR図" } },
    select: { id: true },
  });

  if (figureCard) {
    const png = hrDiagramPng();
    await prisma.cardImage.create({
      data: {
        cardId: figureCard.id,
        data: png,
        mimeType: "image/png",
        width: 520,
        height: 380,
        size: png.length,
        caption: "HR図の模式図（横軸: 表面温度、縦軸: 光度）",
      },
    });
  }

  console.log(
    `完了: ユーザー ${users.length} 名 / タグ ${tags.length} 件 / カード ${CARDS.length} 件 / 図版 ${figureCard ? 1 : 0} 枚`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
