import { PrismaClient, Prisma } from "@prisma/client"

const prisma = new PrismaClient()

function doc(nodes: Prisma.InputJsonValue[]): Prisma.InputJsonValue {
  return { type: "doc", content: nodes }
}

function heading(level: number, text: string) {
  return { type: "heading", attrs: { level }, content: [{ type: "text", text }] }
}

function paragraph(text: string, marks: string[] = []) {
  return {
    type: "paragraph",
    content: [
      {
        type: "text",
        text,
        ...(marks.length ? { marks: marks.map((type) => ({ type })) } : {}),
      },
    ],
  }
}

function mixedParagraph(segments: { text: string; marks?: string[] }[]) {
  return {
    type: "paragraph",
    content: segments.map(({ text, marks }) => ({
      type: "text",
      text,
      ...(marks?.length ? { marks: marks.map((type) => ({ type })) } : {}),
    })),
  }
}

function bulletList(items: string[]) {
  return {
    type: "bulletList",
    content: items.map((text) => ({
      type: "listItem",
      content: [{ type: "paragraph", content: [{ type: "text", text }] }],
    })),
  }
}

async function main() {
  const [alice, bob, carol] = await Promise.all([
    prisma.user.upsert({
      where: { email: "alice@ajaia.dev" },
      update: {},
      create: { email: "alice@ajaia.dev", name: "Alice Chen" },
    }),
    prisma.user.upsert({
      where: { email: "bob@ajaia.dev" },
      update: {},
      create: { email: "bob@ajaia.dev", name: "Bob Martinez" },
    }),
    prisma.user.upsert({
      where: { email: "carol@ajaia.dev" },
      update: {},
      create: { email: "carol@ajaia.dev", name: "Carol Singh" },
    }),
  ])

  const planningDoc = await prisma.document.create({
    data: {
      title: "Q3 Planning Notes",
      ownerId: alice.id,
      content: doc([
        heading(1, "Q3 Planning Notes"),
        paragraph(
          "Owned by Alice, shared with Bob (edit) and Carol (view) so reviewers can see both permission levels in action."
        ),
        heading(2, "Goals"),
        bulletList([
          "Ship the collaborative editor MVP",
          "Get feedback from Bob and Carol",
          "Prioritize sharing and import flows",
        ]),
        mixedParagraph([
          { text: "This line uses " },
          { text: "bold", marks: ["bold"] },
          { text: " and " },
          { text: "italic", marks: ["italic"] },
          { text: " text to show formatting." },
        ]),
      ]),
    },
  })

  await prisma.documentShare.createMany({
    data: [
      { documentId: planningDoc.id, userId: bob.id, permission: "EDIT" },
      { documentId: planningDoc.id, userId: carol.id, permission: "VIEW" },
    ],
    skipDuplicates: true,
  })

  await prisma.document.create({
    data: {
      title: "Onboarding Guide",
      ownerId: alice.id,
      content: doc([
        heading(1, "Onboarding Guide"),
        paragraph("A document only Alice can see — nothing is shared here."),
        bulletList(["Set up your account", "Read the handbook", "Say hi in Slack"]),
      ]),
    },
  })

  await prisma.document.create({
    data: {
      title: "Bob's Scratchpad",
      ownerId: bob.id,
      content: doc([
        heading(1, "Bob's Scratchpad"),
        paragraph("Bob's own private notes, not shared with anyone."),
      ]),
    },
  })

  console.log("Seeded users:", { alice: alice.email, bob: bob.email, carol: carol.email })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
